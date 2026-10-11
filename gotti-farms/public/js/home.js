import { renderLayout, api, esc, mountProducts, $ } from '/js/app.js';
import { getLang, postCard } from '/js/blog-common.js';

renderLayout('home');

api('/api/categories').then((cats) => {
  $('#category-grid').innerHTML = cats.map((c) => `
    <a class="category-tile" href="/shop?category=${encodeURIComponent(c.id)}">
      <img src="${esc(c.image || '/images/placeholder.svg')}" alt="" loading="lazy" width="268" height="168">
      <span>${esc(c.name)}</span>
    </a>`).join('');
}).catch(() => { $('#category-grid').innerHTML = ''; });

api('/api/products?featured=1').then((products) => {
  const grid = $('#featured-grid');
  if (!products.length) { grid.innerHTML = '<p class="muted">New products are coming soon.</p>'; return; }
  mountProducts(grid, products.slice(0, 12));
}).catch((err) => { $('#featured-grid').innerHTML = `<p class="warn">${esc(err.message)}</p>`; });

api('/api/posts?limit=3').then((posts) => {
  if (!posts.length) return;
  $('#tips-grid').innerHTML = posts.map((p) => postCard(p, getLang())).join('');
  $('#tips').hidden = false;
}).catch(() => {});
