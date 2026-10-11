// One Netlify Function handles every /api/* request and serves uploaded photos at /uploads/*.
import { config as settings, razorpayEnabled } from '../../src/config.js';
import { HttpError } from '../../src/errors.js';
import { withRequestDb } from '../../src/db.js';
import * as store from '../../src/store.js';
import * as blog from '../../src/blog.js';
import { saveImage, imageResponse } from '../../src/files.js';
import { createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature } from '../../src/razorpay.js';
import { checkPassword, sessionCookie, clearCookie, isAdmin, rateLimited } from '../../src/auth.js';

// ---------------- Tiny router ----------------
const routes = [];
const route = (method, pattern, handler, opts = {}) => {
  const keys = [];
  const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, regex, keys, handler, opts });
};

const json = (status, data, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});

function requireAdmin(req) {
  if (!isAdmin(req.headers.get('cookie'))) throw new HttpError(401, 'Sign in to continue.');
}

// ---------------- Public API ----------------

route('GET', '/api/config', () => ({
  store: settings.store,
  deliveryFee: settings.deliveryFee,
  freeDeliveryAbove: settings.freeDeliveryAbove,
  codEnabled: settings.codEnabled,
  onlinePaymentEnabled: razorpayEnabled(),
}), { noDb: true });

route('GET', '/api/categories', () => store.listCategories());

route('GET', '/api/products', ({ query }) => {
  const ids = (query.get('ids') || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);
  return store.listProducts({
    category: query.get('category') || undefined,
    q: (query.get('q') || '').trim().slice(0, 60) || undefined,
    featured: query.get('featured') === '1',
    sort: query.get('sort') || undefined,
    ids: ids.length ? ids : undefined,
  });
});

route('GET', '/api/products/:id', async ({ params }) => {
  const p = await store.getProduct(Number(params.id) || 0);
  if (!p || !p.active) throw new HttpError(404, 'Product not found.');
  return p;
});

async function startOnlinePayment(order) {
  if (!razorpayEnabled()) throw new HttpError(503, 'Online payment is not set up yet. Choose cash on delivery.');
  let rzpOrderId = order.razorpay_order_id;
  if (!rzpOrderId) {
    try {
      const rzp = await createRazorpayOrder({ amount: order.total, receipt: order.order_number, notes: { order_number: order.order_number } });
      rzpOrderId = rzp.id;
      await store.setRazorpayOrderId(order.id, rzpOrderId);
    } catch (err) {
      console.error(err);
      throw new HttpError(502, 'Could not reach the payment gateway. Try again in a minute, or choose cash on delivery.');
    }
  }
  return {
    keyId: settings.razorpay.keyId,
    razorpayOrderId: rzpOrderId,
    amount: order.total,
    currency: 'INR',
    name: settings.store.name,
    prefill: { name: order.customer_name, email: order.email, contact: order.phone },
  };
}

route('POST', '/api/orders', async ({ body, ip }) => {
  if (rateLimited(`order:${ip}`, 20, 10 * 60 * 1000)) throw new HttpError(429, 'Too many orders from this network. Wait a few minutes and try again.');
  if (body.paymentMethod === 'online' && !razorpayEnabled()) throw new HttpError(503, 'Online payment is not set up yet. Choose cash on delivery.');
  const order = await store.createOrder(body);
  const result = { order: store.publicOrder(order) };
  if (order.payment_method === 'online') {
    try {
      result.payment = await startOnlinePayment(order);
    } catch (err) {
      await store.markPaymentFailedToStart(order.id);
      throw err;
    }
  }
  return result;
});

route('POST', '/api/orders/lookup', async ({ body, ip }) => {
  if (rateLimited(`lookup:${ip}`, 30, 10 * 60 * 1000)) throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
  return store.publicOrder(await store.findCustomerOrder(body.orderNumber, body.phone));
});

// "My Orders": orders remembered on the customer's device. Each needs its order number + phone.
route('POST', '/api/orders/mine', async ({ body, ip }) => {
  if (rateLimited(`mine:${ip}`, 60, 10 * 60 * 1000)) throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
  const list = Array.isArray(body.orders) ? body.orders.slice(0, 20) : [];
  const found = [];
  for (const { orderNumber, phone } of list) {
    try { found.push(store.publicOrder(await store.findCustomerOrder(orderNumber, phone))); } catch { /* skip unknown */ }
  }
  found.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return found;
});

// Retry payment for an unpaid online order
route('POST', '/api/orders/pay', async ({ body, ip }) => {
  if (rateLimited(`lookup:${ip}`, 30, 10 * 60 * 1000)) throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
  const order = await store.findCustomerOrder(body.orderNumber, body.phone);
  if (order.payment_method !== 'online' || order.order_status !== 'pending_payment') throw new HttpError(400, 'This order does not need a payment.');
  return { order: store.publicOrder(order), payment: await startOnlinePayment(order) };
});

route('POST', '/api/payments/verify', async ({ body }) => {
  const ok = verifyPaymentSignature({
    razorpayOrderId: body.razorpay_order_id,
    razorpayPaymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  });
  if (!ok) throw new HttpError(400, 'Payment could not be verified. If money was deducted, it will be confirmed automatically or refunded by Razorpay.');
  const order = await store.markPaid(body.razorpay_order_id, body.razorpay_payment_id);
  if (!order) throw new HttpError(404, 'Order not found.');
  return { order: store.publicOrder(order) };
});

// Razorpay webhook: https://YOUR-SITE/api/payments/webhook with events payment.captured + order.paid
route('POST', '/api/payments/webhook', async ({ rawBody, req }) => {
  if (!verifyWebhookSignature(rawBody, req.headers.get('x-razorpay-signature'))) throw new HttpError(400, 'Invalid signature.');
  const event = JSON.parse(rawBody);
  const payment = event?.payload?.payment?.entity;
  const rzpOrderId = event?.payload?.order?.entity?.id || payment?.order_id;
  if ((event.event === 'payment.captured' || event.event === 'order.paid') && rzpOrderId) {
    await store.markPaid(rzpOrderId, payment?.id);
  }
  return { ok: true };
}, { raw: true });

// ---------------- Blog ----------------

route('GET', '/api/posts', ({ query }) => blog.listPosts({
  category: query.get('category') || undefined,
  q: (query.get('q') || '').trim().slice(0, 60) || undefined,
  limit: query.get('limit'),
}));

route('GET', '/api/posts/:slug', async ({ params }) => {
  const post = await blog.getPostBySlug(decodeURIComponent(params.slug));
  if (!post) throw new HttpError(404, 'This article does not exist or has been removed.');
  return post;
});

// ---------------- Admin API ----------------

route('POST', '/api/admin/login', ({ body, ip }) => {
  if (!settings.adminPassword || !settings.sessionSecret) throw new HttpError(503, 'Admin login is not set up. Add ADMIN_PASSWORD and SESSION_SECRET in Netlify environment variables.');
  if (rateLimited(`login:${ip}`, 10, 15 * 60 * 1000)) throw new HttpError(429, 'Too many sign-in attempts. Wait 15 minutes and try again.');
  if (!checkPassword(body.password)) throw new HttpError(401, 'Wrong password.');
  return { __headers: { 'Set-Cookie': sessionCookie() }, ok: true };
}, { noDb: true });

route('POST', '/api/admin/logout', () => ({ __headers: { 'Set-Cookie': clearCookie() }, ok: true }), { noDb: true });
route('GET', '/api/admin/me', ({ req }) => ({ signedIn: isAdmin(req.headers.get('cookie')) }), { noDb: true });

route('GET', '/api/admin/stats', ({ req }) => { requireAdmin(req); return store.adminStats(); });

route('GET', '/api/admin/orders', ({ req, query }) => {
  requireAdmin(req);
  return store.adminListOrders({ status: query.get('status'), q: (query.get('q') || '').trim().slice(0, 60), offset: query.get('offset') });
});

route('GET', '/api/admin/orders/:id', async ({ req, params }) => {
  requireAdmin(req);
  const o = await store.getOrderById(Number(params.id) || 0);
  if (!o) throw new HttpError(404, 'Order not found.');
  return o;
});

route('PATCH', '/api/admin/orders/:id', ({ req, params, body }) => {
  requireAdmin(req);
  return store.adminUpdateOrderStatus(Number(params.id) || 0, body.order_status);
});

route('GET', '/api/admin/products', ({ req }) => { requireAdmin(req); return store.listProducts({ includeInactive: true, sort: 'name' }); });
route('POST', '/api/admin/products', ({ req, body }) => { requireAdmin(req); return store.createProduct(body); });
route('PUT', '/api/admin/products/:id', ({ req, params, body }) => { requireAdmin(req); return store.updateProduct(Number(params.id) || 0, body); });
route('DELETE', '/api/admin/products/:id', async ({ req, params }) => { requireAdmin(req); await store.deleteProduct(Number(params.id) || 0); return { ok: true }; });

route('GET', '/api/admin/posts', ({ req }) => { requireAdmin(req); return blog.listPosts({ includeDrafts: true }); });
route('GET', '/api/admin/posts/:id', async ({ req, params }) => {
  requireAdmin(req);
  const post = await blog.getPostById(Number(params.id) || 0);
  if (!post) throw new HttpError(404, 'Post not found.');
  return post;
});
route('POST', '/api/admin/posts', ({ req, body }) => { requireAdmin(req); return blog.createPost(body); }, { bodyLimit: 512 * 1024 });
route('PUT', '/api/admin/posts/:id', ({ req, params, body }) => { requireAdmin(req); return blog.updatePost(Number(params.id) || 0, body); }, { bodyLimit: 512 * 1024 });
route('DELETE', '/api/admin/posts/:id', async ({ req, params }) => { requireAdmin(req); await blog.deletePost(Number(params.id) || 0); return { ok: true }; });

// Image upload as base64 JSON: { filename, data }
route('POST', '/api/admin/upload', async ({ req, body }) => {
  requireAdmin(req);
  return { url: await saveImage(body.data) };
}, { bodyLimit: 5 * 1024 * 1024, noDb: true });

// ---------------- Handler ----------------

export default async function handler(req, context) {
  const url = new URL(req.url);

  if (url.pathname.startsWith('/uploads/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    return imageResponse(decodeURIComponent(url.pathname.slice('/uploads/'.length)));
  }

  try {
    const match = routes.find((r) => r.method === req.method && r.regex.test(url.pathname));
    if (!match) throw new HttpError(404, 'Not found.');
    const values = url.pathname.match(match.regex).slice(1);
    const params = Object.fromEntries(match.keys.map((k, i) => [k, values[i]]));

    let body = {}; let rawBody = '';
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      rawBody = await req.text();
      if (rawBody.length > (match.opts.bodyLimit || 100 * 1024)) throw new HttpError(413, 'Request is too large.');
      if (!match.opts.raw) {
        if (!(req.headers.get('content-type') || '').includes('application/json')) throw new HttpError(415, 'Send JSON.');
        try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { throw new HttpError(400, 'Invalid JSON.'); }
        if (!body || typeof body !== 'object') body = {};
      }
    }
    const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
    const run = () => match.handler({ req, params, query: url.searchParams, body, rawBody, ip });
    const result = match.opts.noDb ? await run() : await withRequestDb(run);
    const headers = result?.__headers || {};
    if (result?.__headers) delete result.__headers;
    return json(200, result ?? { ok: true }, headers);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    return json(status, { error: status === 500 ? 'Something went wrong on our side. Try again.' : err.message });
  }
}

// Netlify routing: this function answers these URL paths.
export const config = {
  path: ['/api/*', '/uploads/*'],
};
