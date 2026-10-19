// What each advisory key means for a site owner, in English and Italian.
//
// The engine (./analyze.js) only returns a key plus parameters; the CLI and the
// hosted checker (web/page.js) turn it into words from here, so the two never
// say different things. GeoSuite renders the same keys with its own copy, and
// the meaning has to stay the same: blocked answer bots cost citations, blocked
// training bots are the site's choice. Plain text, no markup: a caller that
// renders HTML escapes the result.
//
// Dependency-free like analyze.js, so the Worker can import it.

export const ADVISORY_MESSAGES = {
  en: {
    answer_bots_blocked:
      'AI answer bots blocked: {bots}. They read pages to cite them in AI answers, so today they cannot cite you. Let them back in with the snippet below.',
    training_bots_blocked:
      'Only AI training bots are blocked ({bots}): AI answers can still read and cite you. On proprietary data that is the right call; site-wide, future models will know your brand less. robots.txt is only a request, so keep raw data off public pages.',
    training_bots_gated:
      'Good setup: AI answer bots can read every public page, while training bots ({bots}) stay out of some paths. That protects proprietary data at no cost in citations.',
    managed_overrides_user_intent:
      'A managed section ({section}) blocks {bots}. Your own rules would let them in, but the managed section comes first and wins: turn that rule off in your CDN dashboard (on Cloudflare, AI Crawl Control).',
    managed_block_detected:
      '{bots} are blocked by a managed section ({section}). Check in your CDN dashboard that you want to keep it.',
    fully_open_with_gating:
      'Every AI bot can read your site, and {count} private areas (admin, login, cart and similar) stay closed: that is correct.',
    fully_open: 'Every AI bot can read your site.',
  },
  it: {
    answer_bots_blocked:
      'Bot AI di risposta bloccati: {bots}. Leggono le pagine per citarle nelle risposte AI, quindi oggi non possono citarti. Falli rientrare con lo snippet qui sotto.',
    training_bots_blocked:
      'Sono bloccati solo bot di addestramento AI ({bots}): le risposte AI possono ancora leggerti e citarti. Sui dati proprietari è la scelta giusta; su tutto il sito, i modelli futuri conosceranno meno il tuo brand. Il robots.txt è solo una richiesta: tieni i dati grezzi fuori dalle pagine pubbliche.',
    training_bots_gated:
      'Buona impostazione: i bot AI di risposta leggono ogni pagina pubblica, mentre i bot di addestramento ({bots}) restano fuori da alcuni percorsi. Così proteggi i dati proprietari senza perdere citazioni.',
    managed_overrides_user_intent:
      'Una sezione gestita ({section}) blocca {bots}. Le tue regole li farebbero entrare, ma la sezione gestita viene prima e vince: disattiva quella regola dal pannello del tuo CDN (su Cloudflare, AI Crawl Control).',
    managed_block_detected:
      '{bots} sono bloccati da una sezione gestita ({section}). Verifica nel pannello del tuo CDN che vuoi mantenerla.',
    fully_open_with_gating:
      'Tutti i bot AI possono leggere il tuo sito, e {count} aree private (admin, login, carrello e simili) restano chiuse: è corretto.',
    fully_open: 'Tutti i bot AI possono leggere il tuo sito.',
  },
};

/**
 * The advisory as a sentence, or '' for a missing or unknown key.
 *
 * @param {{ key: string, params?: Record<string, string|number> } | null} advisory
 * @param {'en' | 'it'} [lang]
 * @returns {string}
 */
export function advisoryText(advisory, lang = 'en') {
  const template = advisory && (ADVISORY_MESSAGES[lang] || ADVISORY_MESSAGES.en)[advisory.key];
  if (!template) return '';
  const params = advisory.params || {};
  return template.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}
