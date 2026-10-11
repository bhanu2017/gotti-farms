import { renderLayout, api, esc, mountProducts, saved, $ } from '/js/app.js';

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
  const chip = (id, label) => `<button class="chip" type="button" data-cat="${esc(id)}" aria-pressed="${state.category === id}">${esc(label)}</button>`;
  $('#chips').innerHTML = chip('', 'All') + categories.map((c) => chip(c.id, c.name)).join('') + chip('saved', 'Saved');
  const cat = categories.find((c) => c.id === state.category);
  $('#shop-title').textContent = state.category === 'saved' ? 'Saved products' : cat ? cat.name : state.q ? `Results for "${state.q}"` : 'All Products';
}

function render() {
  const grid = $('#grid');
  let list = products;
  if (state.category === 'saved') list = products.filter((p) => saved.has(p.id));
  if (!list.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <h3>${state.category === 'saved' ? 'No saved products yet' : 'No products found'}</h3>
      <p>${state.category === 'saved' ? 'Tap the heart on any product to save it here.' : 'Try another search or category.'}</p>
      <button class="btn btn-outline" type="button" id="reset">Show all products</button></div>`;
    $('#reset').onclick = () => { Object.assign(state, { category: '', q: '' }); $('#shop-q').value = ''; load(); };
    return;
  }
  mountProducts(grid, list);
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

api('/api/categories').then((c) => { categories = c; renderChips(); }).catch(() => {});
load();
