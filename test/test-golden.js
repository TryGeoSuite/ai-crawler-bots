// Golden cases shared with GeoSuite's Python engine (see the `about` field of
// test/fixtures/robots-golden.json). Every case feeds a robots.txt body to
// analyzeRobots() with the real bots.json and checks the per-bot verdicts, the
// score, the advisory, the snippet bots, gating, managed block and signals.
// GeoSuite runs a copy of the same file: if the two engines drift, one of the
// two test suites fails.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeRobots, loadBots, TOP_AI_BOTS } from '../src/index.js';

const golden = JSON.parse(
  readFileSync(new URL('./fixtures/robots-golden.json', import.meta.url), 'utf8'),
);

const names = (entries) => entries.map((e) => e.bot.name);

// The User-agent lines of the snippet, checking each one re-opens the root.
function snippetBots(snippet) {
  const lines = snippet.split('\n');
  const out = [];
  lines.forEach((line, i) => {
    const m = /^User-agent: (.+)$/.exec(line);
    if (!m) return;
    assert.equal(lines[i + 1], 'Allow: /', `snippet line after "${line}"`);
    out.push(m[1]);
  });
  return out;
}

test('golden: the dataset the cases were written for is bots.json', async () => {
  const bots = await loadBots({ fresh: true });
  assert.deepEqual(bots.map((b) => [b.name, b.purpose]), golden.dataset);
  assert.deepEqual(TOP_AI_BOTS, golden.top_bots);
});

for (const c of golden.cases) {
  test(`golden: ${c.name}`, async () => {
    const bots = await loadBots();
    const r = analyzeRobots({
      origin: 'https://x.test',
      robotsUrl: 'https://x.test/robots.txt',
      status: c.status,
      body: c.robots,
      bots,
      error: c.status === 0 ? 'timeout' : null,
    });
    const e = c.expected;
    const expectedNotSpecified = bots
      .map((b) => b.name)
      .filter((n) => !e.blocked.includes(n) && !e.allowed.includes(n));

    assert.deepEqual(names(r.blockedBots), e.blocked, 'blocked');
    assert.deepEqual(names(r.allowedBots), e.allowed, 'allowed');
    assert.deepEqual(names(r.notSpecifiedBots), expectedNotSpecified, 'not specified');
    assert.equal(r.score, e.score, 'score');
    assert.deepEqual(r.advisory, e.advisory, 'advisory');
    assert.deepEqual(snippetBots(r.suggestedAllowlist), e.snippet_bots, 'snippet bots');
    assert.equal(r.suggestedAllowlist === '', e.snippet_bots.length === 0, 'snippet empty iff no bot');
    assert.deepEqual(
      r.intentionalGating.map((g) => [g.category, g.value]),
      e.intentional_gating,
      'intentional gating',
    );
    assert.deepEqual(
      r.managedBlock && {
        section: r.managedBlock.section,
        blocked: r.managedBlock.blockedBotNames,
        user_would_allow: r.managedBlock.userWouldAllow,
      },
      e.managed_block,
      'managed block',
    );
    assert.deepEqual(
      r.contentSignals.map((s) => ({ user_agents: s.userAgents, signals: s.signals })),
      e.content_signals,
      'content signals',
    );
  });
}

test('golden: every advisory key reads as a full sentence in English and Italian', async () => {
  const { advisoryText, ADVISORY_MESSAGES } = await import('../src/index.js');
  const keys = new Set(golden.cases.map((c) => c.expected.advisory.key));
  for (const lang of ['en', 'it']) {
    assert.deepEqual(Object.keys(ADVISORY_MESSAGES[lang]).sort(), Object.keys(ADVISORY_MESSAGES.en).sort(), lang);
    for (const c of golden.cases) {
      const text = advisoryText(c.expected.advisory, lang);
      assert.ok(text, `${lang}: no text for ${c.expected.advisory.key}`);
      assert.doesNotMatch(text, /\{\w+\}/, `${lang}: unfilled placeholder in ${c.expected.advisory.key}`);
    }
  }
  // Every key the engine can return is covered by at least one golden case.
  assert.deepEqual([...keys].sort(), Object.keys(ADVISORY_MESSAGES.en).sort());
});
