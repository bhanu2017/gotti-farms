// Shared code for every page: API helper, cart, header/footer, product cards.

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

// ---------- Helpers ----------
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Format paise as rupees: 12000 -> "₹120", 12050 -> "₹120.50" */
export function money(paise) {
  const r = (paise || 0) / 100;
  return '₹' + r.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(r) ? 0 : 2, maximumFractionDigits: 2 });
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
  store: { name: 'Gotti Farms', phone: '', email: '' }, deliveryFee: 4000, freeDeliveryAbove: 49900, codEnabled: true, onlinePaymentEnabled: false,
})));

function storageGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

// ---------- Cart (stored in the browser; prices re-checked by the server) ----------
const CART_KEY = 'gf_cart';
export const cart = {
  items() { return storageGet(CART_KEY, []); },
  save(items) { storageSet(CART_KEY, items); updateCartBadge(true); document.dispatchEvent(new CustomEvent('cart:change')); },
  qty(id) { return this.items().find((i) => i.id === id)?.qty || 0; },
  count() { return this.items().reduce((n, i) => n + i.qty, 0); },
  set(product, qty) {
    const items = this.items();
    const idx = items.findIndex((i) => i.id === product.id);
    if (qty <= 0) {
      if (idx >= 0) items.splice(idx, 1);
    } else {
      const entry = { id: product.id, qty: Math.min(qty, 99), name: product.name, price: product.price, unit: product.unit, image: product.image };
      if (idx >= 0) items[idx] = entry; else items.push(entry);
    }
    this.save(items);
  },
  remove(id) { this.save(this.items().filter((i) => i.id !== id)); },
  clear() { this.save([]); },
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
  ['/#about', 'About Us', 'about'],
  ['/shop', 'Products', 'shop'],
  ['/#process', 'Farming', 'farming'],
  ['/blog', 'Farmer Tips', 'blog'],
  ['/track', 'Track Order', 'track'],
  ['#contact', 'Contact', 'contact'],
];

export function fillIcons(root = document) {
  $$('[data-icon]', root).forEach((el) => { if (!el.firstChild && icon[el.dataset.icon]) el.innerHTML = icon[el.dataset.icon]; });
}

export async function renderLayout(active) {
  fillIcons();
  const cfg = await getConfig();
  const s = cfg.store;
  const freeAbove = money(cfg.freeDeliveryAbove);
  const header = $('#site-header');
  if (header) {
    header.innerHTML = `
      <div class="topbar"><div class="wrap">
        <div class="topbar-info"><span style="display:inline-flex;gap:6px;align-items:center">${icon.truck} Free delivery on orders above ${freeAbove}</span></div>
        <div class="topbar-info">
          ${s.phone ? `<a href="tel:${esc(s.phone.replace(/\s/g, ''))}">${icon.phone} ${esc(s.phone)}</a>` : ''}
          ${s.email ? `<a class="hide-sm" href="mailto:${esc(s.email)}">${icon.mail} ${esc(s.email)}</a>` : ''}
          <span class="topbar-social">
            <a href="#" aria-label="Facebook">${icon.facebook}</a>
            <a href="#" aria-label="Instagram">${icon.instagram}</a>
            <a href="#" aria-label="YouTube">${icon.youtube}</a>
          </span>
        </div>
      </div></div>
      <div class="site-header"><div class="wrap">
        <button class="icon-btn menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="main-nav">${icon.menu}</button>
        <a class="logo" href="/" aria-label="${esc(s.name)} home">${logoMark}<span class="logo-text"><b>GOTTI</b><small>FARMS</small></span></a>
        <nav class="main-nav" id="main-nav" aria-label="Main">
          ${NAV.map(([href, label, key]) => `<a href="${href}" ${key === active ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
        </nav>
        <form class="header-search" action="/shop" role="search">
          <label class="sr-only" for="hdr-q">Search products</label>
          <input id="hdr-q" name="q" type="search" placeholder="Search products…" value="${esc(new URLSearchParams(location.search).get('q') || '')}">
          <button aria-label="Search">${icon.search}</button>
        </form>
        <div class="header-icons">
          <a class="icon-btn" href="/track" aria-label="Track your order">${icon.user}</a>
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
    updateCartBadge();
  }

  const footer = $('#site-footer');
  if (footer) {
    footer.innerHTML = `
      <footer class="site-footer" id="contact">
        <div class="wrap">
          <div>
            <a class="logo" href="/">${logoMark}<span class="logo-text"><b>GOTTI</b><small>FARMS</small></span></a>
            <p>Naturally grown produce from our fields and partner farmers, delivered straight to your home.</p>
          </div>
          <div><h4>Shop</h4><ul>
            <li><a href="/shop?category=vegetables">Vegetables</a></li>
            <li><a href="/shop?category=grains">Grains</a></li>
            <li><a href="/shop?category=fruits">Fruits</a></li>
            <li><a href="/shop?category=seeds">Seeds &amp; plants</a></li>
          </ul></div>
          <div><h4>Help</h4><ul>
            <li><a href="/blog">Farmer tips (English / తెలుగు)</a></li>
            <li><a href="/track">Track your order</a></li>
            <li><a href="/cart">Your cart</a></li>
            <li><a href="/#about">About the farm</a></li>
          </ul></div>
          <div><h4>Contact us</h4><ul>
            ${s.phone ? `<li><a href="tel:${esc(s.phone.replace(/\s/g, ''))}">${esc(s.phone)}</a></li>` : ''}
            ${s.email ? `<li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>` : ''}
            ${s.whatsapp ? `<li><a href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener">Chat on WhatsApp</a></li>` : ''}
          </ul></div>
        </div>
        <div class="footer-bottom">© ${new Date().getFullYear()} ${esc(s.name)}. All rights reserved.</div>
      </footer>
      ${s.whatsapp ? `<a class="whatsapp-fab" href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">${icon.whatsapp}</a>` : ''}`;
  }
  return cfg;
}

// Keep the badge in sync across tabs
window.addEventListener('storage', (e) => { if (e.key === CART_KEY) { updateCartBadge(); document.dispatchEvent(new CustomEvent('cart:change')); } });

// ---------- Product card ----------
export function productCard(p) {
  return `
    <article class="product-card" data-id="${p.id}">
      <div class="product-media">
        <img src="${esc(p.image || '/images/placeholder.svg')}" alt="${esc(p.name)}" loading="lazy" width="300" height="246">
        <button class="heart" type="button" aria-label="Save ${esc(p.name)}" aria-pressed="${saved.has(p.id)}">${icon.heart}</button>
        ${p.stock <= 0 ? '<span class="stock-flag">Out of stock</span>' : p.stock <= 5 ? `<span class="stock-flag">Only ${p.stock} left</span>` : ''}
      </div>
      <div class="product-info">
        <h3>${esc(p.name)}</h3>
        <div class="price">${money(p.price)} <small>/ ${esc(p.unit)}</small></div>
        <div class="product-actions"></div>
      </div>
    </article>`;
}

function renderCardAction(card, p) {
  const box = $('.product-actions', card);
  const qty = cart.qty(p.id);
  if (box.dataset.qty === String(qty)) return; // nothing changed
  box.dataset.qty = qty;
  if (p.stock <= 0) {
    box.innerHTML = `<button class="add-btn" type="button" disabled>Out of stock</button>`;
  } else if (qty === 0) {
    box.innerHTML = `<button class="add-btn" type="button" data-act="add">${icon.cartOutline} Add to Cart</button>`;
  } else {
    box.innerHTML = `<div class="stepper" role="group" aria-label="Quantity of ${esc(p.name)}">
      <button type="button" data-act="dec" aria-label="Remove one">−</button>
      <output aria-live="polite">${qty} ${esc(p.unit)}</output>
      <button type="button" data-act="inc" aria-label="Add one" ${qty >= Math.min(p.stock, 99) ? 'disabled' : ''}>+</button></div>`;
  }
}

/** Render products into a grid and wire up cart + save buttons. */
export function mountProducts(grid, products) {
  grid.innerHTML = products.map(productCard).join('');
  const byId = new Map(products.map((p) => [p.id, p]));
  const refresh = () => $$('.product-card', grid).forEach((card) => renderCardAction(card, byId.get(Number(card.dataset.id))));
  refresh();
  if (!grid.dataset.wired) {
    grid.dataset.wired = '1';
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (!card) return;
      const p = grid._products.get(Number(card.dataset.id));
      const heart = e.target.closest('.heart');
      if (heart) {
        const on = saved.toggle(p.id);
        heart.setAttribute('aria-pressed', on);
        toast(on ? `Saved ${esc(p.name)}` : `Removed ${esc(p.name)} from saved`);
        grid.dispatchEvent(new CustomEvent('saved:change'));
        return;
      }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      const q = cart.qty(p.id);
      if (act === 'add') { cart.set(p, 1); toast(`Added ${esc(p.name)} to cart <a href="/cart">View cart</a>`); }
      if (act === 'inc') cart.set(p, Math.min(q + 1, p.stock));
      if (act === 'dec') cart.set(p, q - 1);
      renderCardAction(card, p);
      const focusTarget = $(`[data-act="${act === 'add' ? 'inc' : act}"]:not(:disabled)`, card) || $('[data-act]', card);
      focusTarget?.focus();
    });
    document.addEventListener('cart:change', () => grid._refresh?.());
  }
  grid._products = byId;
  grid._refresh = refresh;
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
