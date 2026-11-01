import { renderLayout, api, esc, mountProducts, ssrData, t, $ } from '/js/app.js';
import { getLang, postCard } from '/js/blog-common.js';

renderLayout('home');

// Shop by Category cards are plain links in index.html, so they need no script.

// Featured products: drawn by the server (pages.mjs); here we only switch on the buttons.
// If the server could not draw them, load them now.
const grid = $('#featured-grid');
const ssr = ssrData();
if (ssr?.page === 'home') {
  mountProducts(grid, ssr.featured, { hydrate: true });
} else {
  api('/api/products?featured=1').then((products) => {
    if (!products.length) { grid.innerHTML = '<p class="muted">New products are coming soon.</p>'; return; }
    mountProducts(grid, products.slice(0, 12));
  }).catch((err) => { grid.innerHTML = `<p class="warn">${esc(err.message)}</p>`; });
}

// Recipes & farm stories (newest 3)
api('/api/posts?section=recipes&limit=3').then((posts) => {
  if (!posts.length) return;
  $('#tips-grid').innerHTML = posts.map((p) => postCard(p, getLang(), 'recipes')).join('');
  $('#tips').hidden = false;
}).catch(() => {});

// Refer a friend: share the site on WhatsApp
const share = $('#refer-share');
if (share) {
  // No number in the link, so WhatsApp asks which friend to send it to.
  const update = () => { share.href = `https://wa.me/?text=${encodeURIComponent(`${t('I buy naturally grown rice, turmeric and vegetables from Gotti Farms. Have a look:')} ${location.origin}`)}`; };
  update();
  document.addEventListener('lang:change', update);
}

// Farm story video: nothing is downloaded until the section is close to the screen,
// so the video never slows down the first page load. Vertical version on phones.
(() => {
  const v = document.getElementById('farm-story');
  if (!v) return;
  const phoneQuery = window.matchMedia('(max-width: 640px)');
  let activated = false;
  const pick = () => {
    if (!activated || !v.paused) return;
    const phone = phoneQuery.matches;
    const src = phone ? '/videos/farm-story-vertical.mp4' : '/videos/farm-story.mp4';
    if (v.getAttribute('src') === src) return;
    v.setAttribute('poster', phone ? '/videos/farm-story-poster-vertical.webp' : '/videos/farm-story-poster.webp');
    v.setAttribute('src', src);
    v.classList.toggle('is-vertical', phone);
  };
  const activate = () => { if (!activated) { activated = true; pick(); } };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { activate(); io.disconnect(); }
    }, { rootMargin: '400px 0px' });
    io.observe(v);
  } else {
    activate();
  }
  phoneQuery.addEventListener('change', pick);
})();
