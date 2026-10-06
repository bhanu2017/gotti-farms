import { api, esc, money, logoMark, STATUS_LABEL, PAYMENT_LABEL, toast, $, $$ } from '/js/app.js';

const root = $('#admin-root');
let categories = [];
let tab = 'orders';
let orderFilter = { status: '', q: '' };

const fmtDate = (s) => new Date(s.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const pillClass = (o) => (o.order_status === 'cancelled' ? 'bad' : o.order_status === 'pending_payment' ? 'warn-pill' : '');

// ---------- Sign in ----------
function loginView(error = '') {
  root.innerHTML = `
    <main class="section"><div class="wrap">
      <form class="panel" id="login" style="max-width:380px;margin:40px auto">
        <a class="logo" href="/" style="margin-bottom:16px">${logoMark}<span class="logo-text"><b>GOTTI</b><small>FARMS</small></span></a>
        <h1 style="font-size:1.4rem">Store admin</h1>
        ${error ? `<div class="alert alert-error" role="alert">${esc(error)}</div>` : ''}
        <div class="field" style="margin-bottom:14px"><label for="pw">Password</label>
          <input class="input" id="pw" name="password" type="password" autocomplete="current-password" required autofocus></div>
        <button class="btn btn-primary btn-block">Sign in</button>
      </form>
    </div></main>`;
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/api/admin/login', { method: 'POST', body: { password: $('#pw').value } });
      shell();
    } catch (err) { loginView(err.message); }
  });
}

// ---------- Layout ----------
function shell() {
  root.innerHTML = `
    <header class="admin-bar"><div class="wrap">
      <a class="logo" href="/" target="_blank" rel="noopener">${logoMark}<span class="logo-text"><b>GOTTI</b><small>FARMS</small></span></a>
      <div class="admin-tabs" role="tablist">
        <button role="tab" data-tab="orders">Orders</button>
        <button role="tab" data-tab="products">Products</button>
        <button role="tab" data-tab="blog">Farmer Tips</button>
      </div>
      <span class="spacer"></span>
      <a href="/" target="_blank" rel="noopener">View store</a>
      <button class="link" id="logout" type="button">Sign out</button>
    </div></header>
    <main><div class="wrap" id="view"></div></main>
    <dialog id="dlg"></dialog>`;
  $('.admin-tabs').addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; show(); } });
  $('#logout').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST', body: {} }); loginView(); });
  show();
}

function show() {
  $$('.admin-tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
  ({ orders: ordersView, products: productsView, blog: postsView }[tab])().catch(handleError);
}

function handleError(err) {
  if (err.status === 401) return loginView('Your session ended. Sign in again.');
  toast(esc(err.message));
}

// ---------- Orders ----------
async function ordersView() {
  const view = $('#view');
  const [stats, orders] = await Promise.all([
    api('/api/admin/stats'),
    api(`/api/admin/orders?${new URLSearchParams(orderFilter)}`),
  ]);
  view.innerHTML = `
    <div class="kpis">
      <div class="kpi"><b>${stats.orders_today}</b><span>Orders today</span></div>
      <div class="kpi"><b>${stats.to_ship}</b><span>Waiting to be shipped</span></div>
      <div class="kpi"><b>${money(stats.revenue_30d)}</b><span>Paid in last 30 days</span></div>
      <div class="kpi"><b>${stats.awaiting_payment}</b><span>Unpaid online orders</span></div>
    </div>
    ${stats.low_stock.length ? `<div class="alert alert-info">Low stock: ${stats.low_stock.map((p) => `${esc(p.name)} (${p.stock} ${esc(p.unit)})`).join(', ')}</div>` : ''}
    <div class="toolbar">
      <h2>Orders</h2>
      <input class="input" id="o-q" type="search" placeholder="Order no., name or phone" style="width:220px" value="${esc(orderFilter.q)}">
      <select class="select" id="o-status" style="width:auto">
        <option value="">All statuses</option>
        ${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${orderFilter.status === k ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
      <button class="btn btn-outline btn-sm" id="o-refresh" type="button">Refresh</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>City</th><th class="num">Items</th><th class="num">Total</th><th>Payment</th><th>Status</th></tr></thead>
      <tbody>${orders.length ? orders.map((o) => `
        <tr class="clickable" data-id="${o.id}" tabindex="0">
          <td><b>${esc(o.order_number)}</b></td>
          <td>${fmtDate(o.created_at)}</td>
          <td>${esc(o.customer_name)}<br><span class="muted">${esc(o.phone)}</span></td>
          <td>${esc(o.city)}</td>
          <td class="num">${o.item_count}</td>
          <td class="num">${money(o.total)}</td>
          <td><span class="pill ${o.payment_status === 'paid' ? '' : o.payment_status === 'cod' ? 'neutral' : 'warn-pill'}">${PAYMENT_LABEL[o.payment_status]}</span></td>
          <td><span class="pill ${pillClass(o)}">${STATUS_LABEL[o.order_status]}</span></td>
        </tr>`).join('') : `<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">No orders yet. New orders appear here.</td></tr>`}
      </tbody></table></div>`;

  let t;
  $('#o-q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { orderFilter.q = e.target.value.trim(); ordersView().catch(handleError).then(() => { const i = $('#o-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 350); });
  $('#o-status').addEventListener('change', (e) => { orderFilter.status = e.target.value; ordersView().catch(handleError); });
  $('#o-refresh').addEventListener('click', () => ordersView().catch(handleError));
  const open = (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) orderDialog(Number(tr.dataset.id)).catch(handleError); };
  $('tbody', view).addEventListener('click', open);
  $('tbody', view).addEventListener('keydown', (e) => { if (e.key === 'Enter') open(e); });
}

async function orderDialog(id) {
  const o = await api(`/api/admin/orders/${id}`);
  const dlg = $('#dlg');
  dlg.classList.remove('wide');
  const locked = o.order_status === 'cancelled';
  const options = o.order_status === 'pending_payment' ? ['cancelled'] : ['confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
  dlg.innerHTML = `
    <div class="dialog-head"><h2>Order ${esc(o.order_number)}</h2><button class="close-x" type="button" aria-label="Close" data-close>×</button></div>
    <div class="dialog-body">
      <p style="margin-top:0"><span class="pill ${pillClass(o)}">${STATUS_LABEL[o.order_status]}</span>
        <span class="pill ${o.payment_status === 'paid' ? '' : 'neutral'}">${o.payment_method === 'cod' ? (o.payment_status === 'paid' ? 'Cash collected' : 'Cash on delivery') : (o.payment_status === 'paid' ? 'Paid online' : `Online payment: ${PAYMENT_LABEL[o.payment_status].toLowerCase()}`)}</span></p>
      <p><b>${esc(o.customer_name)}</b> · <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>${o.email ? ` · <a href="mailto:${esc(o.email)}">${esc(o.email)}</a>` : ''}<br>
        ${esc(o.address)}, ${esc(o.city)}, ${esc(o.state)} ${esc(o.pincode)}</p>
      ${o.notes ? `<div class="alert alert-info">Note from customer: ${esc(o.notes)}</div>` : ''}
      <div class="table-wrap"><table>
        <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
        <tbody>${o.items.map((it) => `<tr><td>${esc(it.name)}</td><td class="num">${it.qty} ${esc(it.unit)}</td><td class="num">${money(it.price)}</td><td class="num">${money(it.line_total)}</td></tr>`).join('')}
        <tr><td colspan="3">Delivery</td><td class="num">${o.delivery_fee ? money(o.delivery_fee) : 'Free'}</td></tr>
        <tr><td colspan="3"><b>Total</b></td><td class="num"><b>${money(o.total)}</b></td></tr></tbody></table></div>
      <p class="muted" style="font-size:.85rem">Placed ${fmtDate(o.created_at)}${o.razorpay_payment_id ? ` · Razorpay payment ${esc(o.razorpay_payment_id)}` : ''}</p>
      ${locked ? '' : `<div class="field"><label for="new-status">Update status</label>
        <select class="select" id="new-status">${options.map((s) => `<option value="${s}" ${s === o.order_status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select>
        ${o.payment_method === 'cod' ? '<p class="muted" style="font-size:.85rem">Marking a cash order as delivered also marks it paid.</p>' : ''}
        ${o.payment_status === 'paid' && o.payment_method === 'online' ? '<p class="muted" style="font-size:.85rem">Cancelling a paid order does not refund it. Issue the refund from your Razorpay dashboard.</p>' : ''}</div>`}
    </div>
    <div class="dialog-foot">
      <button class="btn btn-outline btn-sm" type="button" data-close>Close</button>
      ${locked ? '' : '<button class="btn btn-primary btn-sm" type="button" id="save-status">Save status</button>'}
    </div>`;
  dlg.showModal();
  dlg.onclick = (e) => { if (e.target.closest('[data-close]') || e.target === dlg) dlg.close(); };
  $('#save-status')?.addEventListener('click', async () => {
    const status = $('#new-status').value;
    if (status === o.order_status) return dlg.close();
    if (status === 'cancelled' && !confirm('Cancel this order? Stock will be returned to inventory.')) return;
    try {
      await api(`/api/admin/orders/${id}`, { method: 'PATCH', body: { order_status: status } });
      dlg.close();
      toast(`Order ${esc(o.order_number)} marked ${STATUS_LABEL[status].toLowerCase()}`);
      ordersView().catch(handleError);
    } catch (err) { handleError(err); }
  });
}

// ---------- Products ----------
async function productsView() {
  const view = $('#view');
  const [products, cats] = await Promise.all([api('/api/admin/products'), api('/api/categories')]);
  categories = cats;
  view.innerHTML = `
    <div class="toolbar">
      <h2>Products (${products.length})</h2>
      <button class="btn btn-primary btn-sm" id="add-product" type="button">Add product</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th></th><th>Name</th><th>Category</th><th class="num">Price</th><th class="num">Stock</th><th>Featured</th><th>Visible</th><th></th></tr></thead>
      <tbody>${products.map((p) => `
        <tr class="${p.active ? '' : 'dim'}">
          <td><img src="${esc(p.image || '/images/placeholder.svg')}" alt=""></td>
          <td><b>${esc(p.name)}</b></td>
          <td>${esc(p.category_name)}</td>
          <td class="num">${money(p.price)} / ${esc(p.unit)}</td>
          <td class="num ${p.stock <= 10 ? 'warn' : ''}">${p.stock}</td>
          <td>${p.featured ? 'Yes' : '–'}</td>
          <td>${p.active ? 'Yes' : 'Hidden'}</td>
          <td><button class="btn btn-outline btn-sm" type="button" data-edit="${p.id}">Edit</button></td>
        </tr>`).join('')}</tbody></table></div>`;
  $('#add-product').addEventListener('click', () => productDialog(null));
  view.querySelector('tbody').addEventListener('click', (e) => {
    const id = Number(e.target.closest('[data-edit]')?.dataset.edit);
    if (id) productDialog(products.find((p) => p.id === id));
  });
}

function productDialog(p) {
  const dlg = $('#dlg');
  dlg.classList.remove('wide');
  const isNew = !p;
  p ||= { name: '', category_id: categories[0]?.id, price: 0, unit: 'kg', image: '', description: '', stock: 0, featured: 0, active: 1 };
  dlg.innerHTML = `
    <form method="dialog" id="pform">
      <div class="dialog-head"><h2>${isNew ? 'Add product' : 'Edit product'}</h2><button class="close-x" type="button" aria-label="Close" data-close>×</button></div>
      <div class="dialog-body">
        <div id="p-alert"></div>
        <div class="form-grid">
          <div class="field full"><label for="p-name">Name</label><input class="input" id="p-name" name="name" required value="${esc(p.name)}"></div>
          <div class="field"><label for="p-cat">Category</label><select class="select" id="p-cat" name="category_id">
            ${categories.map((c) => `<option value="${esc(c.id)}" ${c.id === p.category_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="p-unit">Sold per <span class="hint">(kg, pack, dozen…)</span></label><input class="input" id="p-unit" name="unit" required value="${esc(p.unit)}"></div>
          <div class="field"><label for="p-price">Price (₹)</label><input class="input" id="p-price" name="price_rupees" type="number" min="1" step="0.5" required value="${p.price / 100 || ''}"></div>
          <div class="field"><label for="p-stock">Stock available</label><input class="input" id="p-stock" name="stock" type="number" min="0" step="1" required value="${p.stock}"></div>
          <div class="field full"><label for="p-desc">Description</label><textarea class="input" id="p-desc" name="description" rows="2">${esc(p.description)}</textarea></div>
          <div class="field full"><label for="p-file">Photo</label>
            <div style="display:flex;gap:14px;align-items:center">
              <img class="img-preview" id="p-preview" src="${esc(p.image || '/images/placeholder.svg')}" alt="">
              <div style="flex:1"><input id="p-file" type="file" accept="image/jpeg,image/png,image/webp">
                <p class="muted" style="font-size:.82rem;margin:6px 0 0">JPG, PNG or WebP, under 3 MB. Square photos look best.</p></div>
            </div>
            <input type="hidden" name="image" id="p-image" value="${esc(p.image)}"></div>
          <div class="field full check-row">
            <label><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> Show on home page</label>
            <label><input type="checkbox" name="active" ${p.active ? 'checked' : ''}> Visible in store</label>
          </div>
        </div>
      </div>
      <div class="dialog-foot">
        ${isNew ? '' : '<button class="btn btn-danger btn-sm" type="button" id="p-delete" style="margin-right:auto">Delete</button>'}
        <button class="btn btn-outline btn-sm" type="button" data-close>Cancel</button>
        <button class="btn btn-primary btn-sm" type="submit" id="p-save">${isNew ? 'Add product' : 'Save changes'}</button>
      </div>
    </form>`;
  dlg.showModal();
  dlg.onclick = (e) => { if (e.target.closest('[data-close]') || e.target === dlg) dlg.close(); };
  const alertBox = (msg) => { $('#p-alert').innerHTML = `<div class="alert alert-error" role="alert">${esc(msg)}</div>`; };

  $('#p-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return alertBox('Image must be smaller than 3 MB.');
    const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    $('#p-save').disabled = true;
    try {
      const { url } = await api('/api/admin/upload', { method: 'POST', body: { filename: file.name, data } });
      $('#p-image').value = url;
      $('#p-preview').src = url;
    } catch (err) { alertBox(err.message); } finally { $('#p-save').disabled = false; }
  });

  $('#pform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      name: f.get('name'), category_id: f.get('category_id'), unit: f.get('unit'),
      price_rupees: Number(f.get('price_rupees')), stock: Number(f.get('stock')),
      description: f.get('description'), image: f.get('image'),
      featured: f.get('featured') === 'on', active: f.get('active') === 'on',
    };
    try {
      await api(isNew ? '/api/admin/products' : `/api/admin/products/${p.id}`, { method: isNew ? 'POST' : 'PUT', body });
      dlg.close();
      toast(isNew ? `Added ${esc(body.name)}` : `Saved ${esc(body.name)}`);
      productsView().catch(handleError);
    } catch (err) { if (err.status === 401) { dlg.close(); handleError(err); } else alertBox(err.message); }
  });

  $('#p-delete')?.addEventListener('click', async () => {
    if (!confirm(`Delete ${p.name}? Past orders keep their record. To hide it for now, untick "Visible in store" instead.`)) return;
    try {
      await api(`/api/admin/products/${p.id}`, { method: 'DELETE' });
      dlg.close();
      toast(`Deleted ${esc(p.name)}`);
      productsView().catch(handleError);
    } catch (err) { alertBox(err.message); }
  });
}

// ---------- Farmer Tips (blog) ----------
const TOPIC_NAMES = { pests: 'Pests', diseases: 'Diseases', soil: 'Soil', water: 'Water', general: 'General' };

async function postsView() {
  const view = $('#view');
  const posts = await api('/api/admin/posts');
  view.innerHTML = `
    <div class="toolbar">
      <h2>Farmer Tips (${posts.length})</h2>
      <a class="btn btn-outline btn-sm" href="/blog" target="_blank" rel="noopener">View blog</a>
      <button class="btn btn-primary btn-sm" id="add-post" type="button">Write a post</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th></th><th>Title</th><th>Topic</th><th>Telugu</th><th>Status</th><th>Last changed</th><th></th></tr></thead>
      <tbody>${posts.length ? posts.map((p) => `
        <tr class="${p.published ? '' : 'dim'}">
          <td><img src="${esc(p.image || '/images/placeholder.svg')}" alt=""></td>
          <td><b>${esc(p.title_en)}</b>${p.title_te ? `<br><span class="muted" lang="te">${esc(p.title_te)}</span>` : ''}</td>
          <td>${TOPIC_NAMES[p.category] || esc(p.category)}</td>
          <td>${p.title_te ? 'Yes' : '<span class="warn">Missing</span>'}</td>
          <td><span class="pill ${p.published ? '' : 'neutral'}">${p.published ? 'Published' : 'Draft'}</span></td>
          <td>${fmtDate(p.updated_at)}</td>
          <td><button class="btn btn-outline btn-sm" type="button" data-edit-post="${p.id}">Edit</button></td>
        </tr>`).join('') : '<tr><td colspan="7" class="muted" style="text-align:center;padding:30px">No posts yet. Write your first farmer tip.</td></tr>'}
      </tbody></table></div>`;
  $('#add-post').addEventListener('click', () => postDialog(null));
  view.querySelector('tbody').addEventListener('click', async (e) => {
    const id = Number(e.target.closest('[data-edit-post]')?.dataset.editPost);
    if (id) postDialog(await api(`/api/admin/posts/${id}`)).catch(handleError);
  });
}

const FORMAT_HELP = `Leave an empty line between paragraphs. Start a line with "## " for a heading, "- " for a bullet point, or "1. " for a numbered step. Put **two stars** around words to make them bold.`;

async function postDialog(p) {
  const dlg = $('#dlg');
  const isNew = !p;
  p ||= { category: 'pests', image: '', title_en: '', summary_en: '', body_en: '', title_te: '', summary_te: '', body_te: '', published: 1 };
  dlg.classList.add('wide');
  dlg.innerHTML = `
    <form method="dialog" id="post-form">
      <div class="dialog-head"><h2>${isNew ? 'Write a post' : 'Edit post'}</h2><button class="close-x" type="button" aria-label="Close" data-close>×</button></div>
      <div class="dialog-body">
        <div id="post-alert"></div>
        <div class="form-grid">
          <div class="field"><label for="b-cat">Topic</label>
            <select class="select" id="b-cat" name="category">${Object.entries(TOPIC_NAMES).map(([k, v]) => `<option value="${k}" ${k === p.category ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label for="b-file">Cover photo</label>
            <div style="display:flex;gap:12px;align-items:center">
              <img class="img-preview" id="b-preview" src="${esc(p.image || '/images/placeholder.svg')}" alt="" style="width:72px;height:72px">
              <input id="b-file" type="file" accept="image/jpeg,image/png,image/webp">
            </div>
            <input type="hidden" name="image" id="b-image" value="${esc(p.image)}"></div>
        </div>
        <p class="muted" style="font-size:.85rem;margin:14px 0 6px">${esc(FORMAT_HELP)}</p>
        <div class="lang-columns">
          <fieldset>
            <legend>English</legend>
            <div class="field"><label for="b-title-en">Title</label><input class="input" id="b-title-en" name="title_en" required value="${esc(p.title_en)}"></div>
            <div class="field"><label for="b-sum-en">Short summary <span class="hint">(shown on the blog list)</span></label><textarea class="input" id="b-sum-en" name="summary_en" rows="2">${esc(p.summary_en)}</textarea></div>
            <div class="field"><label for="b-body-en">Article</label><textarea class="input body-input" id="b-body-en" name="body_en" rows="14">${esc(p.body_en)}</textarea></div>
          </fieldset>
          <fieldset lang="te">
            <legend>తెలుగు (Telugu)</legend>
            <div class="field"><label for="b-title-te">శీర్షిక (Title)</label><input class="input" id="b-title-te" name="title_te" value="${esc(p.title_te)}"></div>
            <div class="field"><label for="b-sum-te">సారాంశం (Summary)</label><textarea class="input" id="b-sum-te" name="summary_te" rows="2">${esc(p.summary_te)}</textarea></div>
            <div class="field"><label for="b-body-te">వ్యాసం (Article)</label><textarea class="input body-input" id="b-body-te" name="body_te" rows="14">${esc(p.body_te)}</textarea></div>
          </fieldset>
        </div>
        <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin-top:14px">
          <input type="checkbox" name="published" ${p.published ? 'checked' : ''}> Published (visible on the website)</label>
        <p class="muted" style="font-size:.85rem;margin:4px 0 0">Untick to save as a draft that only you can see here.</p>
      </div>
      <div class="dialog-foot">
        ${isNew ? '' : '<button class="btn btn-danger btn-sm" type="button" id="post-delete" style="margin-right:auto">Delete</button>'}
        ${!isNew && p.published ? `<a class="btn btn-outline btn-sm" href="/blog/${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">View post</a>` : ''}
        <button class="btn btn-outline btn-sm" type="button" data-close>Cancel</button>
        <button class="btn btn-primary btn-sm" type="submit" id="post-save">${isNew ? 'Save post' : 'Save changes'}</button>
      </div>
    </form>`;
  dlg.showModal();
  dlg.onclick = (e) => { if (e.target.closest('[data-close]') || e.target === dlg) dlg.close(); };
  const alertBox = (msg) => { $('#post-alert').innerHTML = `<div class="alert alert-error" role="alert">${esc(msg)}</div>`; $('#post-alert').scrollIntoView({ block: 'nearest' }); };

  $('#b-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return alertBox('Image must be smaller than 3 MB.');
    const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    $('#post-save').disabled = true;
    try {
      const { url } = await api('/api/admin/upload', { method: 'POST', body: { filename: file.name, data } });
      $('#b-image').value = url;
      $('#b-preview').src = url;
    } catch (err) { alertBox(err.message); } finally { $('#post-save').disabled = false; }
  });

  $('#post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = Object.fromEntries(['category', 'image', 'title_en', 'summary_en', 'body_en', 'title_te', 'summary_te', 'body_te'].map((k) => [k, f.get(k)]));
    body.published = f.get('published') === 'on';
    try {
      await api(isNew ? '/api/admin/posts' : `/api/admin/posts/${p.id}`, { method: isNew ? 'POST' : 'PUT', body });
      dlg.close();
      toast(body.published ? `Published "${esc(body.title_en)}"` : `Saved "${esc(body.title_en)}" as a draft`);
      postsView().catch(handleError);
    } catch (err) { if (err.status === 401) { dlg.close(); handleError(err); } else alertBox(err.message); }
  });

  $('#post-delete')?.addEventListener('click', async () => {
    if (!confirm(`Delete "${p.title_en}"? This cannot be undone. To hide it instead, untick "Published".`)) return;
    try {
      await api(`/api/admin/posts/${p.id}`, { method: 'DELETE' });
      dlg.close();
      toast(`Deleted "${esc(p.title_en)}"`);
      postsView().catch(handleError);
    } catch (err) { alertBox(err.message); }
  });
}

// ---------- Start ----------
api('/api/admin/me').then((r) => (r.signedIn ? shell() : loginView())).catch(() => loginView());
