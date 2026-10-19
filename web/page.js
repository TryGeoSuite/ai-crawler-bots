// The single-page UI served at `/`. Bilingual (en/it): the worker picks a locale
// and calls renderPage(lang); all copy lives in the S dictionary below. Tool and
// product names (AI Crawl Check, GPTBot, GeoSuite…) stay as-is: only prose is
// translated. The page has interactive client-side JS that builds result HTML,
// so its visitor-facing strings are injected per language as a JS I18N dictionary
// (var I18N) consumed by the inline <script>.
//
// It wears GeoSuite's design (theme.js, copied from geo-toolkit), like the hub at
// tools.trygeosuite.it. CSS and JS are inline; the only outside request is the
// Inter font from Google Fonts, and the engine logos come from this worker.

import { FONTS, BASE_CSS, ENGINES } from './theme.js';
import { ADVISORY_MESSAGES } from '../src/messages.js';

const BASE = 'https://ai-crawl-check.geosuite.workers.dev';
const HUB = 'https://tools.trygeosuite.it';
const REPO = 'https://github.com/TryGeoSuite/ai-crawler-bots';
const NPM = 'https://www.npmjs.com/package/@geosuite/ai-crawler-bots';
const ANALYSIS = 'https://trygeosuite.it/analisi-gratuita?utm_source=geosuite-open&utm_medium=tool&utm_campaign=ai-crawl-check';
const CMD = 'npx @geosuite/ai-crawler-bots robots &lt;url&gt;';

// Status icons, the same marks as the AI Readiness Check (geo-toolkit/check-page.js).
// The circle takes the state color from CSS; the label next to it always says it.
const ICONS = {
  ok: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9"/><path d="M6 10.5l2.6 2.6L14 7.7" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  partial: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9"/><path d="M6 10h8" fill="none" stroke-width="2" stroke-linecap="round"/></svg>',
  missing: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9"/><path d="M7 7l6 6M13 7l-6 6" fill="none" stroke-width="2" stroke-linecap="round"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
};

const S = {
  en: {
    title: 'AI Crawl Check: which AI bots can read your site?',
    desc: 'Paste a URL and see which AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) your robots.txt allows or blocks, with an AI-visibility score.',
    ogTitle: 'AI Crawl Check',
    ogDesc: 'Which AI crawlers can read your site? Paste a URL: we read its robots.txt and score it against every known AI bot.',
    tools: 'Free tools',
    eyebrow: 'A free GeoSuite tool',
    h1Tag: 'AI Crawl Check',
    h1: 'Which AI crawlers can read your site?',
    lead: `Paste a URL: we read its <code>robots.txt</code> and score it against every known AI bot, from GPTBot and ClaudeBot to PerplexityBot and Google-Extended.`,
    label: 'Your website',
    placeholder: 'yoursite.com',
    check: 'Check',
    facts: ['Free', 'No sign-up', 'Open source (MIT)'],
    hint: `No login, no tracking. We fetch only <code>/robots.txt</code>, nothing else.`,
    legendHead: 'How to read the result',
    legend: [
      ['ok', 'Allowed', 'a rule in your robots.txt names this bot and lets it in.'],
      ['partial', 'Not set', 'no rule names this bot, so your general rules decide (with no file, it can read).'],
      ['missing', 'Blocked', 'your robots.txt keeps this bot out of the site.'],
    ],
    legendScore: 'The score is the share of the five AI crawlers that matter most (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) that are not blocked. Answer bots (search, user-agent) read pages to cite them: blocking them costs AI visibility. Training bots put pages into model weights: blocking them is your choice, never an error.',
    cliHead: 'The same check, from your terminal or CI',
    cliLead: 'It is also a zero-dependency CLI on npm, and a GitHub Action that fails the build when a robots.txt change shuts an AI crawler out.',
    cliAction: 'Set up the GitHub Action',
    star: 'Star on GitHub',
    copyLabel: 'Copy the command',
    ctaTitle: 'Readable is step one. Recommended is the goal.',
    ctaText: 'Letting AI crawlers in means they can read you, not that they will suggest you. GeoSuite asks ChatGPT, Gemini and Perplexity the questions your customers really ask, and tells you where you appear, who wins instead and what to fix first. The report arrives by email.',
    ctaButton: 'Get the free analysis',
    footer: `Open source (MIT) by <a href="https://github.com/matte97p">Matteo Perino</a>. Code on <a href="${REPO}">GitHub</a>, package on <a href="${NPM}">npm</a>. A free tool from <a href="https://trygeosuite.it">GeoSuite</a>, the Italian platform for AI visibility.`,
    copy: 'Copy',
    copied: 'Copied',
    // Strings consumed by the inline client-side script (result rendering).
    js: {
      checkFailed: 'Could not check that URL: ',
      reading: 'Reading ',
      robotsSuffix: '/robots.txt …',
      networkError: 'Network error, try again.',
      scoreHeading: 'AI-visibility score',
      toneGood: 'The main AI crawlers can read your site',
      toneMid: 'Some of the main AI crawlers are kept out',
      toneLow: 'Most of the main AI crawlers are kept out',
      toneTraining: 'Only training bots are kept out: AI answers can still cite you',
      snippetHead: 'Fix snippet',
      snippetHint: 'Put it above the group that blocks these bots, or replace that group: the first group naming a bot wins. Training bots stay as you set them.',
      colBlocked: 'Blocked',
      colAllowed: 'Allowed',
      colNotSet: 'Not set',
      none: 'none',
    },
  },
  it: {
    title: 'AI Crawl Check: quali bot AI possono leggere il tuo sito?',
    desc: 'Incolla un URL e scopri quali crawler AI (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) il tuo robots.txt permette o blocca, con un punteggio di visibilità AI.',
    ogTitle: 'AI Crawl Check',
    ogDesc: 'Quali crawler AI possono leggere il tuo sito? Incolla un URL: leggiamo il suo robots.txt e lo valutiamo contro ogni bot AI noto.',
    tools: 'Strumenti gratuiti',
    eyebrow: 'Uno strumento gratuito di GeoSuite',
    h1Tag: 'AI Crawl Check',
    h1: 'Quali crawler AI possono leggere il tuo sito?',
    lead: `Incolla un URL: leggiamo il suo <code>robots.txt</code> e lo valutiamo contro ogni bot AI noto, da GPTBot e ClaudeBot a PerplexityBot e Google-Extended.`,
    label: 'Il tuo sito',
    placeholder: 'tuosito.it',
    check: 'Controlla',
    facts: ['Gratis', 'Senza registrazione', 'Open source (MIT)'],
    hint: `Niente login, niente tracciamento. Leggiamo solo <code>/robots.txt</code>, nient'altro.`,
    legendHead: 'Come leggere il risultato',
    legend: [
      ['ok', 'Permesso', 'una regola del tuo robots.txt nomina questo bot e lo fa entrare.'],
      ['partial', 'Non impostato', 'nessuna regola nomina questo bot, quindi decidono le tue regole generali (senza file, può leggere).'],
      ['missing', 'Bloccato', 'il tuo robots.txt tiene questo bot fuori dal sito.'],
    ],
    legendScore: 'Il punteggio è la quota dei cinque crawler AI che contano di più (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) che non sono bloccati. I bot di risposta (search, user-agent) leggono le pagine per citarle: bloccarli costa visibilità sulle AI. I bot di addestramento mettono le pagine nei pesi dei modelli: bloccarli è una tua scelta, mai un errore.',
    cliHead: 'Lo stesso controllo, dal terminale o dalla CI',
    cliLead: 'È anche una CLI su npm senza dipendenze, e una GitHub Action che fa fallire la build quando una modifica al robots.txt chiude fuori un crawler AI.',
    cliAction: 'Configura la GitHub Action',
    star: 'Metti una stella su GitHub',
    copyLabel: 'Copia il comando',
    ctaTitle: 'Farsi leggere è il primo passo. Farsi consigliare è l’obiettivo.',
    ctaText: 'Far entrare i crawler AI vuol dire che possono leggerti, non che ti consiglieranno. GeoSuite fa a ChatGPT, Gemini e Perplexity le domande che i tuoi clienti fanno davvero, e ti dice dove compari, chi vince al posto tuo e cosa correggere per primo. Il report arriva via mail.',
    ctaButton: 'Richiedi l’analisi gratuita',
    footer: `Open source (MIT) di <a href="https://github.com/matte97p">Matteo Perino</a>. Codice su <a href="${REPO}">GitHub</a>, pacchetto su <a href="${NPM}">npm</a>. Uno strumento gratuito di <a href="https://trygeosuite.it">GeoSuite</a>, la piattaforma italiana per la visibilità sulle AI.`,
    copy: 'Copia',
    copied: 'Copiato',
    js: {
      checkFailed: 'Impossibile controllare questo URL: ',
      reading: 'Lettura di ',
      robotsSuffix: '/robots.txt …',
      networkError: 'Errore di rete, riprova.',
      scoreHeading: 'Punteggio di visibilità AI',
      toneGood: 'I principali crawler AI possono leggere il tuo sito',
      toneMid: 'Alcuni dei principali crawler AI restano fuori',
      toneLow: 'Quasi tutti i principali crawler AI restano fuori',
      toneTraining: 'Restano fuori solo i bot di addestramento: le risposte AI possono ancora citarti',
      snippetHead: 'Snippet di correzione',
      snippetHint: 'Mettilo sopra il gruppo che blocca questi bot, o sostituisci quel gruppo: vince il primo gruppo che nomina un bot. I bot di addestramento restano come li hai impostati.',
      colBlocked: 'Bloccati',
      colAllowed: 'Permessi',
      colNotSet: 'Non impostati',
      none: 'nessuno',
    },
  },
};

// lang: 'en' | 'it'.
export function renderPage(lang) {
  const t = S[lang] || S.en;
  const ogLocale = lang === 'it' ? 'it_IT' : 'en_US';
  const facts = t.facts.map((f) => `<li>${ICONS.ok}${f}</li>`).join('');
  const legend = t.legend
    .map(([k, name, text]) => `<li class="${k}">${ICONS[k]}<span><strong>${name}</strong>: ${text}</span></li>`)
    .join('');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.title}</title>
<meta name="description" content="${t.desc}">
<link rel="canonical" href="${BASE}/${lang}">
<link rel="alternate" hreflang="en" href="${BASE}/en">
<link rel="alternate" hreflang="it" href="${BASE}/it">
<link rel="alternate" hreflang="x-default" href="${BASE}/">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GeoSuite Open">
<meta property="og:title" content="${t.ogTitle}">
<meta property="og:description" content="${t.ogDesc}">
<meta property="og:url" content="${BASE}/${lang}">
<meta property="og:image" content="${BASE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${ogLocale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t.ogTitle}">
<meta name="twitter:description" content="${t.ogDesc}">
<meta name="twitter:image" content="${BASE}/og.png">
${FONTS}
<style>
${BASE_CSS}
  code { font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:.875em; }
  .lead code, .hint code { background:var(--sunk); padding:1px 5px; border-radius:4px; }
  .hint { color:var(--ink-3); font-size:.875rem; margin:10px 0 0; }
  .tool-name { display:block; font-size:.9375rem; font-weight:600; color:var(--ink-3); letter-spacing:0; margin:0 0 6px; }

  .legend { padding:20px; }
  .legend ul { list-style:none; margin:12px 0 0; padding:0; }
  .legend li { display:grid; grid-template-columns:20px 1fr; gap:10px; padding:10px 0; border-top:1px solid var(--line); color:var(--ink-2); font-size:.9375rem; }
  .legend li:first-child { border-top:0; }
  .legend li strong { color:var(--ink); }
  .legend svg { width:20px; height:20px; margin-top:2px; }
  .legend .score-note { color:var(--ink-3); font-size:.8125rem; margin:12px 0 0; padding-top:12px; border-top:1px solid var(--line); }

  .ok svg path, .partial svg path, .missing svg path { stroke:#fff; }
  .ok svg circle { fill:var(--ok); } .partial svg circle { fill:var(--ink-3); } .missing svg circle { fill:var(--crit); }

  #out { margin-top:32px; }
  #out:empty { display:none; }
  .result { padding:24px; }
  .loading { padding:20px 24px; color:var(--ink-2); display:flex; align-items:center; gap:10px; overflow-wrap:anywhere; }
  .loading::before { content:""; width:8px; height:8px; border-radius:50%; background:var(--accent); flex:none; animation:pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity:.35; } }
  .fail { padding:16px 20px; display:flex; gap:10px; align-items:flex-start; background:var(--crit-soft); border-color:transparent; color:var(--ink); }
  .fail svg { width:20px; height:20px; flex:none; margin-top:2px; color:var(--crit); }

  .verdict { display:flex; gap:20px; align-items:center; padding:16px 20px; border-radius:8px; margin:0 0 16px; }
  .verdict.yes { background:var(--ok-soft); } .verdict.mid { background:var(--warn-soft); } .verdict.no { background:var(--crit-soft); }
  .score { font-variant-numeric:tabular-nums; font-size:2.5rem; font-weight:700; letter-spacing:-.02em; line-height:1; white-space:nowrap; }
  .score small { font-size:.875rem; font-weight:500; color:var(--ink-3); }
  .verdict.yes .score { color:var(--ok); } .verdict.mid .score { color:var(--warn); } .verdict.no .score { color:var(--crit); }
  .verdict .label { margin-bottom:4px; }
  .verdict strong { display:block; font-size:1.125rem; line-height:1.3; letter-spacing:-.01em; }
  .verdict a { display:inline-block; margin-top:4px; font-size:.875rem; overflow-wrap:anywhere; text-decoration:none; }
  .verdict a:hover { text-decoration:underline; }

  .advice { display:flex; gap:10px; align-items:flex-start; margin:0 0 16px; padding:12px 16px; border-radius:8px; color:var(--ink); font-size:.9375rem; overflow-wrap:anywhere; }
  .advice svg { width:20px; height:20px; flex:none; margin-top:1px; }
  .advice.good { background:var(--ok-soft); } .advice.info { background:var(--sunk); }
  .advice.warn { background:var(--warn-soft); } .advice.warn svg { color:var(--warn); }

  .snippet { margin:16px 0 0; }
  .snippet h3 { font-size:.75rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-3); margin:0 0 6px; }
  .snippet p { color:var(--ink-2); font-size:.875rem; margin:0 0 8px; }
  .snippet .cmd { align-items:flex-start; margin:0; }
  .snippet pre { flex:1; min-width:0; margin:0; padding:8px 0; overflow-x:auto; color:var(--ink-2); font-size:.875rem; }
  .snippet pre code { white-space:pre; padding:0; overflow:visible; }

  .cols { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:16px; }
  .col h3 { display:flex; align-items:center; gap:8px; font-size:.75rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-3); margin:0 0 8px; }
  .col h3 svg { width:16px; height:16px; }
  .col ul { list-style:none; margin:0; padding:0; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  .bot { display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 8px; padding:8px 12px; border-top:1px solid var(--line); font-size:.9375rem; font-weight:500; }
  .bot:first-child { border-top:0; }
  .bot small { color:var(--ink-3); font-weight:400; font-size:.8125rem; }
  .bot.none { color:var(--ink-3); font-weight:400; }


  .cli { margin-top:32px; padding:24px; }
  .cli h2 { font-size:1.25rem; line-height:1.25; letter-spacing:-.015em; margin:0 0 6px; }
  .cli > p { color:var(--ink-2); margin:0 0 16px; max-width:64ch; }
  .cmd { display:flex; align-items:center; gap:8px; padding:4px 4px 4px 12px; background:var(--surface-2); border:1px solid var(--line); border-radius:8px; margin:0 0 16px; }
  .cmd code { flex:1; min-width:0; overflow-x:auto; white-space:nowrap; color:var(--ink-2); font-size:.875rem; padding:8px 0; }
  .cmd button { flex:none; min-height:36px; padding:4px 12px; font-size:.8125rem; }
  .links { display:flex; gap:8px 16px; flex-wrap:wrap; align-items:center; }
  .links a { text-decoration:none; display:inline-flex; align-items:center; min-height:36px; }
  .links a.open { font-weight:600; font-size:.9375rem; }
  .links a.open:hover { text-decoration:underline; }

  .cta { margin-top:32px; }
  @media (max-width:640px) {
    .cols { grid-template-columns:minmax(0, 1fr); }
    .result, .cli { padding:18px; }
    .verdict { gap:14px; padding:14px 16px; }
    .score { font-size:2rem; }
  }
  @media (prefers-reduced-motion: reduce) { .loading::before { animation:none; } }
</style>
</head>
<body>
<div class="wrap">
  <header class="bar">
    <a class="brand" href="https://trygeosuite.it">GeoSuite</a>
    <nav aria-label="Language">
      <a href="${HUB}/${lang}">${t.tools}</a>
      <a href="/en"${lang === 'en' ? ' aria-current="page"' : ''} hreflang="en">EN</a>
      <a href="/it"${lang === 'it' ? ' aria-current="page"' : ''} hreflang="it">IT</a>
    </nav>
  </header>

  <main>
    <div class="hero">
      <div>
        <p class="eyebrow">${t.eyebrow}</p>
        <h1><span class="tool-name">${t.h1Tag}</span>${t.h1}</h1>
        <p class="lead">${t.lead}</p>
        <form id="f" class="urlform">
          <label for="u">${t.label}</label>
          <input id="u" name="url" type="text" inputmode="url" autocomplete="url" spellcheck="false" placeholder="${t.placeholder}" required>
          <button id="go" class="primary" type="submit">${t.check}</button>
        </form>
        <ul class="facts">${facts}</ul>
        <p class="hint">${t.hint}</p>
      </div>
      <aside class="panel legend" aria-labelledby="legend-head">
        <h2 class="label" id="legend-head">${t.legendHead}</h2>
        <ul>${legend}</ul>
        <p class="score-note">${t.legendScore}</p>
      </aside>
    </div>

    <div id="out" aria-live="polite"></div>

    <section class="panel cli" aria-labelledby="cli-head">
      <h2 id="cli-head">${t.cliHead}</h2>
      <p>${t.cliLead}</p>
      <div class="cmd"><code>${CMD}</code></div>
      <div class="links">
        <a class="open" href="${REPO}#use-in-ci-github-action" target="_blank" rel="noopener">${t.cliAction} →</a>
        <a class="ghost" href="${REPO}" target="_blank" rel="noopener">${t.star}</a>
      </div>
    </section>

    <section class="panel cta">
      <div>
        <h2>${t.ctaTitle}</h2>
        <p>${t.ctaText}</p>
        ${ENGINES}
      </div>
      <a class="primary" href="${ANALYSIS}" target="_blank" rel="noopener">${t.ctaButton}</a>
    </section>
  </main>

  <footer>${t.footer}</footer>
</div>

<script>var I18N = ${JSON.stringify(t.js)}; var ADVICE = ${JSON.stringify(ADVISORY_MESSAGES[lang] || ADVISORY_MESSAGES.en)}; var ICONS = ${JSON.stringify(ICONS)}; var COPY = ${JSON.stringify({ copy: t.copy, copied: t.copied, label: t.copyLabel })};</script>
<script>
  var out = document.getElementById('out');
  var input = document.getElementById('u');
  var btn = document.getElementById('go');

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  // Same bands as GeoSuite: a block of training bots alone never reads as a
  // failure, because AI answers can still cite the site.
  function trainingOnly(r){
    return r.blocked.length > 0 && r.blocked.every(function(b){ return b.purpose === 'training'; });
  }
  function tone(r){ return r.score >= 80 ? 'yes' : (r.score >= 50 || trainingOnly(r)) ? 'mid' : 'no'; }
  function toneText(r){
    if (trainingOnly(r)) return I18N.toneTraining;
    return r.score >= 80 ? I18N.toneGood : r.score >= 50 ? I18N.toneMid : I18N.toneLow;
  }

  var ADVICE_TONE = { fully_open: 'good', fully_open_with_gating: 'good', training_bots_gated: 'good',
    answer_bots_blocked: 'warn', managed_overrides_user_intent: 'warn' };
  var ADVICE_ICON = { good: ['ok', ICONS.ok], warn: ['', ICONS.warn], info: ['partial', ICONS.partial] };
  function advice(a){
    var text = a && ADVICE[a.key];
    if (!text) return '';
    var params = a.params || {};
    text = text.replace(/\\{(\\w+)\\}/g, function(m, k){ return k in params ? String(params[k]) : m; });
    var t = ADVICE_TONE[a.key] || 'info';
    return '<div class="advice ' + t + ' ' + ADVICE_ICON[t][0] + '">' + ADVICE_ICON[t][1] + '<span>' + esc(text) + '</span></div>';
  }

  function addCopy(box, text){
    if (!navigator.clipboard) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ghost'; b.textContent = COPY.copy; b.setAttribute('aria-label', COPY.label);
    b.addEventListener('click', function () {
      navigator.clipboard.writeText(text).then(function () {
        b.textContent = COPY.copied;
        setTimeout(function () { b.textContent = COPY.copy; }, 1200);
      }).catch(function () {});
    });
    box.appendChild(b);
  }

  function botRow(b){
    return '<li class="bot">' + esc(b.name) +
      '<small>' + esc(b.owner) + ' · ' + esc(b.purpose) + '</small></li>';
  }

  function column(title, list, kind){
    var rows = list.length ? list.map(botRow).join('')
      : '<li class="bot none">' + I18N.none + '</li>';
    return '<div class="col ' + kind + '"><h3>' + ICONS[kind] + title + ' (' + list.length + ')</h3><ul>' + rows + '</ul></div>';
  }

  function fail(msg){
    out.innerHTML = '<div class="panel fail">' + ICONS.warn + '<span>' + msg + '</span></div>';
  }

  function render(r){
    if (r.error && !r.score && r.score !== 0){
      fail(I18N.checkFailed + esc(r.error));
      return;
    }
    var snippet = r.suggestedAllowlist ? '<div class="snippet"><h3>' + I18N.snippetHead + '</h3>' +
      '<p>' + I18N.snippetHint + '</p><div class="cmd"><pre><code>' + esc(r.suggestedAllowlist) + '</code></pre></div></div>' : '';
    out.innerHTML =
      '<section class="panel result" aria-labelledby="score-head">' +
        '<div class="verdict ' + tone(r) + '">' +
          '<div class="score">' + r.score + '<small>/100</small></div>' +
          '<div>' +
            '<p class="label" id="score-head">' + I18N.scoreHeading + '</p>' +
            '<strong>' + toneText(r) + '</strong>' +
            '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.url) + '</a>' +
          '</div>' +
        '</div>' +
        advice(r.advisory) +
        '<div class="cols">' +
          column(I18N.colBlocked, r.blocked, 'missing') +
          column(I18N.colAllowed, r.allowed, 'ok') +
          column(I18N.colNotSet, r.notSpecified, 'partial') +
        '</div>' +
        snippet +
      '</section>';
    var box = out.querySelector('.snippet .cmd');
    if (box) addCopy(box, r.suggestedAllowlist);
  }

  function run(url){
    if (!url) return;
    btn.disabled = true;
    out.innerHTML = '<div class="panel loading">' + I18N.reading + esc(url) + I18N.robotsSuffix + '</div>';
    fetch('/api/check?url=' + encodeURIComponent(url))
      .then(function(res){ return res.json(); })
      .then(function(r){ render(r); })
      .catch(function(){ fail(I18N.networkError); })
      .finally(function(){ btn.disabled = false; });
  }

  document.getElementById('f').addEventListener('submit', function(e){
    e.preventDefault();
    var url = input.value.trim();
    if (url){ history.replaceState(null, '', '?url=' + encodeURIComponent(url)); run(url); }
  });

  // Auto-run from a shared ?url= link.
  var shared = new URLSearchParams(location.search).get('url');
  if (shared){ input.value = shared; run(shared); }

  // A copy button on each command box, when the browser allows it.
  document.querySelectorAll('.cmd').forEach(function (box) {
    addCopy(box, box.querySelector('code').textContent.trim());
  });
</script>
</body>
</html>`;
}
