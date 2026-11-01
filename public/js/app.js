// Shared code for every page: API helper, cart, header/footer, product cards,
// language switch, WhatsApp button, first-order offer and analytics.

import {
  icon, logoMark, esc, money, tr, productCardHtml, cardActionHtml, cardPriceHtml, productOptions, productUrl,
} from '/js/render.js';
import { SITE, isPlaceholder, whatsappLink } from '/js/site-info.js';
import { t, startI18n, setLang, currentLang, applyI18n } from '/js/i18n.js';

export { icon, logoMark, esc, money, tr, t, SITE, whatsappLink, currentLang, applyI18n };

// ---------- Helpers ----------
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Parse a date from the API (ISO string or "YYYY-MM-DD HH:MM:SS" in UTC). */
export function toDate(value) {
  const s = String(value ?? '');
  return new Date(/T|Z$|[+-]\d\d(:?\d\d)?$/.test(s) ? s : s.replace(' ', 'T') + 'Z');
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Could not reach the store. Check your internet connection and try again.');
    err.status = res.status;
    throw err;
  }
  return data;
}

let configPromise;
export const getConfig = () => (configPromise ??= api('/api/config').catch(() => ({
  store: { name: 'Gotti Farms', phone: '', email: '' }, deliveryFee: 4000, freeDeliveryAbove: 49900, codEnabled: true,
  onlinePaymentEnabled: false, firstOrder: { percent: 0 },
})));

function storageGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

// ---------- Contact details ----------
// From site-info.js; while a value there is still a [PLACEHOLDER], the store settings on Netlify
// (STORE_PHONE, STORE_EMAIL, STORE_WHATSAPP) are used if they exist.
export function contact(cfg) {
  const st = cfg?.store || {};
  const pick = (mine, fallback) => (isPlaceholder(mine) && fallback ? fallback : mine);
  const phone = pick(SITE.phone, st.phone);
  const whatsapp = String(pick(SITE.whatsapp, st.whatsapp)).replace(/\D/g, '') || (isPlaceholder(SITE.whatsapp) ? '' : SITE.whatsapp);
  return {
    phone, whatsapp, email: pick(SITE.email, st.email), address: SITE.address, fssai: SITE.fssai,
    phoneHref: isPlaceholder(phone) ? '#' : `tel:${String(phone).replace(/[^\d+]/g, '')}`,
    waHref: (msg) => {
      const text = encodeURIComponent(msg ?? SITE.whatsappMessage);
      return whatsapp ? `https://wa.me/${whatsapp}?text=${text}` : `https://wa.me/?text=${text}`;
    },
  };
}

/** Fill slots again after a script draws new content that contains them. */
export function refreshSiteSlots(cfg) { fillSiteSlots(contact(cfg)); }

/** Fill <span data-site="phone">[PHONE]</span> style slots in static pages. */
function fillSiteSlots(c) {
  // FSSAI lines are hidden in the HTML and shown once SITE.fssai has a real number
  $$('[data-fssai-line]').forEach((el) => { el.hidden = isPlaceholder(c.fssai); });
  $$('[data-site]').forEach((el) => {
    const key = el.dataset.site;
    const value = { phone: c.phone, whatsapp: c.whatsapp ? `+${c.whatsapp}` : SITE.whatsapp, email: c.email, address: c.address,
      fssai: c.fssai, deliveryAreas: SITE.deliveryAreas, deliveryDays: SITE.deliveryDays, referralReward: SITE.referralReward,
      businessName: SITE.businessName }[key];
    if (value != null && !isPlaceholder(value)) el.textContent = value;
    if (key === 'whatsapp-review') {
      el.href = c.waHref('Hi Gotti Farms, here is my review of my order: ');
      return;
    }
    if (el.tagName === 'A') {
      if (key === 'phone') el.href = c.phoneHref;
      if (key === 'email' && !isPlaceholder(c.email)) el.href = `mailto:${c.email}`;
      if (key === 'whatsapp') { el.href = c.waHref(); el.target = '_blank'; el.rel = 'noopener'; }
    }
  });
}

// ---------- Cart (stored in the browser; prices re-checked by the server) ----------
// Each line is one product + one weight option: { id, opt, size, qty, name, price, unit, image }.
const CART_KEY = 'gf_cart';
const sameLine = (i, id, opt) => i.id === id && (i.opt || '') === (opt || '');
export const cart = {
  items() { return storageGet(CART_KEY, []).map((i) => ({ opt: '', size: 1, ...i })); },
  save(items) { storageSet(CART_KEY, items); updateCartBadge(true); document.dispatchEvent(new CustomEvent('cart:change')); },
  qty(id, opt = '') { return this.items().find((i) => sameLine(i, id, opt))?.qty || 0; },
  count() { return this.items().reduce((n, i) => n + i.qty, 0); },
  /** Set the quantity of one product option. option = { label, size, price } (from productOptions). */
  set(product, qty, option = productOptions(product)[0]) {
    const opt = option?.label || '';
    const items = this.items();
    const idx = items.findIndex((i) => sameLine(i, product.id, opt));
    if (qty <= 0) {
      if (idx >= 0) items.splice(idx, 1);
    } else {
      const entry = {
        id: product.id, opt, size: option?.size || 1, qty: Math.min(qty, 99), name: product.name,
        price: option?.price ?? product.price, unit: product.unit, image: product.image,
      };
      if (idx >= 0) items[idx] = entry; else items.push(entry);
    }
    this.save(items);
  },
  remove(id, opt = '') { this.save(this.items().filter((i) => !sameLine(i, id, opt))); },
  clear() { this.save([]); },
};

// Orders placed or looked up on this device, so "My Orders" can show them without typing.
const ORDERS_KEY = 'gf_my_orders';
export const myOrders = {
  list() { return storageGet(ORDERS_KEY, []); },
  add(no, phone) {
    if (!no || !phone) return;
    const rest = this.list().filter((o) => o.no !== no);
    storageSet(ORDERS_KEY, [{ no, phone }, ...rest].slice(0, 20));
  },
  remove(no) { storageSet(ORDERS_KEY, this.list().filter((o) => o.no !== no)); },
};

const WISH_KEY = 'gf_saved';
export const saved = {
  ids() { return storageGet(WISH_KEY, []); },
  has(id) { return this.ids().includes(id); },
  toggle(id) { const ids = this.ids(); const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]; storageSet(WISH_KEY, next); return next.includes(id); },
};

function updateCartBadge(bump = false) {
  const el = $('#cart-count');
  if (!el) return;
  el.textContent = cart.count();
  if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
}

// ---------- Toast ----------
let toastTimer;
export function toast(html) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.innerHTML = html;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ---------- Header & footer ----------
const NAV = [
  ['/', 'Home', 'home'],
  ['/shop', 'Products', 'shop'],
  ['/about', 'About Us', 'about'],
  ['/recipes', 'Recipes', 'recipes'],
  ['/blog', 'Farmer Tips', 'blog'],
  ['/track', 'My Orders', 'track'],
  ['/contact', 'Contact', 'contact'],
];

const pinIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';

export function fillIcons(root = document) {
  $$('[data-icon]', root).forEach((el) => { if (!el.firstChild && icon[el.dataset.icon]) el.innerHTML = icon[el.dataset.icon]; });
}

function socialLinks() {
  const links = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube']].filter(([k]) => SITE[k]);
  return links.map(([k, label]) => `<a href="${esc(SITE[k])}" target="_blank" rel="noopener" aria-label="${label}">${icon[k]}</a>`).join('');
}

function langButton() {
  const te = currentLang() === 'te';
  return `<button class="lang-switch" type="button" id="lang-switch" lang="${te ? 'en' : 'te'}"
    aria-label="${te ? 'Switch to English' : 'తెలుగులో చూడండి'}">${te ? 'English' : 'తెలుగు'}</button>`;
}

let layoutStarted = false;

export async function renderLayout(active) {
  fillIcons();
  if (!layoutStarted) {
    layoutStarted = true;
    startI18n();
    document.addEventListener('lang:change', () => { const slot = $('#lang-slot-header'); if (slot) slot.innerHTML = langButton(); });
  }
  const cfg = await getConfig();
  const c = contact(cfg);
  const freeAbove = money(cfg.freeDeliveryAbove);
  const header = $('#site-header');
  if (header) {
    header.innerHTML = `
      <div class="topbar"><div class="wrap">
        <div class="topbar-info"><span class="topbar-offer">${icon.truck} ${tr('Free delivery on orders above {amount}', { amount: freeAbove })}</span></div>
        <div class="topbar-info topbar-contact">
          <a href="${esc(c.phoneHref)}" aria-label="Call us">${icon.phone} <span>${esc(c.phone)}</span></a>
          <a href="${esc(c.waHref())}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon.whatsapp} <span>WhatsApp</span></a>
          <a class="hide-sm" href="${isPlaceholder(c.email) ? '#' : `mailto:${esc(c.email)}`}">${icon.mail} ${esc(c.email)}</a>
          <a class="hide-md topbar-address" href="/contact">${pinIcon} ${esc(c.address)}</a>
          ${socialLinks() ? `<span class="topbar-social">${socialLinks()}</span>` : ''}
        </div>
      </div></div>
      <div class="site-header"><div class="wrap">
        <button class="icon-btn menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="main-nav">${icon.menu}</button>
        <a class="logo" href="/" aria-label="${esc(SITE.businessName)} home">${logoMark}<span class="logo-text"><b>GOTTI</b><small>FARMS</small></span></a>
        <nav class="main-nav" id="main-nav" aria-label="Main">
          ${NAV.map(([href, label, key]) => `<a href="${href}" ${key === active ? 'aria-current="page"' : ''}>${tr(label)}</a>`).join('')}
        </nav>
        <form class="header-search" action="/shop" role="search">
          <label class="sr-only" for="hdr-q">Search products</label>
          <input id="hdr-q" name="q" type="search" placeholder="Search products…" data-i18n-placeholder="Search products…" value="${esc(new URLSearchParams(location.search).get('q') || '')}">
          <button aria-label="Search">${icon.search}</button>
        </form>
        <div class="header-icons">
          <span id="lang-slot-header">${langButton()}</span>
          <a class="icon-btn" href="/track" aria-label="My orders">${icon.user}</a>
          <a class="icon-btn" href="/cart" aria-label="Cart">${icon.cart}<span class="cart-count" id="cart-count">0</span></a>
        </div>
      </div></div>`;
    const toggle = $('.menu-toggle', header);
    const nav = $('#main-nav', header);
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });
    header.addEventListener('click', (e) => {
      if (!e.target.closest('#lang-switch')) return;
      setLang(currentLang() === 'te' ? 'en' : 'te');
      $('#lang-switch')?.focus();
    });
    updateCartBadge();
  }

  const footer = $('#site-footer');
  if (footer) {
    footer.innerHTML = `
      <footer class="site-footer" id="contact">
        <div class="wrap">
          <div>
            <a class="logo" href="/">${logoMark}<span class="logo-text"><b>GOTTI</b><small>FARMS</small></span></a>
            <p>${tr('Naturally grown produce from our fields and partner farmers, delivered straight to your home.')}</p>
            ${isPlaceholder(c.fssai) ? '' : `<p class="fssai">${tr('FSSAI Lic. No.')} <span>${esc(c.fssai)}</span></p>`}
            ${socialLinks() ? `<div class="footer-social">${socialLinks()}</div>` : ''}
          </div>
          <div><h4>${tr('Shop')}</h4><ul>
            <li><a href="/shop?category=rice">${tr('Rice')}</a></li>
            <li><a href="/shop?category=vegetables">${tr('Vegetables')}</a></li>
            <li><a href="/shop?category=turmeric">${tr('Turmeric')}</a></li>
            <li><a href="/shop?category=groundnut">${tr('Groundnut')}</a></li>
            <li><a href="/shop?category=seeds">${tr('Seeds')}</a></li>
            <li><a href="/shop?category=plants">${tr('Plants')}</a></li>
          </ul></div>
          <div><h4>${tr('Company')}</h4><ul>
            <li><a href="/about">${tr('About Us')}</a></li>
            <li><a href="/contact">${tr('Contact Us')}</a></li>
            <li><a href="/recipes">${tr('Recipes')}</a></li>
            <li><a href="/blog">${tr('Farmer Tips')}</a></li>
            <li><a href="/track">${tr('My Orders')}</a></li>
          </ul></div>
          <div><h4>${tr('Policies')}</h4><ul>
            <li><a href="/shipping-policy">${tr('Shipping Policy')}</a></li>
            <li><a href="/refund-policy">${tr('Refund and Return Policy')}</a></li>
            <li><a href="/privacy-policy">${tr('Privacy Policy')}</a></li>
            <li><a href="/terms">${tr('Terms and Conditions')}</a></li>
          </ul></div>
          <div><h4>${tr('Contact Us')}</h4><ul class="footer-contact">
            <li><a href="${esc(c.phoneHref)}">${icon.phone} ${esc(c.phone)}</a></li>
            <li><a href="${esc(c.waHref())}" target="_blank" rel="noopener">${icon.whatsapp} WhatsApp ${c.whatsapp ? `+${esc(c.whatsapp)}` : esc(SITE.whatsapp)}</a></li>
            <li><a href="${isPlaceholder(c.email) ? '#' : `mailto:${esc(c.email)}`}">${icon.mail} ${esc(c.email)}</a></li>
            <li><span>${pinIcon} ${esc(c.address)}</span></li>
          </ul></div>
        </div>
        <div class="footer-bottom">© ${new Date().getFullYear()} ${esc(SITE.businessName)}. ${tr('All rights reserved.')}${isPlaceholder(c.fssai) ? '' : ` · ${tr('FSSAI Lic. No.')} ${esc(c.fssai)}`}</div>
      </footer>`;
  }

  // Floating "Order on WhatsApp" button (every page)
  if (!$('#wa-fab')) {
    const a = document.createElement('a');
    a.id = 'wa-fab';
    a.className = 'whatsapp-fab';
    a.href = c.waHref();
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = `${icon.whatsapp}<span>${tr('Order on WhatsApp')}</span>`;
    document.body.append(a);
  }

  fillSiteSlots(c);
  applyI18n(document);
  loadAnalytics();
  if (!['cart', 'admin'].includes(active)) setTimeout(() => firstOrderOffer(cfg), 0);
  return cfg;
}

// Keep the badge in sync across tabs
window.addEventListener('storage', (e) => { if (e.key === CART_KEY) { updateCartBadge(); document.dispatchEvent(new CustomEvent('cart:change')); } });

// ---------- Google Analytics (only when SITE.gaId is filled in) ----------
function loadAnalytics() {
  if (isPlaceholder(SITE.gaId) || window.gtag) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(SITE.gaId)}`;
  document.head.append(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
  window.gtag('js', new Date());
  window.gtag('config', SITE.gaId);
}

// ---------- First-order offer pop-up ----------
// Shows once per visitor (after 15 seconds or half a page of scrolling), never on the cart/checkout page.
const OFFER_KEY = 'gf_offer_seen';
function firstOrderOffer(cfg) {
  const offer = cfg.firstOrder;
  if (!offer?.percent || storageGet(OFFER_KEY, false) || !window.HTMLDialogElement) return;
  let shown = false;
  const show = () => {
    if (shown || document.querySelector('dialog[open]')) return;
    shown = true;
    storageSet(OFFER_KEY, true);
    window.removeEventListener('scroll', onScroll);
    const dlg = document.createElement('dialog');
    dlg.className = 'offer-dialog';
    dlg.setAttribute('aria-labelledby', 'offer-title');
    dlg.innerHTML = `
      <button class="offer-close" type="button" aria-label="Close" data-close>×</button>
      <div class="offer-badge">${icon.leaf}</div>
      <h2 id="offer-title">${tr('Get {percent}% off your first order', { percent: offer.percent })}</h2>
      <p>${tr('Share your WhatsApp number or email and we will send you the discount code and fresh harvest updates.')}</p>
      <form id="offer-form" novalidate>
        <label class="sr-only" for="offer-contact">WhatsApp number or email</label>
        <input class="input" id="offer-contact" name="contact" autocomplete="tel" placeholder="WhatsApp number or email" data-i18n-placeholder="WhatsApp number or email" required>
        <div id="offer-alert"></div>
        <button class="btn btn-primary btn-block" type="submit">${tr('Get my discount')}</button>
      </form>
      <button class="link-btn offer-skip" type="button" data-close>${tr('No thanks')}</button>
      <p class="offer-fine">${tr('Up to {max} off. One use per customer, first order only.', { max: money(offer.maxDiscount) })}</p>`;
    document.body.append(dlg);
    applyI18n(dlg);
    dlg.showModal();
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
    dlg.addEventListener('close', () => dlg.remove());
    $('#offer-form', dlg).addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.submitter || $('button[type="submit"]', dlg);
      btn.disabled = true;
      try {
        const r = await api('/api/leads', { method: 'POST', body: { contact: $('#offer-contact', dlg).value, source: 'first-order-popup' } });
        $('#offer-form', dlg).outerHTML = `<div class="offer-code">
            <p>${tr('Your code')}</p>
            <b id="offer-code">${esc(r.code)}</b>
            <button class="btn btn-outline btn-sm" type="button" id="copy-code">${tr('Copy code')}</button>
            <p class="muted">${tr('Enter it at checkout. It works on your first order.')}</p></div>`;
        $('.offer-skip', dlg).textContent = t('Start shopping');
        $('#copy-code', dlg).addEventListener('click', () => {
          navigator.clipboard?.writeText(r.code).then(() => toast(t('Code copied'))).catch(() => {});
        });
        try { localStorage.setItem('gf_offer_code', r.code); } catch { /* ignore */ }
      } catch (err) {
        $('#offer-alert', dlg).innerHTML = `<div class="alert alert-error" role="alert">${esc(err.message)}</div>`;
        btn.disabled = false;
      }
    });
  };
  const onScroll = () => { if (window.scrollY > document.documentElement.scrollHeight * 0.4) show(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  setTimeout(show, 15000);
}

// ---------- Product cards ----------
export function productCard(p, opts = {}) {
  const o = productOptions(p)[0];
  return productCardHtml(p, { isSaved: saved.has(p.id), qty: cart.qty(p.id, o.label), ...opts });
}

function selectedOption(card, p) {
  const sel = $('[data-opt]', card);
  const list = productOptions(p);
  return list[Number(sel?.value) || 0] || list[0];
}

function renderCardAction(card, p) {
  const o = selectedOption(card, p);
  const box = $('.product-actions', card);
  const qty = cart.qty(p.id, o.label);
  const key = `${o.label}|${qty}`;
  if (box.dataset.key === key) return; // nothing changed
  box.dataset.key = key;
  box.innerHTML = cardActionHtml(p, qty, o);
  $('.price', card).innerHTML = cardPriceHtml(p, o);
}

/**
 * Render products into a grid and wire up cart + save buttons.
 * With { hydrate: true } the cards are already in the page (drawn by the server),
 * so they are kept as they are and only the buttons are brought to life.
 */
export function mountProducts(grid, products, { hydrate = false } = {}) {
  if (!hydrate) grid.innerHTML = products.map((p) => productCard(p)).join('');
  const byId = new Map(products.map((p) => [p.id, p]));
  const refresh = () => $$('.product-card', grid).forEach((card) => {
    const p = byId.get(Number(card.dataset.id));
    if (p) renderCardAction(card, p);
  });
  if (hydrate) $$('.product-card .heart', grid).forEach((h) => h.setAttribute('aria-pressed', saved.has(Number(h.closest('.product-card').dataset.id))));
  refresh();
  if (!grid.dataset.wired) {
    grid.dataset.wired = '1';
    grid.addEventListener('change', (e) => {
      const sel = e.target.closest('[data-opt]');
      if (!sel) return;
      const card = sel.closest('.product-card');
      const p = grid._products.get(Number(card.dataset.id));
      if (p) renderCardAction(card, p);
    });
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (!card) return;
      const p = grid._products.get(Number(card.dataset.id));
      if (!p) return;
      const heart = e.target.closest('.heart');
      if (heart) {
        const on = saved.toggle(p.id);
        heart.setAttribute('aria-pressed', on);
        toast(on ? `${t('Saved')}: ${esc(p.name)}` : `${t('Removed from saved')}: ${esc(p.name)}`);
        grid.dispatchEvent(new CustomEvent('saved:change'));
        return;
      }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      const o = selectedOption(card, p);
      const q = cart.qty(p.id, o.label);
      const maxQty = Math.min(Math.floor(p.stock / o.size), 99);
      if (act === 'add') cart.set(p, 1, o);
      if (act === 'inc') cart.set(p, Math.min(q + 1, maxQty), o);
      if (act === 'dec') cart.set(p, q - 1, o);
      if (act === 'add') toast(`${t('Added to cart')}: ${esc(p.name)}${o.label ? ` (${esc(o.label)})` : ''} <a href="/cart">${t('View cart')}</a>`);
      renderCardAction(card, p);
      const focusTarget = $(`[data-act="${act === 'add' ? 'inc' : act}"]:not(:disabled)`, card) || $('[data-act]', card);
      focusTarget?.focus();
    });
    document.addEventListener('cart:change', () => grid._refresh?.());
  }
  grid._products = byId;
  grid._refresh = refresh;
}

/** Data the server put into the page (see render.js ssrDataScript), or null. */
export function ssrData() {
  try { return JSON.parse(document.getElementById('ssr-data')?.textContent || 'null'); } catch { return null; }
}

/** Short text describing one order line: "2 × 5 kg" or "3 kg". */
export function itemQtyText(it) {
  return it.option_label ? `${it.qty} × ${it.option_label}` : `${it.qty} ${it.unit}`;
}

/** Load Razorpay Checkout script on demand. */
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window. Check your internet connection and try again.'));
    document.head.append(s);
  });
}

/**
 * Open Razorpay for an order. Resolves with the verified order, or rejects
 * with { dismissed: true } if the customer closes the window.
 */
export async function payWithRazorpay(payment, orderNumber) {
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      name: payment.name,
      description: `Order ${orderNumber}`,
      order_id: payment.razorpayOrderId,
      prefill: payment.prefill,
      notes: { order_number: orderNumber },
      theme: { color: '#1f5c32' },
      handler: async (resp) => {
        try {
          const { order } = await api('/api/payments/verify', { method: 'POST', body: resp });
          resolve(order);
        } catch (err) { reject(err); }
      },
      modal: { ondismiss: () => reject(Object.assign(new Error('Payment was not completed.'), { dismissed: true })) },
    });
    rzp.on('payment.failed', (r) => toast(esc(r?.error?.description || 'Payment failed. Try another method.')));
    rzp.open();
  });
}

export const STATUS_LABEL = {
  pending_payment: 'Awaiting payment', confirmed: 'Confirmed', packed: 'Packed', shipped: 'Out for delivery',
  delivered: 'Delivered', cancelled: 'Cancelled',
};
export const PAYMENT_LABEL = { pending: 'Not paid', paid: 'Paid', failed: 'Failed', cod: 'Pay on delivery' };
export { productUrl, productOptions };
