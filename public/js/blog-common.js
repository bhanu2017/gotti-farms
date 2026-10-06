// Shared helpers for the farmer blog: language choice, topic names, article rendering.
import { esc } from '/js/app.js';

const LANG_KEY = 'gf_blog_lang';

export function getLang() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (fromUrl === 'te' || fromUrl === 'en') return fromUrl;
  try { return localStorage.getItem(LANG_KEY) === 'te' ? 'te' : 'en'; } catch { return 'en'; }
}
export function setLang(lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
}

export const TOPICS = {
  pests: { en: 'Pests', te: 'పురుగులు' },
  diseases: { en: 'Diseases', te: 'తెగుళ్లు' },
  soil: { en: 'Soil', te: 'నేల' },
  water: { en: 'Water', te: 'నీటి యాజమాన్యం' },
  general: { en: 'General', te: 'సాధారణం' },
};

export const T = {
  en: {
    pageTitle: 'Farmer Tips', pageSub: 'Practical answers to common problems in the field: pests, diseases, soil and water.',
    all: 'All topics', search: 'Search articles…', read: 'min read', noResults: 'No articles found',
    noResultsHint: 'Try another word or topic.', showAll: 'Show all articles', back: 'All farmer tips',
    help: 'Facing a problem in your field?', helpText: 'Send us a photo of the affected crop on WhatsApp or call us. We are happy to help.',
    whatsapp: 'Send a WhatsApp message', call: 'Call us', related: 'More tips on this topic', updated: 'Updated',
    onlyEnglish: 'This article is available in English only.', notFound: 'Article not found',
    disclaimer: 'This is general guidance. For pesticides and doses, always follow the product label and your local agriculture officer.',
  },
  te: {
    pageTitle: 'రైతు సలహాలు', pageSub: 'పొలంలో తరచూ ఎదురయ్యే సమస్యలకు ఆచరణాత్మక పరిష్కారాలు: పురుగులు, తెగుళ్లు, నేల, నీరు.',
    all: 'అన్ని అంశాలు', search: 'వ్యాసాలు వెతకండి…', read: 'నిమిషాల చదువు', noResults: 'వ్యాసాలు దొరకలేదు',
    noResultsHint: 'వేరే పదం లేదా అంశంతో ప్రయత్నించండి.', showAll: 'అన్ని వ్యాసాలు చూపించు', back: 'అన్ని రైతు సలహాలు',
    help: 'మీ పొలంలో సమస్య ఉందా?', helpText: 'దెబ్బతిన్న పంట ఫోటోను వాట్సాప్‌లో పంపండి లేదా మాకు ఫోన్ చేయండి. మేము సహాయం చేస్తాము.',
    whatsapp: 'వాట్సాప్ సందేశం పంపండి', call: 'ఫోన్ చేయండి', related: 'ఈ అంశంపై మరిన్ని సలహాలు', updated: 'నవీకరించబడింది',
    onlyEnglish: 'ఈ వ్యాసం ప్రస్తుతం ఇంగ్లీష్‌లో మాత్రమే అందుబాటులో ఉంది.', notFound: 'వ్యాసం దొరకలేదు',
    disclaimer: 'ఇది సాధారణ సమాచారం మాత్రమే. పురుగుమందులు, మోతాదుల కోసం ఎల్లప్పుడూ మందు లేబుల్‌ను, మీ స్థానిక వ్యవసాయ అధికారి సలహాను పాటించండి.',
  },
};

/** Pick the post fields for a language, falling back to English if Telugu is missing. */
export function localize(post, lang) {
  const hasTe = Boolean(post.title_te);
  const useTe = lang === 'te' && hasTe;
  return {
    lang: useTe ? 'te' : 'en',
    fellBack: lang === 'te' && !hasTe,
    title: useTe ? post.title_te : post.title_en,
    summary: useTe ? (post.summary_te || post.summary_en) : post.summary_en,
    body: useTe ? post.body_te : post.body_en,
    length: useTe ? post.length_te : post.length_en,
  };
}

export const readMinutes = (chars) => Math.max(1, Math.round((chars || 0) / 1000));

export function langToggle(current) {
  return `<div class="lang-toggle" role="group" aria-label="Language / భాష">
    <button type="button" data-lang="en" aria-pressed="${current === 'en'}">English</button>
    <button type="button" data-lang="te" aria-pressed="${current === 'te'}" lang="te">తెలుగు</button>
  </div>`;
}

export function postCard(post, lang) {
  const l = localize(post, lang);
  return `<a class="post-card" href="/blog/${encodeURIComponent(post.slug)}${lang === 'te' ? '?lang=te' : ''}">
    <img src="${esc(post.image || '/images/placeholder.svg')}" alt="" loading="lazy" width="400" height="250">
    <div class="post-card-body" lang="${l.lang}">
      <span class="topic">${esc(TOPICS[post.category]?.[l.lang] || post.category)}</span>
      <h3>${esc(l.title)}</h3>
      <p>${esc(l.summary)}</p>
      <span class="muted small">${readMinutes(l.length)} ${T[l.lang].read}</span>
    </div>
  </a>`;
}

/**
 * Turn the simple article format into HTML (text is escaped first, so it's safe).
 * Supported: blank line = new paragraph, "## Heading", "### Small heading",
 * "- item" lists, "1. item" numbered lists, **bold**.
 */
export function renderBody(text) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return String(text || '').replace(/\r\n/g, '\n').split(/\n\s*\n/).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return '';
    if (lines.length === 1 && lines[0].startsWith('### ')) return `<h3>${inline(lines[0].slice(4))}</h3>`;
    if (lines.length === 1 && lines[0].startsWith('## ')) return `<h2>${inline(lines[0].slice(3))}</h2>`;
    if (lines.every((l) => /^[-*] /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
    if (lines.every((l) => /^\d+[.)] /.test(l))) return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+[.)] /, ''))}</li>`).join('')}</ol>`;
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('\n');
}
