import { renderLayout, api, esc, money, cart, toast, payWithRazorpay, $, $$ } from '/js/app.js';

const root = $('#cart-root');
const CUSTOMER_KEY = 'gf_customer';
let cfg;
let products = new Map(); // fresh product data from the server
let pending = null;       // an unpaid online order created in this visit

const savedCustomer = () => { try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY)) || {}; } catch { return {}; } };

function lines() {
  return cart.items().map((i) => {
    const p = products.get(i.id);
    return { ...i, product: p, price: p ? p.price : i.price, unavailable: !p, short: p && p.stock < i.qty };
  });
}

function totals() {
  const subtotal = lines().filter((l) => !l.unavailable).reduce((s, l) => s + l.price * l.qty, 0);
  const delivery = subtotal >= cfg.freeDeliveryAbove ? 0 : cfg.deliveryFee;
  return { subtotal, delivery, total: subtotal + delivery };
}

function renderEmpty() {
  root.innerHTML = `<div class="empty">
    <h2>Your cart is empty</h2>
    <p>Add fresh vegetables, grains and more from the shop.</p>
    <a class="btn btn-primary" href="/shop">Browse products</a></div>`;
}

function lineHtml(l) {
  const maxQty = l.product ? Math.min(l.product.stock, 99) : 0;
  return `
    <div class="cart-line" data-id="${l.id}">
      <img src="${esc(l.image || '/images/placeholder.svg')}" alt="">
      <div>
        <h3>${esc(l.name)}</h3>
        <div class="muted">${money(l.price)} / ${esc(l.unit)}</div>
        ${l.unavailable ? '<div class="warn">No longer available. Remove it to continue.</div>'
          : l.short ? `<div class="warn">Only ${l.product.stock} ${esc(l.unit)} left. Lower the quantity to continue.</div>` : ''}
      </div>
      <div class="line-right">
        <b>${money(l.price * l.qty)}</b>
        ${l.unavailable ? '' : `<div class="stepper" role="group" aria-label="Quantity of ${esc(l.name)}">
          <button type="button" data-act="dec" aria-label="Remove one">−</button>
          <output>${l.qty}</output>
          <button type="button" data-act="inc" aria-label="Add one" ${l.qty >= maxQty ? 'disabled' : ''}>+</button></div>`}
        <button class="link-btn" type="button" data-act="remove">Remove</button>
      </div>
    </div>`;
}

function renderSummary() {
  const t = totals();
  const ls = lines();
  const blocked = ls.some((l) => l.unavailable || l.short);
  const gap = cfg.freeDeliveryAbove - t.subtotal;
  $('#summary-body').innerHTML = `
    ${gap > 0 ? `<div class="free-note">Add ${money(gap)} more for free delivery.</div>` : `<div class="free-note">You get free delivery on this order.</div>`}
    <dl>
      <dt>Items (${ls.reduce((n, l) => n + l.qty, 0)})</dt><dd>${money(t.subtotal)}</dd>
      <dt>Delivery</dt><dd>${t.delivery ? money(t.delivery) : 'Free'}</dd>
      <dt class="total">Total</dt><dd class="total">${money(t.total)}</dd>
    </dl>`;
  const btn = $('#place-order');
  btn.disabled = blocked;
  const method = $('input[name="pay"]:checked')?.value;
  btn.textContent = method === 'cod' ? `Place order (${money(t.total)})` : `Pay ${money(t.total)}`;
  $('#blocked-note').hidden = !blocked;
}

function render() {
  const ls = lines();
  if (!ls.length) return renderEmpty();
  const c = savedCustomer();
  const online = cfg.onlinePaymentEnabled;
  const cod = cfg.codEnabled;
  root.innerHTML = `
    <div class="checkout">
      <div>
        <div class="panel"><h2>Items</h2><div id="lines">${ls.map(lineHtml).join('')}</div></div>
        <form class="panel" id="checkout-form" novalidate>
          <h2>Delivery details</h2>
          <div class="form-grid">
            <div class="field"><label for="f-name">Full name</label><input class="input" id="f-name" name="name" autocomplete="name" required value="${esc(c.name)}"></div>
            <div class="field"><label for="f-phone">Mobile number</label><input class="input" id="f-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="10-digit number" required value="${esc(c.phone)}"></div>
            <div class="field full"><label for="f-email">Email <span class="hint">(optional, for receipts)</span></label><input class="input" id="f-email" name="email" type="email" autocomplete="email" value="${esc(c.email)}"></div>
            <div class="field full"><label for="f-address">Address</label><textarea class="input" id="f-address" name="address" rows="2" autocomplete="street-address" placeholder="House no., street, area, landmark" required>${esc(c.address)}</textarea></div>
            <div class="field"><label for="f-city">City / town</label><input class="input" id="f-city" name="city" autocomplete="address-level2" required value="${esc(c.city)}"></div>
            <div class="field"><label for="f-pin">PIN code</label><input class="input" id="f-pin" name="pincode" inputmode="numeric" maxlength="6" autocomplete="postal-code" required value="${esc(c.pincode)}"></div>
            <div class="field"><label for="f-state">State</label><input class="input" id="f-state" name="state" autocomplete="address-level1" value="${esc(c.state || 'Andhra Pradesh')}"></div>
            <div class="field"><label for="f-notes">Delivery note <span class="hint">(optional)</span></label><input class="input" id="f-notes" name="notes" placeholder="e.g. call before delivery"></div>
          </div>
        </form>
      </div>
      <aside class="panel summary" aria-labelledby="sum-title">
        <h2 id="sum-title">Order summary</h2>
        <div id="summary-body"></div>
        <h2 style="font-size:1rem">Payment</h2>
        <div class="pay-options">
          <label class="pay-option ${online ? '' : 'disabled'}">
            <input type="radio" name="pay" value="online" ${online ? 'checked' : 'disabled'}>
            <span><b>Pay online</b><small>${online ? 'UPI, cards, net banking and wallets via Razorpay' : 'Not available yet'}</small></span>
          </label>
          ${cod ? `<label class="pay-option"><input type="radio" name="pay" value="cod" ${online ? '' : 'checked'}>
            <span><b>Cash on delivery</b><small>Pay in cash or UPI when your order arrives</small></span></label>` : ''}
        </div>
        <div id="checkout-alert"></div>
        <p class="warn" id="blocked-note" hidden>Fix the items marked in red before placing your order.</p>
        <button class="btn btn-primary btn-block" id="place-order" type="button">Place order</button>
        <p class="muted" style="font-size:.8rem;margin:10px 0 0;text-align:center">Prices and stock are checked again when you place the order.</p>
      </aside>
    </div>`;
  if (!online && !cod) $('#place-order').disabled = true;
  renderSummary();
}

function showAlert(html, kind = 'error') {
  $('#checkout-alert').innerHTML = `<div class="alert alert-${kind}" role="alert">${html}</div>`;
}

async function refreshProducts() {
  const ids = cart.items().map((i) => i.id);
  if (!ids.length) { products = new Map(); return; }
  const list = await api(`/api/products?ids=${ids.join(',')}`);
  products = new Map(list.map((p) => [p.id, p]));
  // Keep cart snapshots (name, price, image) up to date
  const items = cart.items().map((i) => { const p = products.get(i.id); return p ? { ...i, name: p.name, price: p.price, unit: p.unit, image: p.image } : i; });
  localStorage.setItem('gf_cart', JSON.stringify(items));
}

function goToOrder(order, phone) {
  cart.clear();
  sessionStorage.setItem('gf_last_order', JSON.stringify({ no: order.order_number, phone }));
  location.href = `/track?order=${encodeURIComponent(order.order_number)}&placed=1`;
}

async function startPayment(payment, orderNumber, phone) {
  try {
    const order = await payWithRazorpay(payment, orderNumber);
    goToOrder(order, phone);
  } catch (err) {
    if (err.dismissed) {
      showAlert(`Payment was not completed. Your order <b>${esc(orderNumber)}</b> is saved and waiting for payment.
        <div style="margin-top:10px"><button class="btn btn-primary" type="button" id="retry-pay">Try payment again</button></div>`, 'info');
      $('#retry-pay').onclick = () => startPayment(payment, orderNumber, phone);
    } else {
      showAlert(esc(err.message));
    }
  }
}

async function placeOrder() {
  const form = $('#checkout-form');
  const data = Object.fromEntries(new FormData(form));
  $('#checkout-alert').innerHTML = '';
  // Quick checks in the browser; the server validates everything again.
  const phone = data.phone.replace(/\D/g, '').slice(-10);
  const problems = [];
  if (data.name.trim().length < 2) problems.push(['f-name', 'Enter your full name.']);
  if (!/^[6-9]\d{9}$/.test(phone)) problems.push(['f-phone', 'Enter a valid 10-digit mobile number.']);
  if (data.address.trim().length < 8) problems.push(['f-address', 'Enter your full delivery address.']);
  if (data.city.trim().length < 2) problems.push(['f-city', 'Enter your city or town.']);
  if (!/^[1-9]\d{5}$/.test(data.pincode.trim())) problems.push(['f-pin', 'Enter a valid 6-digit PIN code.']);
  $$('.input', form).forEach((el) => el.removeAttribute('aria-invalid'));
  if (problems.length) {
    problems.forEach(([id]) => $('#' + id).setAttribute('aria-invalid', 'true'));
    showAlert(problems.map((p) => esc(p[1])).join('<br>'));
    $('#' + problems[0][0]).focus();
    return;
  }
  const { notes, ...remember } = data;
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(remember));

  const paymentMethod = $('input[name="pay"]:checked')?.value;
  const btn = $('#place-order');
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = paymentMethod === 'online' ? 'Opening payment…' : 'Placing order…';
  try {
    if (pending && pending.cartKey === JSON.stringify(cart.items()) && paymentMethod === 'online') {
      await startPayment(pending.payment, pending.orderNumber, phone);
      return;
    }
    const res = await api('/api/orders', {
      method: 'POST',
      body: { items: cart.items().map(({ id, qty }) => ({ id, qty })), customer: { ...data, phone }, paymentMethod },
    });
    if (res.payment) {
      pending = { payment: res.payment, orderNumber: res.order.order_number, cartKey: JSON.stringify(cart.items()) };
      await startPayment(res.payment, res.order.order_number, phone);
    } else {
      goToOrder(res.order, phone);
    }
  } catch (err) {
    showAlert(esc(err.message));
    if (err.status === 409) { await refreshProducts().catch(() => {}); render(); showAlert(esc(err.message)); }
  } finally {
    if (document.body.contains(btn)) { btn.disabled = false; btn.textContent = label; renderSummary(); }
  }
}

root.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act) {
    const id = Number(e.target.closest('.cart-line').dataset.id);
    const item = cart.items().find((i) => i.id === id);
    if (act === 'remove') { cart.remove(id); toast(`Removed ${esc(item.name)}`); }
    if (act === 'inc') cart.set(item, item.qty + 1);
    if (act === 'dec') cart.set(item, item.qty - 1);
    if (!cart.items().length) return renderEmpty();
    $('#lines').innerHTML = lines().map(lineHtml).join('');
    $(`.cart-line[data-id="${id}"] [data-act="${act}"]:not(:disabled)`)?.focus();
    renderSummary();
    return;
  }
  if (e.target.closest('#place-order')) placeOrder();
});
root.addEventListener('change', (e) => { if (e.target.name === 'pay') renderSummary(); });

(async () => {
  cfg = await renderLayout('cart');
  try { await refreshProducts(); } catch (err) { root.innerHTML = `<p class="warn">${esc(err.message)}</p>`; return; }
  render();
})();
