import { renderLayout, api, esc, mountProducts, saved, ssrData, $ } from '/js/app.js';
import { shopChipsHtml, shopTitle, emptyShopHtml } from '/js/render.js';

renderLayout('shop');

const params = new URLSearchParams(location.search);
const state = { category: params.get('category') || '', q: params.get('q') || '', sort: params.get('sort') || '' };
let categories = [];
let products = [];

$('#shop-q').value = state.q;
$('#sort').value = state.sort;

function syncUrl() {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) if (v) p.set(k, v);
  history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
}

function renderChips() {
  $('#chips').innerHTML = shopChipsHtml(categories, state.category);
  $('#shop-title').innerHTML = shopTitle(state, categories);
}

function render({ hydrate = false } = {}) {
  const grid = $('#grid');
  let list = products;
  if (state.category === 'saved') list = products.filter((p) => saved.has(p.id));
  if (!list.length) {
    grid.innerHTML = emptyShopHtml(state.category === 'saved');
    $('#reset').addEventListener('click', (e) => {
      e.preventDefault();
      Object.assign(state, { category: '', q: '' });
      $('#shop-q').value = '';
      load();
    });
    return;
  }
  mountProducts(grid, list, { hydrate: hydrate && state.category !== 'saved' });
}

async function load() {
  syncUrl();
  renderChips();
  const p = new URLSearchParams();
  if (state.category && state.category !== 'saved') p.set('category', state.category);
  if (state.q) p.set('q', state.q);
  if (state.sort) p.set('sort', state.sort);
  try {
    products = await api(`/api/products?${p}`);
    render();
  } catch (err) {
    $('#grid').innerHTML = `<p class="warn">${esc(err.message)}</p>`;
  }
}

$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  state.category = b.dataset.cat;
  load();
});
let t;
$('#shop-q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 300); });
$('#sort').addEventListener('change', (e) => { state.sort = e.target.value; load(); });
$('#grid').addEventListener('saved:change', () => { if (state.category === 'saved') render(); });

// First view: the server already drew the products (pages.mjs), so just switch on the buttons.
const ssr = ssrData();
if (ssr?.page === 'shop') {
  categories = ssr.categories;
  products = ssr.products;
  Object.assign(state, ssr.query);
  $('#shop-q').value = state.q;
  $('#sort').value = state.sort;
  syncUrl();
  renderChips();
  render({ hydrate: true });
} else {
  api('/api/categories').then((c) => { categories = c; renderChips(); }).catch(() => {});
  load();
}
