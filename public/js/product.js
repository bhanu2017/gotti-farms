// Product page: weight choice, quantity, Add to cart, and a sticky Add to cart bar on phones.
// The page itself is drawn by the server (netlify/functions/pages.mjs); if that failed,
// it is drawn here instead.
import {
  renderLayout, api, esc, money, cart, toast, t, ssrData, productOptions, refreshSiteSlots, $,
} from '/js/app.js';
import { productPageHtml, perUnitText, productUrl } from '/js/render.js';

const root = $('#product-root');

function wire(p) {
  const opts = productOptions(p);
  let optIndex = 0;
  let qty = 1;
  const current = () => opts[optIndex];
  const maxQty = () => Math.max(Math.min(Math.floor(p.stock / current().size), 99), 0);

  const update = () => {
    const o = current();
    qty = Math.min(Math.max(qty, 1), Math.max(maxQty(), 1));
    $('#pp-qty').textContent = qty;
    $('#pp-price').textContent = money(o.price * qty);
    const per = perUnitText(p, o);
    $('#pp-per').textContent = o.label ? `${qty > 1 ? `${qty} × ` : ''}${o.label}${per ? ` · ${per}` : ''}` : `${qty > 1 ? `${qty} × ` : ''}/ ${p.unit}`;
    $('#sb-price').textContent = money(o.price * qty);
    $('#sb-label').textContent = `${qty > 1 ? `${qty} × ` : ''}${o.label || `1 ${p.unit}`}`;
    const out = maxQty() < 1;
    for (const b of [$('#pp-add'), $('#sb-add')]) b.disabled = out;
    $('[data-q="inc"]').disabled = qty >= maxQty();
    $('[data-q="dec"]').disabled = qty <= 1;
  };

  const add = () => {
    const o = current();
    const have = cart.qty(p.id, o.label);
    const next = Math.min(have + qty, maxQty());
    if (next <= have) { toast(t('You already have all the stock we have in your cart.')); return; }
    cart.set(p, next, o);
    toast(`${t('Added to cart')}: ${esc(p.name)}${o.label ? ` (${esc(o.label)})` : ''} × ${next - have} <a href="/cart">${t('View cart')}</a>`);
  };

  root.addEventListener('change', (e) => {
    if (e.target.name === 'opt') { optIndex = Number(e.target.value) || 0; update(); }
  });
  root.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]')?.dataset.q;
    if (q === 'inc') { qty += 1; update(); }
    if (q === 'dec') { qty -= 1; update(); }
  });
  $('#pp-add').addEventListener('click', add);
  $('#sb-add').addEventListener('click', add);

  // Sticky bar (phones): show it once the main Add to cart button scrolls out of view.
  const bar = $('#sticky-buy');
  document.body.classList.add('has-sticky-buy');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      bar.classList.toggle('show', show);
      bar.setAttribute('aria-hidden', String(!show));
      $('#sb-add').tabIndex = show ? 0 : -1;
    }).observe($('#pp-buy'));
  }
  update();
}

(async () => {
  const cfgPromise = renderLayout('shop');
  const ssr = ssrData();
  if (ssr?.page === 'product') { wire(ssr.product); return; }
  // Fallback: draw the page in the browser
  const id = Number((location.pathname.match(/^\/product\/(\d+)/) || [])[1]);
  try {
    const [p, cfg] = await Promise.all([api(`/api/products/${id}`), cfgPromise]);
    document.title = `${p.name} – Gotti Farms`;
    if (location.pathname !== productUrl(p)) history.replaceState(null, '', productUrl(p));
    root.innerHTML = productPageHtml(p, { freeAbove: cfg.freeDeliveryAbove, onlineEnabled: cfg.onlinePaymentEnabled });
    refreshSiteSlots(cfg);
    wire(p);
  } catch (err) {
    root.innerHTML = `<div class="empty"><h1>${esc(t('Product not found'))}</h1><p>${esc(err.message)}</p>
      <a class="btn btn-primary" href="/shop">${esc(t('Browse products'))}</a></div>`;
  }
})();
