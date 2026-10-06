import { renderLayout, api, esc, money, icon, payWithRazorpay, STATUS_LABEL, PAYMENT_LABEL, $ } from '/js/app.js';

renderLayout('track');
const root = $('#track-root');
const params = new URLSearchParams(location.search);
const last = (() => { try { return JSON.parse(sessionStorage.getItem('gf_last_order')) || {}; } catch { return {}; } })();

function lookupForm(prefill = {}, error = '') {
  root.innerHTML = `
    <div class="panel" style="max-width:480px;margin-inline:auto">
      <h1 style="font-size:1.6rem">Track your order</h1>
      <p class="muted">Enter the order number from your confirmation and the mobile number you ordered with.</p>
      ${error ? `<div class="alert alert-error" role="alert">${esc(error)}</div>` : ''}
      <form id="lookup" class="form-grid" style="grid-template-columns:1fr">
        <div class="field"><label for="t-no">Order number</label><input class="input" id="t-no" name="no" placeholder="e.g. GF261001-AB3CD" required value="${esc(prefill.no)}"></div>
        <div class="field"><label for="t-phone">Mobile number</label><input class="input" id="t-phone" name="phone" type="tel" inputmode="numeric" required value="${esc(prefill.phone)}"></div>
        <button class="btn btn-primary">Find my order</button>
      </form>
    </div>`;
  $('#lookup').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    load(d.no.trim(), d.phone.trim());
  });
}

const TRACK_STEPS = ['confirmed', 'packed', 'shipped', 'delivered'];

function orderView(o, phone, justPlaced) {
  const paid = o.payment_status === 'paid';
  const awaiting = o.order_status === 'pending_payment';
  const cancelled = o.order_status === 'cancelled';
  const reached = TRACK_STEPS.indexOf(o.order_status);
  const date = new Date(o.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  root.innerHTML = `
    ${justPlaced && !awaiting ? `<div class="order-hero">
      <div class="check">${icon.check}</div>
      <h1 style="font-size:1.8rem">Thank you, ${esc(o.customer_name.split(' ')[0])}! Your order is confirmed.</h1>
      <p class="muted">Save your order number <b>${esc(o.order_number)}</b> to track it here later.</p></div>` : ''}
    <div class="panel">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:start">
        <div><h2 style="margin:0">Order ${esc(o.order_number)}</h2><div class="muted">Placed ${esc(date)}</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="pill ${cancelled ? 'bad' : awaiting ? 'warn-pill' : ''}">${STATUS_LABEL[o.order_status]}</span>
          <span class="pill ${paid ? '' : o.payment_status === 'cod' ? 'neutral' : 'warn-pill'}">${PAYMENT_LABEL[o.payment_status]}</span>
        </div>
      </div>
      ${awaiting ? `<div class="alert alert-info" style="margin-top:16px">This order is waiting for payment. It will be confirmed as soon as payment goes through.
          <div style="margin-top:10px"><button class="btn btn-primary" id="pay-now" type="button">Pay ${money(o.total)} now</button></div></div>
          <div id="pay-alert"></div>` : ''}
      ${!awaiting && !cancelled ? `<ol class="status-track" style="grid-template-columns:repeat(4,1fr);margin-top:22px">
          ${TRACK_STEPS.map((s, i) => `<li class="${i <= reached ? 'done' : ''}">${STATUS_LABEL[s]}</li>`).join('')}</ol>` : ''}
    </div>
    <div class="panel">
      <h2>Items</h2>
      ${o.items.map((it) => `<div class="cart-line" style="grid-template-columns:56px 1fr auto">
        <img src="${esc(it.image || '/images/placeholder.svg')}" alt="" style="width:56px;height:56px">
        <div><h3>${esc(it.name)}</h3><div class="muted">${it.qty} × ${money(it.price)} / ${esc(it.unit)}</div></div>
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

  $('#pay-now')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      const { payment } = await api('/api/orders/pay', { method: 'POST', body: { orderNumber: o.order_number, phone } });
      const paidOrder = await payWithRazorpay(payment, o.order_number);
      orderView(paidOrder, phone, true);
    } catch (err) {
      if (!err.dismissed) $('#pay-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      e.target.disabled = false;
    }
  });
}

async function load(no, phone) {
  root.innerHTML = '<p class="muted">Looking up your order…</p>';
  try {
    const order = await api('/api/orders/lookup', { method: 'POST', body: { orderNumber: no, phone } });
    sessionStorage.setItem('gf_last_order', JSON.stringify({ no: order.order_number, phone }));
    history.replaceState(null, '', `?order=${encodeURIComponent(order.order_number)}`);
    orderView(order, phone, params.get('placed') === '1');
  } catch (err) {
    lookupForm({ no, phone }, err.message);
  }
}

const no = params.get('order') || '';
if (no && last.no === no && last.phone) load(no, last.phone);
else lookupForm({ no });
