// HTML builders shared by the browser (app.js, shop.js) and the server page renderer
// (netlify/functions/pages.mjs). Pure functions only: no window, document or localStorage here.

// ---------- Icons (inline SVG, no icon library needed) ----------
export const icon = {
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4h13v11H1zM14 8h4l4 4v3h-8z"/><circle cx="5.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7.5" r="4.5"/><path d="M3 21c0-4.4 4-7.5 9-7.5s9 3.1 9 7.5z"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 3h3.2l2.6 11.2A2 2 0 0 0 8.8 16H19v-2H8.8l-.4-1.8H18a1.5 1.5 0 0 0 1.4-1l2.4-6.7A1 1 0 0 0 20.9 3H6.1L5.6 1H1z"/><circle cx="9" cy="20" r="2"/><circle cx="18" cy="20" r="2"/></svg>',
  cartOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M1.5 2.5h3l2.7 12.4a1.5 1.5 0 0 0 1.5 1.1h9.5a1.5 1.5 0 0 0 1.4-1.1L21.5 7H5.7"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c-1-3-1-6 0-9 1.5-4 6-7 10-8-1 5-3 10-8 12-.7.3-1.4.4-2 .5zM11 21C6 20 2.5 16 2 10c3 0 6 1.5 8 4 .8 1 1.3 2.2 1.6 3.4-.3 1.2-.5 2.4-.6 3.6z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1 3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5zm-1.5 15.5-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
  sprout: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 22v-7.2C7 14.5 4 11.6 4 7.5V6h1.5c3.2 0 5.6 1.8 6.2 4.7C12.6 7.3 15.4 5 19 5h1v1.5c0 4.4-3.4 7.9-7.5 8.3V22z"/></svg>',
  tractor: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4h7l1 5h4V6h2v3h1a1 1 0 0 1 1 1v5.3A4 4 0 0 0 14.6 17H10.9A5 5 0 0 0 3 13.3V9h3zm2 2-.6 3H11l-.6-3z"/><circle cx="6" cy="17" r="3.2"/><circle cx="18" cy="18" r="2.4"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="3.2"/><circle cx="5" cy="8.5" r="2.5"/><circle cx="19" cy="8.5" r="2.5"/><path d="M6 20c0-3.6 2.7-6.5 6-6.5s6 2.9 6 6.5zM0 20c0-2.8 1.8-5 4.3-5.4A8.5 8.5 0 0 0 4 20zm24 0h-4c0-1.9-.4-3.7-1.2-5.4 2.6.4 5.2 2.6 5.2 5.4z"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1 2 6v12l10 5 10-5V6zm0 2.3L19.6 7 12 10.7 4.4 7zM4 8.6l7 3.5v8.4l-7-3.5zm9 11.9v-8.4l7-3.5v8.4z"/></svg>',
  plant: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 13C8 13 5 10.6 5 6.5V5h1c3 0 5 1.8 5.6 4.4C12.4 6.9 14.6 5 18 5h1v1.5C19 10 16 13 13 13v2h4l-1.5 7h-7L7 15h4z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8V6c0-1 .5-1.5 1.5-1.5H17V1h-3c-3 0-4 2-4 4.5V8H7v3.5h3V23h4V11.5h3l.5-3.5z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.8 15.1V8.9L15.5 12z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.2-1.4A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5 0-1.1.1-3.4-.8-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.2.2-.3.3-.1.6.2.3.8 1.4 1.8 2.2 1.3 1.1 2.3 1.4 2.6 1.6.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3 0 .2 0 .9-.3 1.6z"/></svg>',
};

export const logoMark = `<svg viewBox="0 0 48 48" aria-hidden="true">
  <path d="M24 44C17 36 14 27 18 17 21 10 29 5 40 3c1 13-3 24-11 31-1.6 1.5-3.3 2.6-5 3.4z" fill="#2b7440"/>
  <path d="M22 44C13 41 5 34 4 21c8 0 15 4 18 10 1.4 3 1.6 6.6 0 13z" fill="#6aa84f"/>
  <path d="M24 42c1-10 5-20 13-33" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`;

import { SITE } from './site-info.js';

// ---------- Text helpers ----------
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Format paise as rupees: 12000 -> "₹120", 12050 -> "₹120.50" */
export function money(paise) {
  const r = (paise || 0) / 100;
  return '₹' + r.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(r) ? 0 : 2, maximumFractionDigits: 2 });
}

// ---------- Translation markers ----------
// Text is written in English with data-i18n="English text". The browser swaps it to Telugu
// when the visitor picks తెలుగు (see i18n.js). {name} placeholders are filled from data-vars.
export function tr(text, vars) {
  const shown = vars ? fillVars(text, vars) : text;
  return `<span data-i18n="${esc(text)}"${vars ? ` data-vars="${esc(JSON.stringify(vars))}"` : ''}>${esc(shown)}</span>`;
}
export function fillVars(text, vars = {}) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// ---------- Products: links, weight options, prices ----------
export function slugify(text) {
  return String(text ?? '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
    .replace(/[\s_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
export const productUrl = (p) => `/product/${Number(p.id)}-${slugify(p.name) || 'item'}`;

/** Weight/pack choices. A product without options is sold per unit at its base price. */
export function productOptions(p) {
  return Array.isArray(p.options) && p.options.length ? p.options : [{ label: '', size: 1, price: p.price }];
}
export const hasChoices = (p) => productOptions(p).length > 1;
/** What one option is called, e.g. "5 kg" or, for plain products, "1 kg" / "1 pack". */
export const optionName = (p, o) => o.label || `1 ${p.unit}`;
/** "₹116 / kg" for a 5 kg option priced ₹580, or '' when it is just one unit. */
export function perUnitText(p, o) {
  if (!o || o.size <= 1) return '';
  return `${money(Math.round(o.price / o.size))} / ${p.unit}`;
}
export function cheapestPerUnit(p) {
  return Math.min(...productOptions(p).map((o) => o.price / o.size));
}

/** The button area under a product: Add to Cart, a quantity stepper, or Out of stock. */
export function cardActionHtml(p, qty = 0, o = productOptions(p)[0]) {
  const outOfStock = p.stock < (o?.size || 1);
  if (outOfStock) return `<button class="add-btn" type="button" disabled>${tr('Out of stock')}</button>`;
  if (qty === 0) return `<button class="add-btn" type="button" data-act="add">${icon.cartOutline} ${tr('Add to Cart')}</button>`;
  const maxQty = Math.min(Math.floor(p.stock / (o?.size || 1)), 99);
  return `<div class="stepper" role="group" aria-label="Quantity of ${esc(p.name)}">
      <button type="button" data-act="dec" aria-label="Remove one">−</button>
      <output aria-live="polite">${qty}${o?.label ? ` × ${esc(o.label)}` : ` ${esc(p.unit)}`}</output>
      <button type="button" data-act="inc" aria-label="Add one" ${qty >= maxQty ? 'disabled' : ''}>+</button></div>`;
}

/** Price line on a card for the chosen option. */
export function cardPriceHtml(p, o) {
  if (!o.label) return `${money(o.price)} <small>/ ${esc(p.unit)}</small>`;
  const per = perUnitText(p, o);
  return `${money(o.price)} <small>${esc(o.label)}${per ? ` · ${esc(per)}` : ''}</small>`;
}

export function productCardHtml(p, { isSaved = false, qty = 0, optIndex = 0, eager = false } = {}) {
  const opts = productOptions(p);
  const o = opts[optIndex] || opts[0];
  const url = productUrl(p);
  return `
    <article class="product-card" data-id="${Number(p.id)}">
      <div class="product-media">
        <a href="${url}" tabindex="-1" aria-hidden="true"><img src="${esc(p.image || '/images/placeholder.svg')}" alt="${esc(p.name)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="300" height="246"></a>
        <button class="heart" type="button" aria-label="Save ${esc(p.name)}" aria-pressed="${isSaved}">${icon.heart}</button>
        ${p.stock <= 0 ? `<span class="stock-flag">${tr('Out of stock')}</span>` : p.stock <= 5 ? `<span class="stock-flag">${tr('Only {n} left', { n: Number(p.stock) })}</span>` : ''}
      </div>
      <div class="product-info">
        <h3><a href="${url}">${esc(p.name)}</a></h3>
        ${opts.length > 1 ? `<label class="sr-only" for="opt-${Number(p.id)}">Weight</label>
        <select class="opt-select" id="opt-${Number(p.id)}" data-opt>
          ${opts.map((x, i) => `<option value="${i}" ${i === optIndex ? 'selected' : ''}>${esc(x.label)} – ${money(x.price)}</option>`).join('')}
        </select>` : ''}
        <div class="price">${cardPriceHtml(p, o)}</div>
        <div class="product-actions" data-qty="${qty}">${cardActionHtml(p, qty, o)}</div>
      </div>
    </article>`;
}

// ---------- Delivery and payment notes (product page, cart, checkout) ----------
const upiIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>';
const cardIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>';
const cashIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>';

/** Delivery areas, expected days and the free-delivery offer. freeAbove in paise. */
export function deliveryInfoHtml(freeAbove) {
  return `<div class="info-note delivery-note">
      <div class="info-note-head">${icon.truck} <b>${tr('Delivery information')}</b></div>
      <ul>
        <li>${tr('Delivery areas')}: <span data-site="deliveryAreas">${esc(SITE.deliveryAreas)}</span></li>
        <li>${tr('Expected delivery')}: <span data-site="deliveryDays">${esc(SITE.deliveryDays)}</span></li>
        <li>${tr('Free delivery on orders above {amount}', { amount: money(freeAbove) })}</li>
      </ul>
    </div>`;
}

/** Accepted payment methods. UPI and cards show "coming soon" until online payment is switched on. */
export function paymentMethodsHtml(onlineEnabled) {
  const soon = onlineEnabled ? '' : ` <small class="soon">${tr('coming soon')}</small>`;
  return `<div class="info-note pay-note">
      <div class="info-note-head">${icon.shield} <b>${tr('We accept')}</b></div>
      <ul class="pay-badges">
        <li class="${onlineEnabled ? '' : 'off'}">${upiIcon} UPI${soon}</li>
        <li class="${onlineEnabled ? '' : 'off'}">${cardIcon} ${tr('Cards')}${soon}</li>
        <li>${cashIcon} ${tr('Cash on Delivery')}</li>
      </ul>
    </div>`;
}

// ---------- Product page ----------
export function productPageHtml(p, { freeAbove, onlineEnabled }) {
  const opts = productOptions(p);
  const o = opts[0];
  const out = p.stock < o.size;
  return `
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${tr('Home')}</a> / <a href="/shop">${tr('Products')}</a> /
      <a href="/shop?category=${encodeURIComponent(p.category_id)}">${tr(p.category_name)}</a></nav>
    <div class="product-page" data-id="${Number(p.id)}">
      <div class="pp-media">
        <img src="${esc(p.image || '/images/placeholder.svg')}" alt="${esc(p.name)}" width="600" height="600" fetchpriority="high">
      </div>
      <div class="pp-info">
        <h1>${esc(p.name)}</h1>
        <div class="pp-price"><b id="pp-price">${money(o.price)}</b> <span id="pp-per" class="muted">${o.label ? `${esc(o.label)}${perUnitText(p, o) ? ` · ${esc(perUnitText(p, o))}` : ''}` : `/ ${esc(p.unit)}`}</span></div>
        ${p.stock <= 0 ? `<p class="stock-line bad">${tr('Out of stock')}</p>` : p.stock <= 5 ? `<p class="stock-line">${tr('Only {n} left', { n: Number(p.stock) })}</p>` : `<p class="stock-line ok">${tr('In stock')}</p>`}
        ${opts.length > 1 ? `<fieldset class="pp-options"><legend>${tr('Choose weight')}</legend>
          ${opts.map((x, i) => `<label class="opt-pill"><input type="radio" name="opt" value="${i}" ${i === 0 ? 'checked' : ''} ${p.stock < x.size ? 'disabled' : ''}>
            <span><b>${esc(x.label)}</b><small>${money(x.price)}${perUnitText(p, x) ? ` · ${esc(perUnitText(p, x))}` : ''}</small></span></label>`).join('')}
        </fieldset>` : ''}
        <div class="pp-buy" id="pp-buy">
          <div class="stepper pp-qty" role="group" aria-label="Quantity">
            <button type="button" data-q="dec" aria-label="Less">−</button><output id="pp-qty">1</output><button type="button" data-q="inc" aria-label="More">+</button>
          </div>
          <button class="btn btn-primary pp-add" type="button" id="pp-add" ${out ? 'disabled' : ''}>${icon.cartOutline} ${tr(out ? 'Out of stock' : 'Add to Cart')}</button>
        </div>
        ${p.description ? `<div class="pp-desc"><h2>${tr('About this product')}</h2><p>${esc(p.description)}</p></div>` : ''}
        ${deliveryInfoHtml(freeAbove)}
        ${paymentMethodsHtml(onlineEnabled)}
      </div>
    </div>
    <div class="sticky-buy" id="sticky-buy" aria-hidden="true">
      <div><b id="sb-price">${money(o.price)}</b><small id="sb-label">${esc(o.label || `1 ${p.unit}`)}</small></div>
      <button class="btn btn-primary" type="button" id="sb-add" tabindex="-1" ${out ? 'disabled' : ''}>${icon.cartOutline} ${tr(out ? 'Out of stock' : 'Add to Cart')}</button>
    </div>`;
}

// ---------- Shop page pieces ----------

export function shopChipsHtml(categories, active = '') {
  // Hide categories with no products (e.g. "Grains" once rice, turmeric and groundnut have their own),
  // unless the shopper is looking at that category right now.
  const shown = categories.filter((c) => c.product_count == null || c.product_count > 0 || c.id === active);
  const chipT = (id, label) => `<button class="chip" type="button" data-cat="${esc(id)}" aria-pressed="${active === id}">${tr(label)}</button>`;
  return chipT('', 'All') + shown.map((c) => chipT(c.id, c.name)).join('') + chipT('saved', 'Saved');
}

/** Shop page heading as HTML (translatable). */
export function shopTitle({ category, q }, categories) {
  if (category === 'saved') return tr('Saved products');
  const cat = categories.find((c) => c.id === category);
  if (cat) return tr(cat.name);
  if (q) return tr('Results for "{q}"', { q });
  return tr('All Products');
}

export function emptyShopHtml(isSaved) {
  return `<div class="empty" style="grid-column:1/-1">
      <h3>${tr(isSaved ? 'No saved products yet' : 'No products found')}</h3>
      <p>${tr(isSaved ? 'Tap the heart on any product to save it here.' : 'Try another search or category.')}</p>
      <a class="btn btn-outline" href="/shop" id="reset">${tr('Show all products')}</a></div>`;
}

/** Data handed from the server-rendered page to the page script, so it doesn't fetch twice. */
export function ssrDataScript(data) {
  const jsonText = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/json" id="ssr-data">${jsonText}</script>`;
}
