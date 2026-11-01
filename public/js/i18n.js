// English / Telugu switch for the whole site.
//
// How it works: text in the pages is written in English and marked with data-i18n="English text".
// When the visitor picks తెలుగు, each marked element shows TE["English text"] instead.
// To translate something new: add data-i18n to it (or use tr() in render.js), then add the
// English text and its Telugu translation to the TE list in i18n-te.js.
import { TE } from '/js/i18n-te.js';
import { fillVars } from '/js/render.js';

const KEY = 'gf_lang';
const OLD_BLOG_KEY = 'gf_blog_lang';

export function getLang() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (fromUrl === 'te' || fromUrl === 'en') return fromUrl;
  try {
    const v = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_BLOG_KEY);
    return v === 'te' ? 'te' : 'en';
  } catch { return 'en'; }
}

let lang = getLang();

/** Translate one English string for the current language. */
export function t(text, vars) {
  const s = lang === 'te' && TE[text] ? TE[text] : text;
  return vars ? fillVars(s, vars) : s;
}

function vars(el) {
  try { return el.dataset.vars ? JSON.parse(el.dataset.vars) : undefined; } catch { return undefined; }
}

/** Apply the current language to everything marked inside root. */
export function applyI18n(root = document) {
  const scope = root.querySelectorAll ? root : document;
  const list = [];
  if (scope.matches?.('[data-i18n],[data-i18n-placeholder],[data-i18n-aria],[data-i18n-title]')) list.push(scope);
  list.push(...scope.querySelectorAll('[data-i18n],[data-i18n-placeholder],[data-i18n-aria],[data-i18n-title]'));
  for (const el of list) {
    if (el.dataset.i18n) {
      const next = t(el.dataset.i18n, vars(el));
      if (el.textContent !== next) el.textContent = next;
    }
    if (el.dataset.i18nPlaceholder) el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
    if (el.dataset.i18nAria) el.setAttribute('aria-label', t(el.dataset.i18nAria));
    if (el.dataset.i18nTitle) el.setAttribute('title', t(el.dataset.i18nTitle));
  }
}

export const currentLang = () => lang;

export function setLang(next) {
  lang = next === 'te' ? 'te' : 'en';
  try { localStorage.setItem(KEY, lang); localStorage.setItem(OLD_BLOG_KEY, lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
  document.documentElement.classList.toggle('lang-te', lang === 'te');
  applyI18n(document);
  document.dispatchEvent(new CustomEvent('lang:change', { detail: lang }));
}

/** Start translating: now, and whenever scripts add new marked content. */
export function startI18n() {
  document.documentElement.lang = lang;
  document.documentElement.classList.toggle('lang-te', lang === 'te');
  applyI18n(document);
  let queued = false;
  new MutationObserver((records) => {
    if (lang === 'en' || queued) return;
    if (!records.some((r) => r.addedNodes.length)) return;
    queued = true;
    queueMicrotask(() => { queued = false; applyI18n(document); });
  }).observe(document.body, { childList: true, subtree: true });
}
