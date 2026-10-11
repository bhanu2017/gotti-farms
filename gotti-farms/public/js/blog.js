import { renderLayout, api, esc, $ } from '/js/app.js';
import { getLang, setLang, TOPICS, T, langToggle, postCard } from '/js/blog-common.js';

renderLayout('blog');

const params = new URLSearchParams(location.search);
const state = { lang: getLang(), topic: params.get('topic') || '', q: params.get('q') || '' };
let posts = [];

function syncUrl() {
  const p = new URLSearchParams();
  if (state.topic) p.set('topic', state.topic);
  if (state.q) p.set('q', state.q);
  if (state.lang === 'te') p.set('lang', 'te');
  history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
}

function renderChrome() {
  const t = T[state.lang];
  document.documentElement.lang = state.lang;
  document.title = `${t.pageTitle} | Gotti Farms`;
  $('#blog-title').textContent = t.pageTitle;
  $('#blog-sub').textContent = t.pageSub;
  $('#lang-slot').innerHTML = langToggle(state.lang);
  const q = $('#blog-q');
  q.placeholder = t.search;
  if (!q.value) q.value = state.q;
  const chip = (id, label) => `<button class="chip" type="button" data-topic="${id}" aria-pressed="${state.topic === id}">${esc(label)}</button>`;
  $('#topics').innerHTML = chip('', t.all) + Object.entries(TOPICS).map(([id, n]) => chip(id, n[state.lang])).join('');
}

function renderPosts() {
  const t = T[state.lang];
  const box = $('#posts');
  if (!posts.length) {
    box.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>${t.noResults}</h3><p>${t.noResultsHint}</p>
      <button class="btn btn-outline" type="button" id="reset">${t.showAll}</button></div>`;
    $('#reset').onclick = () => { state.topic = ''; state.q = ''; $('#blog-q').value = ''; load(); };
    return;
  }
  box.innerHTML = posts.map((p) => postCard(p, state.lang)).join('');
}

async function load() {
  syncUrl();
  renderChrome();
  const p = new URLSearchParams();
  if (state.topic) p.set('category', state.topic);
  if (state.q) p.set('q', state.q);
  try {
    posts = await api(`/api/posts?${p}`);
    renderPosts();
  } catch (err) {
    $('#posts').innerHTML = `<p class="warn">${esc(err.message)}</p>`;
  }
}

document.addEventListener('click', (e) => {
  const langBtn = e.target.closest('[data-lang]');
  if (langBtn) { state.lang = langBtn.dataset.lang; setLang(state.lang); renderChrome(); renderPosts(); syncUrl(); return; }
  const topicBtn = e.target.closest('[data-topic]');
  if (topicBtn) { state.topic = topicBtn.dataset.topic; load(); }
});
let timer;
$('#blog-q').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 300); });

load();
