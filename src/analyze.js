// Pure robots.txt analysis — no Node built-ins, no I/O, no `import.meta`.
//
// This is the runtime-agnostic core: parsing, per-bot verdicts, scoring, and
// the CI gate. It is shared by `checkRobots()` (Node fetch, in robots.js), the
// CLI, the GitHub Action, AND the Cloudflare Worker — which can import it
// directly without dragging in any `node:*` module or filesystem access.
//
// Keep this file dependency-free: if you reach for `node:`, it belongs in
// robots.js (the Node fetch layer), not here.
//
// GeoSuite runs the same analysis in Python. The two must always give the same
// verdict, so every case in test/fixtures/robots-golden.json (robots.txt in,
// per-bot verdicts, score, advisory and snippet bots out) runs in this repo's
// tests and, from a copy, in GeoSuite's: change the behavior here, change the
// fixture, and the Python side fails until it follows.

// The score formula: share of these five not blocked from `/`. It counts the
// training bots in the list too, so results stay comparable over time; what
// the advisory says follows each bot's `purpose` instead.
export const TOP_AI_BOTS = [
  'GPTBot',
  'ClaudeBot',
  'PerplexityBot',
  'OAI-SearchBot',
  'Google-Extended',
];

// A bot whose `purpose` is `training` puts pages into model weights: blocking it
// is the site's choice (proprietary data, price lists) and never an error. Every
// other bot (`search`, `user-agent`) fetches pages to cite them in AI answers,
// so blocking it costs AI visibility.
export const TRAINING_PURPOSE = 'training';

// Section markers recognized inside robots.txt comments.
// Each entry: [startRegex, endRegex, label].
const SECTION_MARKERS = [
  [
    /begin\s+cloudflare\s+managed\s+content/i,
    /end\s+cloudflare\s+managed\s+content/i,
    'cloudflare_managed_content',
  ],
];

// Path prefixes (in the wildcard group) that we treat as deliberately gated
// private surfaces. Hitting one is a *positive* signal — the site owner
// blocked them on purpose, not because they don't want AI traffic.
const PRIVATE_SURFACE_PATTERNS = [
  ['/admin', 'admin'],
  ['/wp-admin', 'admin'],
  ['/auth', 'auth'],
  ['/login', 'auth'],
  ['/signup', 'auth'],
  ['/sign-up', 'auth'],
  ['/sign-in', 'auth'],
  ['/forgot-password', 'auth'],
  ['/reset-password', 'auth'],
  ['/verify-email', 'auth'],
  ['/account', 'account'],
  ['/dashboard', 'app'],
  ['/app', 'app'],
  ['/api', 'api'],
  ['/internal', 'api'],
  ['/cart', 'checkout'],
  ['/carts', 'checkout'],
  ['/checkout', 'checkout'],
  ['/checkouts', 'checkout'],
  ['/orders', 'checkout'],
];

// Line breaks, the same set Python's `str.splitlines()` splits on, so a file
// saved with old Mac `\r` endings parses the same here and in GeoSuite.
const LINE_BREAK = /\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/;

/**
 * Percent-decode like Python's `urllib.parse.unquote`: runs of `%XX` become
 * UTF-8 (invalid bytes turn into U+FFFD) and a malformed escape stays as it is,
 * instead of throwing like `decodeURIComponent` does.
 *
 * @param {string} s
 * @returns {string}
 */
function unquote(s) {
  if (!s.includes('%')) return s;
  return s.replace(/(?:%[0-9a-fA-F]{2})+/g, (run) => {
    const bytes = new Uint8Array(run.length / 3);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(run.slice(i * 3 + 1, i * 3 + 3), 16);
    return new TextDecoder('utf-8').decode(bytes);
  });
}

/**
 * Parse a Content-Signal value: `search=yes,ai-train=no` →
 * `{ search: 'yes', 'ai-train': 'no' }`.
 *
 * @param {string} value
 * @returns {Record<string, string>}
 */
function parseContentSignal(value) {
  const out = {};
  for (const piece of value.split(',')) {
    const eq = piece.indexOf('=');
    if (eq === -1) continue;
    const key = piece.slice(0, eq).trim().toLowerCase();
    const val = piece.slice(eq + 1).trim().toLowerCase();
    if (key) out[key] = val;
  }
  return out;
}

/**
 * Parse robots.txt into a list of groups with line-level provenance.
 *
 * @param {string} raw
 * @returns {Array<Group>}
 */
export function parseRobots(raw) {
  const groups = [];
  let current = null;
  let currentSection = null;
  let lastWasDirective = false;

  const lines = raw.split(LINE_BREAK);
  for (let idx = 0; idx < lines.length; idx++) {
    const lineNumber = idx + 1;
    const rawLine = lines[idx];
    const stripped = rawLine.trim();

    // Section markers ride inside comments. Track open/close.
    if (stripped.startsWith('#')) {
      const body = stripped.replace(/^#+/, '').trim();
      if (currentSection === null) {
        for (const [start, , label] of SECTION_MARKERS) {
          if (start.test(body)) {
            currentSection = label;
            break;
          }
        }
      } else {
        for (const [, end, label] of SECTION_MARKERS) {
          if (label === currentSection && end.test(body)) {
            currentSection = null;
            break;
          }
        }
      }
      continue;
    }

    const noComment = rawLine.split('#', 1)[0].trim();
    if (!noComment || !noComment.includes(':')) continue;

    const colon = noComment.indexOf(':');
    const key = noComment.slice(0, colon).trim().toLowerCase();
    const value = noComment.slice(colon + 1).trim();

    if (key === 'user-agent') {
      if (value === '') continue;
      if (!current || lastWasDirective) {
        current = {
          userAgents: [],
          userAgentLines: [],
          directives: [],
          contentSignal: null,
          contentSignalLine: null,
          sourceLabel: currentSection,
          startLine: lineNumber,
        };
        groups.push(current);
      }
      current.userAgents.push(value);
      current.userAgentLines.push(lineNumber);
      if (currentSection && !current.sourceLabel) {
        current.sourceLabel = currentSection;
      }
      lastWasDirective = false;
    } else if (key === 'allow' || key === 'disallow') {
      if (!current) continue;
      current.directives.push({ directive: key, value, line: lineNumber });
      lastWasDirective = true;
    } else if (key === 'content-signal') {
      if (!current) continue;
      // A value with no `key=value` pair declares nothing: treat it as absent.
      const signal = parseContentSignal(value);
      current.contentSignal = Object.keys(signal).length ? signal : null;
      current.contentSignalLine = lineNumber;
    }
    // Other directives (Sitemap, Crawl-delay, Host, …) are ignored for
    // verdict purposes but should not split groups.
  }

  return groups;
}

/**
 * Robots.txt path matching with `*` (any) and `$` (end-of-line) wildcards.
 *
 * @param {string} pattern
 * @param {string} path
 * @returns {boolean}
 */
function pathMatches(pattern, path) {
  if (pattern === '') return false;
  const decodedPattern = unquote(pattern);
  const decodedPath = unquote(path);
  const endAnchored = decodedPattern.endsWith('$');
  const body = endAnchored ? decodedPattern.slice(0, -1) : decodedPattern;
  const escaped = body
    .split('*')
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  const re = new RegExp('^' + escaped + (endAnchored ? '$' : ''));
  return re.test(decodedPath);
}

/**
 * Within-group rule precedence: longest match wins, Allow on tie.
 *
 * @param {Group} group
 * @param {string} path
 * @returns {{ verdict: 'allow' | 'disallow', directive: Directive } | null}
 */
function verdictWithinGroup(group, path) {
  let best = null;
  for (const d of group.directives) {
    if (!pathMatches(d.value, path)) continue;
    const score = d.value.length;
    const priority = d.directive === 'allow' ? 1 : 0;
    const candidate = { score, priority, directive: d };
    if (
      !best ||
      candidate.score > best.score ||
      (candidate.score === best.score && candidate.priority > best.priority)
    ) {
      best = candidate;
    }
  }
  if (!best) return null;
  return { verdict: best.directive.directive, directive: best.directive };
}

/**
 * Find groups that match a bot token (specific) and groups using `*` (wildcard).
 *
 * @param {Array<Group>} groups
 * @param {string} botToken
 * @returns {{ specific: Array<Group>, wildcard: Array<Group> }}
 */
function matchingGroups(groups, botToken) {
  const tokenLc = botToken.toLowerCase();
  const specific = [];
  const wildcard = [];
  for (const g of groups) {
    const lc = g.userAgents.map((ua) => ua.toLowerCase());
    if (lc.includes(tokenLc)) specific.push(g);
    else if (lc.includes('*')) wildcard.push(g);
  }
  return { specific, wildcard };
}

function rulePayload(group, directive, botToken) {
  return {
    directive: directive.directive,
    value: directive.value,
    line: directive.line,
    userAgent: botToken,
    groupUserAgents: [...group.userAgents],
    sourceLabel: group.sourceLabel,
  };
}

/**
 * Compute the verdict for one bot, with full attribution.
 *
 * First-match semantics on group ordering: when the same UA appears in
 * multiple groups (e.g. Cloudflare's managed block + the user's own
 * block), the first group that yields a verdict wins. Mirrors what
 * strict bots and `urllib.robotparser` actually do.
 *
 * @param {Array<Group>} groups
 * @param {string} botToken
 * @returns {{
 *   verdict: 'blocked' | 'allowed' | 'not_specified',
 *   winningRule: Rule | null,
 *   conflictingRules: Array<Rule>,
 *   contentSignal: Record<string, string> | null
 * }}
 */
export function verdictForBot(groups, botToken) {
  const { specific, wildcard } = matchingGroups(groups, botToken);
  const pool = specific.length ? specific : wildcard;

  if (!pool.length) {
    return { verdict: 'not_specified', winningRule: null, conflictingRules: [], contentSignal: null };
  }

  let winningVerdict = null;
  let winningRule = null;
  let winningSignal = null;
  const conflicting = [];

  for (const g of pool) {
    const result = verdictWithinGroup(g, '/');
    if (result === null) {
      if (winningVerdict === null) {
        winningVerdict = 'allow';
        winningRule = null;
        winningSignal = g.contentSignal ? { ...g.contentSignal } : null;
      }
      continue;
    }
    if (winningVerdict === null) {
      winningVerdict = result.verdict;
      winningRule = rulePayload(g, result.directive, botToken);
      winningSignal = g.contentSignal ? { ...g.contentSignal } : null;
    } else if (result.verdict !== winningVerdict) {
      conflicting.push(rulePayload(g, result.directive, botToken));
    }
  }

  if (winningVerdict === 'disallow') {
    return { verdict: 'blocked', winningRule, conflictingRules: conflicting, contentSignal: winningSignal };
  }
  if (specific.length) {
    return { verdict: 'allowed', winningRule, conflictingRules: conflicting, contentSignal: winningSignal };
  }
  return { verdict: 'not_specified', winningRule, conflictingRules: conflicting, contentSignal: winningSignal };
}

/**
 * Disallow rules in the wildcard group that gate recognized private surfaces.
 *
 * @param {Array<Group>} groups
 * @returns {Array<{ category: string, value: string, line: number }>}
 */
export function intentionalGating(groups) {
  const seen = new Set();
  const out = [];
  for (const g of groups) {
    if (!g.userAgents.map((ua) => ua.toLowerCase()).includes('*')) continue;
    for (const d of g.directives) {
      if (d.directive !== 'disallow' || !d.value) continue;
      const normalized = d.value.replace(/\/+$/, '').toLowerCase();
      for (const [prefix, category] of PRIVATE_SURFACE_PATTERNS) {
        if (
          normalized === prefix ||
          normalized.startsWith(prefix + '/') ||
          normalized.startsWith(prefix + '*')
        ) {
          const key = `${category} ${d.value}`;
          if (seen.has(key)) break;
          seen.add(key);
          out.push({ category, value: d.value, line: d.line });
          break;
        }
      }
    }
  }
  return out;
}

/**
 * True for a bot that fetches pages to cite them in AI answers: every bot the
 * dataset does not mark as `training` (a bot with no purpose counts too, so an
 * unknown block keeps being reported instead of silently excused).
 *
 * @param {{ purpose?: string }} bot
 * @returns {boolean}
 */
export function isAnswerBot(bot) {
  return (bot && bot.purpose) !== TRAINING_PURPOSE;
}

/**
 * The robots.txt lines that let the blocked answer bots back in. Training bots
 * are never pushed back open: keeping them out costs no citations. Empty string
 * when no answer bot is blocked.
 *
 * @param {Array<BotVerdict>} blocked
 * @returns {string}
 */
export function allowlistSnippet(blocked) {
  const toAllow = blocked.filter((e) => isAnswerBot(e.bot));
  if (!toAllow.length) return '';
  const lines = ['# ai-crawler-bots: let AI answer bots read and cite you (training bots stay as you set them)'];
  for (const e of toAllow) lines.push('', `User-agent: ${e.bot.name}`, 'Allow: /');
  return lines.join('\n') + '\n';
}

/**
 * Training bots that a group naming them keeps out of some paths only (the
 * selective block that protects proprietary data). Only groups naming the bot
 * count, not `*`, and only path rules: `Disallow: /` is a site-wide block,
 * which the verdict already reports.
 *
 * @param {Array<Group>} groups
 * @param {Array<Object>} bots
 * @returns {Array<string>} bot names, in dataset order
 */
export function trainingBotsGated(groups, bots) {
  const out = [];
  for (const bot of bots) {
    if (!bot.name || bot.purpose !== TRAINING_PURPOSE) continue;
    const { specific } = matchingGroups(groups, bot.name);
    const gated = specific.some((g) =>
      g.directives.some((d) => d.directive === 'disallow' && d.value !== '' && d.value !== '/'),
    );
    if (gated) out.push(bot.name);
  }
  return out;
}

/**
 * The single next step that fits what the file does, as a stable key plus its
 * parameters (the UI owns the wording). Blocked answer bots are the problem;
 * blocked training bots alone are the site's call and get a neutral note.
 *
 * Keys, first match wins: `managed_overrides_user_intent`,
 * `managed_block_detected`, `answer_bots_blocked`, `training_bots_blocked`,
 * `training_bots_gated`, `fully_open_with_gating`, `fully_open`.
 *
 * @param {{ blocked: Array<BotVerdict>, managedBlock: Object|null, intentionalGating: Array<Object>, trainingGated: Array<string> }} args
 * @returns {{ key: string, params: Record<string, string|number> }}
 */
export function buildAdvisory({ blocked, managedBlock, intentionalGating: gating, trainingGated }) {
  if (managedBlock && managedBlock.userWouldAllow.length) {
    return {
      key: 'managed_overrides_user_intent',
      params: { section: managedBlock.section, bots: managedBlock.userWouldAllow.join(', ') },
    };
  }
  if (managedBlock) {
    return {
      key: 'managed_block_detected',
      params: { section: managedBlock.section, bots: managedBlock.blockedBotNames.join(', ') },
    };
  }
  const blockedAnswer = blocked.filter((e) => isAnswerBot(e.bot));
  if (blockedAnswer.length) {
    return {
      key: 'answer_bots_blocked',
      params: { count: blockedAnswer.length, bots: blockedAnswer.map((e) => e.bot.name).join(', ') },
    };
  }
  if (blocked.length) {
    return {
      key: 'training_bots_blocked',
      params: { count: blocked.length, bots: blocked.map((e) => e.bot.name).join(', ') },
    };
  }
  if (trainingGated.length) {
    return { key: 'training_bots_gated', params: { bots: trainingGated.join(', ') } };
  }
  if (gating.length) {
    return { key: 'fully_open_with_gating', params: { count: gating.length } };
  }
  return { key: 'fully_open', params: {} };
}

/**
 * The pure analysis half of `checkRobots`: given an already-fetched robots.txt
 * body (plus the bot list), compute the per-bot verdict object — no network, no
 * filesystem. `checkRobots()` = fetch + loadBots + analyzeRobots.
 *
 * @param {{ origin: string, robotsUrl?: string, status?: number, body?: string, bots: Array<Object>, error?: string|null }} args
 * @returns {RobotsCheckResult}
 */
export function analyzeRobots({ origin, robotsUrl = '', status = 0, body = '', bots = [], error = null }) {
  const groups = body && status && status < 400 ? parseRobots(body) : [];

  const blocked = [];
  const allowed = [];
  const notSpecified = [];

  if (status === 0 || status >= 400 || !body.trim()) {
    for (const bot of bots) {
      notSpecified.push({ bot, verdict: 'not_specified', winningRule: null, conflictingRules: [], contentSignal: null });
    }
  } else {
    for (const bot of bots) {
      const v = verdictForBot(groups, bot.name);
      const entry = { bot, ...v };
      if (v.verdict === 'blocked') blocked.push(entry);
      else if (v.verdict === 'allowed') allowed.push(entry);
      else notSpecified.push(entry);
    }
  }

  const blockedTopNames = new Set(blocked.map((e) => e.bot.name));
  const notBlockedTop = TOP_AI_BOTS.filter((n) => !blockedTopNames.has(n)).length;
  const score = Math.round((notBlockedTop / TOP_AI_BOTS.length) * 100);

  const gating = intentionalGating(groups);

  // Managed-block summary: bots whose verdict came from a labeled section,
  // and (for each) whether the user's own non-managed groups would have allowed.
  const bySection = {};
  for (const e of blocked) {
    const label = e.winningRule?.sourceLabel;
    if (!label) continue;
    (bySection[label] ||= []).push(e);
  }
  let managedBlock = null;
  const sectionNames = Object.keys(bySection);
  if (sectionNames.length) {
    sectionNames.sort((a, b) => bySection[b].length - bySection[a].length);
    const section = sectionNames[0];
    const blockedInSection = bySection[section];
    const userWouldAllow = [];
    for (const e of blockedInSection) {
      const nonManaged = groups.filter((g) => g.sourceLabel !== section);
      const v = verdictForBot(nonManaged, e.bot.name);
      if (v.verdict === 'allowed' || v.verdict === 'not_specified') {
        userWouldAllow.push(e.bot.name);
      }
    }
    managedBlock = {
      section,
      blockedBotNames: blockedInSection.map((e) => e.bot.name),
      userWouldAllow,
    };
  }

  const contentSignals = groups
    .filter((g) => g.contentSignal)
    .map((g) => ({
      userAgents: [...g.userAgents],
      signals: { ...g.contentSignal },
      line: g.contentSignalLine,
      sourceLabel: g.sourceLabel,
    }));

  const advisory = buildAdvisory({
    blocked,
    managedBlock,
    intentionalGating: gating,
    trainingGated: trainingBotsGated(groups, bots),
  });

  return {
    url: origin,
    robotsUrl,
    fetchStatus: status,
    rawRobotsTxt: body,
    blockedBots: blocked,
    allowedBots: allowed,
    notSpecifiedBots: notSpecified,
    score,
    suggestedAllowlist: allowlistSnippet(blocked),
    advisory,
    intentionalGating: gating,
    managedBlock,
    contentSignals,
    error,
  };
}

/**
 * Evaluate CI gate conditions against a `checkRobots()` / `analyzeRobots()`
 * result. Pure and network-free — shared by the CLI (`robots --fail-under …`)
 * and the GitHub Action so the two can never drift on what "pass" means.
 *
 * @param {RobotsCheckResult} result
 * @param {{ failUnder?: number|string, assertAllowed?: string|Array<string>, assertBlocked?: string|Array<string> }} [gate]
 * @returns {{ passed: boolean, failures: Array<string> }}
 */
export function evaluateGate(result, gate = {}) {
  const failures = [];

  // A site we couldn't reach can't be asserted about — that's a gate failure,
  // not a silent pass, so a broken deploy doesn't slip a green check through.
  if (result.error) {
    return { passed: false, failures: [`could not fetch robots.txt: ${result.error}`] };
  }

  const idsOf = (list) => new Set((list || []).map((e) => e.bot.id ?? e.bot.name));
  const blocked = idsOf(result.blockedBots);

  if (gate.failUnder !== undefined && gate.failUnder !== null && gate.failUnder !== '') {
    const threshold = Number(gate.failUnder);
    if (!Number.isNaN(threshold) && result.score < threshold) {
      failures.push(`AI-visibility score ${result.score} is below the required ${threshold}`);
    }
  }

  const toIds = (v) =>
    Array.isArray(v)
      ? v
      : v
        ? String(v).split(',').map((s) => s.trim()).filter(Boolean)
        : [];

  for (const id of toIds(gate.assertAllowed)) {
    // In robots.txt, "no rule" means allowed — so only an explicit block fails.
    if (blocked.has(id)) failures.push(`assert-allowed: "${id}" is blocked in robots.txt`);
  }

  for (const id of toIds(gate.assertBlocked)) {
    if (!blocked.has(id)) failures.push(`assert-blocked: "${id}" is not blocked in robots.txt`);
  }

  return { passed: failures.length === 0, failures };
}

/**
 * @typedef {Object} Directive
 * @property {'allow' | 'disallow'} directive
 * @property {string} value
 * @property {number} line
 */

/**
 * @typedef {Object} Group
 * @property {Array<string>} userAgents
 * @property {Array<number>} userAgentLines
 * @property {Array<Directive>} directives
 * @property {Record<string, string> | null} contentSignal
 * @property {number | null} contentSignalLine
 * @property {string | null} sourceLabel
 * @property {number} startLine
 */

/**
 * @typedef {Object} Rule
 * @property {'allow' | 'disallow'} directive
 * @property {string} value
 * @property {number} line
 * @property {string} userAgent
 * @property {Array<string>} groupUserAgents
 * @property {string | null} sourceLabel
 */

/**
 * @typedef {Object} BotVerdict
 * @property {Object} bot
 * @property {'blocked' | 'allowed' | 'not_specified'} verdict
 * @property {Rule | null} winningRule
 * @property {Array<Rule>} conflictingRules
 * @property {Record<string, string> | null} contentSignal
 */

/**
 * @typedef {Object} RobotsCheckResult
 * @property {string} url
 * @property {string} robotsUrl
 * @property {number} fetchStatus
 * @property {string} rawRobotsTxt
 * @property {Array<BotVerdict>} blockedBots
 * @property {Array<BotVerdict>} allowedBots
 * @property {Array<BotVerdict>} notSpecifiedBots
 * @property {number} score
 * @property {string} suggestedAllowlist robots.txt lines that re-open the blocked answer bots ('' when none)
 * @property {{ key: string, params: Record<string, string|number> }} advisory the single next step, see buildAdvisory()
 * @property {Array<{ category: string, value: string, line: number }>} intentionalGating
 * @property {{ section: string, blockedBotNames: Array<string>, userWouldAllow: Array<string> } | null} managedBlock
 * @property {Array<{ userAgents: Array<string>, signals: Record<string, string>, line: number | null, sourceLabel: string | null }>} contentSignals
 * @property {string | null} error
 */
