import { renderLayout, api, esc, money, icon, cart, toast, myOrders, payWithRazorpay, STATUS_LABEL, PAYMENT_LABEL, $, toDate } from '/js/app.js';

renderLayout('track');
const root = $('#track-root');
const params = new URLSearchParams(location.search);
const TRACK_STEPS = ['confirmed', 'packed', 'shipped', 'delivered'];

const fmtDate = (s) => toDate(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const statusPill = (o) => `<span class="pill ${o.order_status === 'cancelled' ? 'bad' : o.order_status === 'pending_payment' ? 'warn-pill' : ''}">${STATUS_LABEL[o.order_status]}</span>`;
const paymentPill = (o) => `<span class="pill ${o.payment_status === 'paid' ? '' : o.payment_status === 'cod' ? 'neutral' : 'warn-pill'}">${PAYMENT_LABEL[o.payment_status]}</span>`;
const phoneFor = (no) => myOrders.list().find((o) => o.no === no)?.phone;

// ---------- Order again: put the same products back in the cart ----------
async function orderAgain(order, button) {
  if (button) button.disabled = true;
  try {
    const ids = [...new Set(order.items.map((i) => i.product_id))];
    const products = new Map((await api(`/api/products?ids=${ids.join(',')}`)).map((p) => [p.id, p]));
    let added = 0; let missing = 0;
    for (const it of order.items) {
      const p = products.get(it.product_id);
      if (!p || p.stock <= 0) { missing++; continue; }
      cart.set(p, Math.min(cart.qty(p.id) + it.qty, p.stock, 99));
      added++;
    }
    if (!added) { toast('These products are not available right now.'); return; }
    if (missing) sessionStorage.setItem('gf_cart_note', `${missing} item${missing > 1 ? 's' : ''} from your earlier order ${missing > 1 ? 'are' : 'is'} not available right now, so ${missing > 1 ? 'they were' : 'it was'} not added.`);
    location.href = '/cart';
  } catch (err) {
    toast(esc(err.message));
  } finally {
    if (button) button.disabled = false;
  }
}

// ---------- List of the customer's orders ----------
function orderCard(o) {
  const shown = o.items.slice(0, 4);
  const more = o.items.length - shown.length;
  return `
    <article class="order-card">
      <div class="order-card-head">
        <div>
          <h2>Order ${esc(o.order_number)}</h2>
          <span class="muted small">Placed ${esc(fmtDate(o.created_at))}</span>
        </div>
        <div class="pill-row">${statusPill(o)} ${paymentPill(o)}</div>
      </div>
      <ul class="order-products">
        ${shown.map((it) => `<li>
          <img src="${esc(it.image || '/images/placeholder.svg')}" alt="" loading="lazy">
          <span><b>${esc(it.name)}</b><span class="muted small">${it.qty} ${esc(it.unit)} × ${money(it.price)}</span></span>
        </li>`).join('')}
        ${more > 0 ? `<li class="more muted">+ ${more} more item${more > 1 ? 's' : ''}</li>` : ''}
      </ul>
      <div class="order-card-foot">
        <span>Total <b>${money(o.total)}</b></span>
        <div class="pill-row">
          <a class="btn btn-outline btn-sm" href="/track?order=${encodeURIComponent(o.order_number)}">View details</a>
          <button class="btn btn-primary btn-sm" type="button" data-again="${esc(o.order_number)}">Order again</button>
        </div>
      </div>
    </article>`;
}

function lookupPanel(prefill = {}, error = '', { compact = false } = {}) {
  return `
    <div class="panel lookup-panel">
      <h2 style="font-size:${compact ? '1.15rem' : '1.5rem'}">${compact ? 'Find another order' : 'Find your order'}</h2>
      <p class="muted">Enter the order number from your confirmation and the mobile number you ordered with.</p>
      ${error ? `<div class="alert alert-error" role="alert">${esc(error)}</div>` : ''}
      <form id="lookup" class="form-grid">
        <div class="field"><label for="t-no">Order number</label><input class="input" id="t-no" name="no" placeholder="e.g. GF261001-AB3CD" required value="${esc(prefill.no)}"></div>
        <div class="field"><label for="t-phone">Mobile number</label><input class="input" id="t-phone" name="phone" type="tel" inputmode="numeric" required value="${esc(prefill.phone)}"></div>
        <div class="full"><button class="btn btn-primary">Find order</button></div>
      </form>
    </div>`;
}

function wireLookup() {
  $('#lookup')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    loadOne(d.no.trim().toUpperCase(), d.phone.trim(), { fromLookup: true });
  });
}

async function showList(error = '', prefill = {}) {
  document.title = 'My Orders | Gotti Farms';
  history.replaceState(null, '', location.pathname);
  const remembered = myOrders.list();
  if (!remembered.length) {
    root.innerHTML = `<h1 class="orders-title">My Orders</h1>
      <p class="muted">Orders you place on this phone or computer will appear here automatically.</p>
      ${lookupPanel(prefill, error)}`;
    wireLookup();
    return;
  }
  root.innerHTML = '<h1 class="orders-title">My Orders</h1><p class="muted">Loading your orders…</p>';
  let orders = [];
  try {
    orders = await api('/api/orders/mine', { method: 'POST', body: { orders: remembered.map((o) => ({ orderNumber: o.no, phone: o.phone })) } });
  } catch (err) {
    root.innerHTML = `<h1 class="orders-title">My Orders</h1><div class="alert alert-error">${esc(err.message)}</div>${lookupPanel(prefill, error, { compact: true })}`;
    wireLookup();
    return;
  }
  // Forget remembered orders that no longer exist
  const found = new Set(orders.map((o) => o.order_number));
  remembered.filter((o) => !found.has(o.no)).forEach((o) => myOrders.remove(o.no));

  root.innerHTML = `
    <h1 class="orders-title">My Orders</h1>
    <p class="muted">${orders.length ? `${orders.length} order${orders.length === 1 ? '' : 's'} placed on this device.` : 'No orders found on this device yet.'}</p>
    <div class="order-list">${orders.map(orderCard).join('')}</div>
    ${lookupPanel(prefill, error, { compact: orders.length > 0 })}`;
  wireLookup();
  root.querySelectorAll('[data-again]').forEach((b) => b.addEventListener('click', () => {
    orderAgain(orders.find((o) => o.order_number === b.dataset.again), b);
  }));
}

// ---------- One order in detail ----------
function orderView(o, phone, justPlaced) {
  const awaiting = o.order_status === 'pending_payment';
  const cancelled = o.order_status === 'cancelled';
  const reached = TRACK_STEPS.indexOf(o.order_status);
  document.title = `Order ${o.order_number} | Gotti Farms`;
  root.innerHTML = `
    <p><a class="link-arrow back-link" href="/track">← All my orders</a></p>
    ${justPlaced && !awaiting ? `<div class="order-hero">
      <div class="check">${icon.check}</div>
      <h1 style="font-size:1.8rem">Thank you, ${esc(o.customer_name.split(' ')[0])}! Your order is confirmed.</h1>
      <p class="muted">Your order number is <b>${esc(o.order_number)}</b>. You can find this order any time under <a href="/track">My Orders</a>.</p></div>` : ''}
    <div class="panel">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:start">
        <div><h2 style="margin:0">Order ${esc(o.order_number)}</h2><div class="muted">Placed ${esc(fmtDate(o.created_at))}</div></div>
        <div class="pill-row">${statusPill(o)} ${paymentPill(o)}</div>
      </div>
      ${awaiting ? `<div class="alert alert-info" style="margin-top:16px">This order is waiting for payment. It will be confirmed as soon as payment goes through.
          <div style="margin-top:10px"><button class="btn btn-primary" id="pay-now" type="button">Pay ${money(o.total)} now</button></div></div>
          <div id="pay-alert"></div>` : ''}
      ${!awaiting && !cancelled ? `<ol class="status-track" style="grid-template-columns:repeat(4,1fr);margin-top:22px">
          ${TRACK_STEPS.map((s, i) => `<li class="${i <= reached ? 'done' : ''}">${STATUS_LABEL[s]}</li>`).join('')}</ol>` : ''}
    </div>
    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <h2 style="margin:0">Products in this order</h2>
        <button class="btn btn-outline btn-sm" type="button" id="again">Order again</button>
      </div>
      ${o.items.map((it) => `<div class="cart-line" style="grid-template-columns:56px 1fr auto">
        <img src="${esc(it.image || '/images/placeholder.svg')}" alt="" style="width:56px;height:56px">
        <div><h3>${esc(it.name)}</h3><div class="muted">${it.qty} ${esc(it.unit)} × ${money(it.price)}</div></div>
        <b>${money(it.line_total)}</b></div>`).join('')}
      <div class="summary" style="position:static;margin-top:14px"><dl>
        <dt>Subtotal</dt><dd>${money(o.subtotal)}</dd>
        <dt>Delivery</dt><dd>${o.delivery_fee ? money(o.delivery_fee) : 'Free'}</dd>
        <dt class="total">Total</dt><dd class="total">${money(o.total)}</dd></dl></div>
    </div>
    <div class="panel">
      <h2>Delivering to</h2>
      <p style="margin:0">${esc(o.customer_name)}<br>${esc(o.address)}<br>${esc(o.city)}, ${esc(o.state)} ${esc(o.pincode)}</p>
    </div>
    <p style="text-align:center"><a class="btn btn-outline" href="/shop">Continue shopping</a></p>`;

  $('#again').addEventListener('click', (e) => orderAgain(o, e.currentTarget));
  $('#pay-now')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const { payment } = await api('/api/orders/pay', { method: 'POST', body: { orderNumber: o.order_number, phone } });
      const paidOrder = await payWithRazorpay(payment, o.order_number);
      orderView(paidOrder, phone, true);
    } catch (err) {
      if (!err.dismissed) $('#pay-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}

async function loadOne(no, phone, { fromLookup = false } = {}) {
  root.innerHTML = '<p class="muted">Looking up your order…</p>';
  try {
    const order = await api('/api/orders/lookup', { method: 'POST', body: { orderNumber: no, phone } });
    myOrders.add(order.order_number, phone);
    history.replaceState(null, '', `?order=${encodeURIComponent(order.order_number)}`);
    orderView(order, phone, !fromLookup && params.get('placed') === '1');
  } catch (err) {
    showList(err.message, { no, phone });
  }
}

// ---------- Start ----------
const wanted = (params.get('order') || '').toUpperCase();
const last = (() => { try { return JSON.parse(sessionStorage.getItem('gf_last_order')) || {}; } catch { return {}; } })();
const knownPhone = wanted && (phoneFor(wanted) || (last.no === wanted ? last.phone : ''));
if (wanted && knownPhone) loadOne(wanted, knownPhone);
else if (wanted) showList('', { no: wanted });
else showList();
