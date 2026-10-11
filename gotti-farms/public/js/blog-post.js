import { renderLayout, api, esc, icon, getConfig, $, toDate } from '/js/app.js';
import { getLang, setLang, TOPICS, T, langToggle, postCard, localize, renderBody, readMinutes } from '/js/blog-common.js';

const root = $('#article');
const slug = decodeURIComponent(location.pathname.replace(/^\/blog\//, '').replace(/\/$/, ''));
let lang = getLang();
let post; let related = []; let cfg;

const fmtDate = (s, l) => toDate(s)
  .toLocaleDateString(l === 'te' ? 'te-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

function render() {
  const l = localize(post, lang);
  const t = T[l.lang];
  const ui = T[lang];
  document.documentElement.lang = l.lang;
  document.title = `${l.title} | Gotti Farms`;
  const meta = document.querySelector('meta[name="description"]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'description' }));
  meta.content = l.summary;
  const s = cfg.store;
  const wa = s.whatsapp ? `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(`Hello Gotti Farms, I read "${post.title_en}" and need help with my crop.`)}` : '';

  root.innerHTML = `
    <div class="article-top">
      <a class="link-arrow back-link" href="/blog${lang === 'te' ? '?lang=te' : ''}">← ${ui.back}</a>
      ${langToggle(lang)}
    </div>
    <article lang="${l.lang}">
      <span class="topic">${esc(TOPICS[post.category]?.[l.lang] || post.category)}</span>
      <h1>${esc(l.title)}</h1>
      <p class="article-meta muted">${fmtDate(post.created_at, l.lang)}, ${readMinutes(l.body.length)} ${t.read}</p>
      ${l.fellBack ? `<div class="alert alert-info" lang="te">${T.te.onlyEnglish}</div>` : ''}
      ${post.image ? `<img class="article-cover" src="${esc(post.image)}" alt="">` : ''}
      ${l.summary ? `<p class="article-lead">${esc(l.summary)}</p>` : ''}
      <div class="article-body">${renderBody(l.body)}</div>
      <p class="article-note muted">${t.disclaimer}</p>
    </article>
    <aside class="help-box" lang="${lang}">
      <h2>${ui.help}</h2>
      <p>${ui.helpText}</p>
      <div class="help-actions">
        ${wa ? `<a class="btn btn-primary" href="${esc(wa)}" target="_blank" rel="noopener">${icon.whatsapp} ${ui.whatsapp}</a>` : ''}
        ${s.phone ? `<a class="btn btn-outline" href="tel:${esc(s.phone.replace(/\s/g, ''))}">${icon.phone} ${ui.call}</a>` : ''}
      </div>
    </aside>
    ${related.length ? `<section class="related"><h2 lang="${lang}">${ui.related}</h2>
      <div class="post-grid">${related.map((p) => postCard(p, lang)).join('')}</div></section>` : ''}`;
}

root.addEventListener('click', (e) => {
  const b = e.target.closest('[data-lang]');
  if (!b) return;
  lang = b.dataset.lang;
  setLang(lang);
  history.replaceState(null, '', lang === 'te' ? '?lang=te' : location.pathname);
  render();
});

(async () => {
  cfg = await renderLayout('blog');
  try {
    post = await api(`/api/posts/${encodeURIComponent(slug)}`);
  } catch (err) {
    const t = T[lang];
    root.innerHTML = `<div class="empty"><h1>${t.notFound}</h1><p>${esc(err.message)}</p><a class="btn btn-primary" href="/blog">${t.back}</a></div>`;
    return;
  }
  try {
    related = (await api(`/api/posts?category=${post.category}&limit=4`)).filter((p) => p.id !== post.id).slice(0, 3);
  } catch { related = []; }
  render();
})();
