import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config, razorpayEnabled } from './src/config.js';
import { db } from './src/db.js';
import * as store from './src/store.js';
import * as blog from './src/blog.js';
import { HttpError } from './src/store.js';
import { createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature } from './src/razorpay.js';
import { checkPassword, sessionCookie, clearCookie, isAdmin, rateLimited } from './src/auth.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');

// ---------------- Tiny router ----------------
const routes = [];
const route = (method, pattern, handler, opts = {}) => {
  const keys = [];
  const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, regex, keys, handler, opts });
};

const send = (res, status, data, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
};

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Request is too large.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const clientIp = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';

function requireAdmin(req) {
  if (!isAdmin(req)) throw new HttpError(401, 'Sign in to continue.');
}

// ---------------- Public API ----------------

route('GET', '/api/config', () => ({
  store: config.store,
  deliveryFee: config.deliveryFee,
  freeDeliveryAbove: config.freeDeliveryAbove,
  codEnabled: config.codEnabled,
  onlinePaymentEnabled: razorpayEnabled(),
}));

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

route('GET', '/api/products/:id', ({ params }) => {
  const p = store.getProduct(Number(params.id));
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
      store.setRazorpayOrderId(order.id, rzpOrderId);
    } catch (err) {
      console.error(err);
      throw new HttpError(502, 'Could not reach the payment gateway. Try again in a minute, or choose cash on delivery.');
    }
  }
  return {
    keyId: config.razorpay.keyId,
    razorpayOrderId: rzpOrderId,
    amount: order.total,
    currency: 'INR',
    name: config.store.name,
    prefill: { name: order.customer_name, email: order.email, contact: order.phone },
  };
}

route('POST', '/api/orders', async ({ body, req }) => {
  if (rateLimited(`order:${clientIp(req)}`, 20, 10 * 60 * 1000)) throw new HttpError(429, 'Too many orders from this network. Wait a few minutes and try again.');
  if (body.paymentMethod === 'online' && !razorpayEnabled()) throw new HttpError(503, 'Online payment is not set up yet. Choose cash on delivery.');
  const order = store.createOrder(body);
  const result = { order: store.publicOrder(order) };
  if (order.payment_method === 'online') {
    try {
      result.payment = await startOnlinePayment(order);
    } catch (err) {
      store.markPaymentFailedToStart(order.id);
      throw err;
    }
  }
  return result;
});

route('POST', '/api/orders/lookup', ({ body, req }) => {
  if (rateLimited(`lookup:${clientIp(req)}`, 30, 10 * 60 * 1000)) throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
  return store.publicOrder(store.findCustomerOrder(body.orderNumber, body.phone));
});

// Retry payment for an unpaid online order
route('POST', '/api/orders/pay', async ({ body }) => {
  const order = store.findCustomerOrder(body.orderNumber, body.phone);
  if (order.payment_method !== 'online' || order.order_status !== 'pending_payment') throw new HttpError(400, 'This order does not need a payment.');
  return { order: store.publicOrder(order), payment: await startOnlinePayment(order) };
});

route('POST', '/api/payments/verify', ({ body }) => {
  const ok = verifyPaymentSignature({
    razorpayOrderId: body.razorpay_order_id,
    razorpayPaymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  });
  if (!ok) throw new HttpError(400, 'Payment could not be verified. If money was deducted, it will be confirmed automatically or refunded by Razorpay.');
  const order = store.markPaid(body.razorpay_order_id, body.razorpay_payment_id);
  if (!order) throw new HttpError(404, 'Order not found.');
  return { order: store.publicOrder(order) };
});

// Razorpay webhook: set URL https://yourdomain/api/payments/webhook, events payment.captured + order.paid
route('POST', '/api/payments/webhook', ({ rawBody, req }) => {
  if (!verifyWebhookSignature(rawBody, req.headers['x-razorpay-signature'])) throw new HttpError(400, 'Invalid signature.');
  const event = JSON.parse(rawBody);
  const payment = event?.payload?.payment?.entity;
  const rzpOrderId = event?.payload?.order?.entity?.id || payment?.order_id;
  if ((event.event === 'payment.captured' || event.event === 'order.paid') && rzpOrderId) {
    store.markPaid(rzpOrderId, payment?.id);
  }
  return { ok: true };
}, { raw: true });

// ---------------- Admin API ----------------

route('POST', '/api/admin/login', ({ body, req }) => {
  if (!config.adminPassword) throw new HttpError(503, 'Admin login is disabled. Set ADMIN_PASSWORD in the .env file.');
  if (rateLimited(`login:${clientIp(req)}`, 10, 15 * 60 * 1000)) throw new HttpError(429, 'Too many sign-in attempts. Wait 15 minutes and try again.');
  if (!checkPassword(body.password)) throw new HttpError(401, 'Wrong password.');
  return { __headers: { 'Set-Cookie': sessionCookie() }, ok: true };
});

route('POST', '/api/admin/logout', () => ({ __headers: { 'Set-Cookie': clearCookie() }, ok: true }));
route('GET', '/api/admin/me', ({ req }) => ({ signedIn: isAdmin(req) }));

route('GET', '/api/admin/stats', ({ req }) => { requireAdmin(req); return store.adminStats(); });

route('GET', '/api/admin/orders', ({ req, query }) => {
  requireAdmin(req);
  return store.adminListOrders({ status: query.get('status'), q: (query.get('q') || '').trim(), offset: query.get('offset') });
});

route('GET', '/api/admin/orders/:id', ({ req, params }) => {
  requireAdmin(req);
  const o = store.getOrderById(Number(params.id));
  if (!o) throw new HttpError(404, 'Order not found.');
  return o;
});

route('PATCH', '/api/admin/orders/:id', ({ req, params, body }) => {
  requireAdmin(req);
  return store.adminUpdateOrderStatus(Number(params.id), body.order_status);
});

route('GET', '/api/admin/products', ({ req }) => { requireAdmin(req); return store.listProducts({ includeInactive: true, sort: 'name' }); });
route('POST', '/api/admin/products', ({ req, body }) => { requireAdmin(req); return store.createProduct(body); });
route('PUT', '/api/admin/products/:id', ({ req, params, body }) => { requireAdmin(req); return store.updateProduct(Number(params.id), body); });
route('DELETE', '/api/admin/products/:id', ({ req, params }) => { requireAdmin(req); store.deleteProduct(Number(params.id)); return { ok: true }; });

// Image upload as base64 JSON: { filename, data }
route('POST', '/api/admin/upload', ({ req, body }) => {
  requireAdmin(req);
  const buf = Buffer.from(String(body.data || '').replace(/^data:[^,]+,/, ''), 'base64');
  if (!buf.length) throw new HttpError(400, 'Choose an image file.');
  if (buf.length > 3 * 1024 * 1024) throw new HttpError(400, 'Image must be smaller than 3 MB.');
  const ext = buf[0] === 0xff && buf[1] === 0xd8 ? 'jpg'
    : buf.subarray(0, 4).toString('hex') === '89504e47' ? 'png'
    : buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP' ? 'webp' : null;
  if (!ext) throw new HttpError(400, 'Upload a JPG, PNG or WebP image.');
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return { url: `/uploads/${name}` };
}, { bodyLimit: 5 * 1024 * 1024 });

// ---------------- Blog ----------------

route('GET', '/api/posts', ({ query }) => blog.listPosts({
  category: query.get('category') || undefined,
  q: (query.get('q') || '').trim().slice(0, 60) || undefined,
  limit: query.get('limit'),
}));

route('GET', '/api/posts/:slug', ({ params }) => {
  const post = blog.getPostBySlug(decodeURIComponent(params.slug));
  if (!post) throw new HttpError(404, 'This article does not exist or has been removed.');
  return post;
});

route('GET', '/api/admin/posts', ({ req }) => { requireAdmin(req); return blog.listPosts({ includeDrafts: true }); });
route('GET', '/api/admin/posts/:id', ({ req, params }) => {
  requireAdmin(req);
  const post = blog.getPostById(Number(params.id));
  if (!post) throw new HttpError(404, 'Post not found.');
  return post;
});
route('POST', '/api/admin/posts', ({ req, body }) => { requireAdmin(req); return blog.createPost(body); }, { bodyLimit: 512 * 1024 });
route('PUT', '/api/admin/posts/:id', ({ req, params, body }) => { requireAdmin(req); return blog.updatePost(Number(params.id), body); }, { bodyLimit: 512 * 1024 });
route('DELETE', '/api/admin/posts/:id', ({ req, params }) => { requireAdmin(req); blog.deletePost(Number(params.id)); return { ok: true }; });

// ---------------- Static files ----------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  if (!path.extname(rel)) rel += '.html'; // /shop -> shop.html
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return false;
  let stat;
  try { stat = fs.statSync(file); } catch { return false; }
  if (!stat.isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  const longCache = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.woff2'].includes(ext);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': longCache ? 'public, max-age=604800' : 'no-cache',
  });
  if (req.method === 'HEAD') return res.end(), true;
  fs.createReadStream(file).pipe(res);
  return true;
}

// ---------------- Server ----------------
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  const url = new URL(req.url, 'http://localhost');

  try {
    if (url.pathname.startsWith('/api/')) {
      const match = routes.find((r) => r.method === req.method && r.regex.test(url.pathname));
      if (!match) throw new HttpError(404, 'Not found.');
      const values = url.pathname.match(match.regex).slice(1);
      const params = Object.fromEntries(match.keys.map((k, i) => [k, values[i]]));
      let body = {}; let rawBody = '';
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        rawBody = await readBody(req, match.opts.bodyLimit || 100 * 1024);
        if (!match.opts.raw) {
          if (!(req.headers['content-type'] || '').includes('application/json')) throw new HttpError(415, 'Send JSON.');
          try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { throw new HttpError(400, 'Invalid JSON.'); }
        }
      }
      const result = await match.handler({ req, res, params, query: url.searchParams, body, rawBody });
      const headers = result?.__headers || {};
      if (result?.__headers) delete result.__headers;
      return send(res, 200, result ?? { ok: true }, headers);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed.');
    if (url.pathname === '/admin.html') { res.writeHead(301, { Location: '/admin' }); return res.end(); }
    // Pretty article links: /blog/<slug> is served by blog-post.html
    if (/^\/blog\/[\w-]+\/?$/.test(url.pathname) && serveStatic(req, res, '/blog-post.html')) return;
    if (serveStatic(req, res, url.pathname)) return;
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(PUBLIC_DIR, '404.html')).pipe(res);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) send(res, status, { error: status === 500 ? 'Something went wrong on our side. Try again.' : err.message });
    else res.end();
  }
});

server.listen(config.port, () => {
  console.log(`\n  ${config.store.name} is running at http://localhost:${config.port}`);
  console.log(`  Admin panel:  http://localhost:${config.port}/admin`);
  console.log(`  Online payments: ${razorpayEnabled() ? 'Razorpay ON' : 'OFF (add Razorpay keys to .env)'}`);
  console.log(`  Cash on delivery: ${config.codEnabled ? 'ON' : 'OFF'}\n`);
});

const shutdown = () => { server.close(() => { db.close(); process.exit(0); }); setTimeout(() => process.exit(0), 3000).unref(); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
