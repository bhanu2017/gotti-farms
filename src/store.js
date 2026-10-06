import crypto from 'node:crypto';
import { all, one, exec, tx } from './db.js';
import { config } from './config.js';
import { HttpError } from './errors.js';

export { HttpError };

// ---------------- Products & categories ----------------

const productColumns = `p.id, p.name, p.category_id, c.name AS category_name, p.price, p.unit, p.image,
  p.description, p.stock, p.featured, p.active, p.created_at`;

export function listCategories() {
  return all(`
    SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1)::int AS product_count
    FROM categories c ORDER BY c.sort_order, c.name`);
}

export function listProducts({ category, q, featured, ids, sort, includeInactive = false } = {}) {
  const where = [];
  const params = [];
  if (!includeInactive) where.push('p.active = 1');
  if (category) { where.push('p.category_id = ?'); params.push(category); }
  if (featured) where.push('p.featured = 1');
  if (q) { where.push('(p.name ILIKE ? OR p.description ILIKE ? OR c.name ILIKE ?)'); const like = `%${q}%`; params.push(like, like, like); }
  if (ids?.length) { where.push(`p.id IN (${ids.map(() => '?').join(',')})`); params.push(...ids); }
  const order = { price_asc: 'p.price ASC', price_desc: 'p.price DESC', name: 'p.name ASC', newest: 'p.created_at DESC' }[sort]
    || 'p.featured DESC, p.id ASC';
  return all(`SELECT ${productColumns} FROM products p JOIN categories c ON c.id = p.category_id
              ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}`, params);
}

export function getProduct(id) {
  return one(`SELECT ${productColumns} FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?`, [id]);
}

async function cleanProduct(input) {
  const name = String(input.name ?? '').trim();
  const category_id = String(input.category_id ?? '').trim();
  const priceRupees = Number(input.price_rupees);
  const unit = String(input.unit ?? '').trim();
  const stock = Number(input.stock);
  if (name.length < 2 || name.length > 120) throw new HttpError(400, 'Product name must be 2–120 characters.');
  if (!(await one('SELECT 1 AS ok FROM categories WHERE id = ?', [category_id]))) throw new HttpError(400, 'Choose a valid category.');
  if (!Number.isFinite(priceRupees) || priceRupees <= 0 || priceRupees > 1_000_000) throw new HttpError(400, 'Enter a price greater than ₹0.');
  if (!unit || unit.length > 30) throw new HttpError(400, 'Enter a unit, for example kg or pack.');
  if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) throw new HttpError(400, 'Stock must be a whole number, 0 or more.');
  const image = String(input.image ?? '').trim();
  if (image && !/^(\/(images|uploads)\/[\w.\-]+|https:\/\/\S+)$/.test(image)) throw new HttpError(400, 'Image must be an uploaded image or an https:// link.');
  return {
    name, category_id, unit, stock, image,
    price: Math.round(priceRupees * 100),
    description: String(input.description ?? '').trim().slice(0, 1000),
    featured: input.featured ? 1 : 0,
    active: input.active === false || input.active === 0 ? 0 : 1,
  };
}

export async function createProduct(input) {
  const p = await cleanProduct(input);
  const row = await one(`INSERT INTO products (name, category_id, price, unit, image, description, stock, featured, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  [p.name, p.category_id, p.price, p.unit, p.image, p.description, p.stock, p.featured, p.active]);
  return getProduct(row.id);
}

export async function updateProduct(id, input) {
  if (!(await getProduct(id))) throw new HttpError(404, 'Product not found.');
  const p = await cleanProduct(input);
  await exec('UPDATE products SET name=?, category_id=?, price=?, unit=?, image=?, description=?, stock=?, featured=?, active=? WHERE id=?',
    [p.name, p.category_id, p.price, p.unit, p.image, p.description, p.stock, p.featured, p.active, id]);
  return getProduct(id);
}

export async function deleteProduct(id) {
  // Past orders keep their own copy of name and price, so deleting is safe.
  const r = await exec('DELETE FROM products WHERE id = ?', [id]);
  if (!r.rowCount) throw new HttpError(404, 'Product not found.');
}

// ---------------- Orders ----------------

const ORDER_STATUSES = ['pending_payment', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

async function newOrderNumber() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // Date in India time
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  const date = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  for (;;) {
    const rand = Array.from(crypto.randomBytes(5), (b) => alphabet[b % alphabet.length]).join('');
    const num = `GF${date}-${rand}`;
    if (!(await one('SELECT 1 AS ok FROM orders WHERE order_number = ?', [num]))) return num;
  }
}

export const normalizePhone = (p) => String(p ?? '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');

function validateCustomer(c = {}) {
  const s = (v, max) => String(v ?? '').trim().slice(0, max);
  const customer = {
    name: s(c.name, 80), phone: normalizePhone(c.phone), email: s(c.email, 120),
    address: s(c.address, 300), city: s(c.city, 60), state: s(c.state, 60) || 'Andhra Pradesh',
    pincode: s(c.pincode, 6), notes: s(c.notes, 300),
  };
  if (customer.name.length < 2) throw new HttpError(400, 'Enter your full name.');
  if (!/^[6-9]\d{9}$/.test(customer.phone)) throw new HttpError(400, 'Enter a valid 10-digit mobile number.');
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new HttpError(400, 'Enter a valid email address, or leave it empty.');
  if (customer.address.length < 8) throw new HttpError(400, 'Enter your full delivery address: house number, street and area.');
  if (customer.city.length < 2) throw new HttpError(400, 'Enter your city or town.');
  if (!/^[1-9]\d{5}$/.test(customer.pincode)) throw new HttpError(400, 'Enter a valid 6-digit PIN code.');
  return customer;
}

export function deliveryFeeFor(subtotal) {
  return subtotal >= config.freeDeliveryAbove ? 0 : config.deliveryFee;
}

/**
 * Validate cart against current prices and stock, then save the order.
 * Prices always come from the database, never from the browser.
 */
export async function createOrder({ items, customer, paymentMethod }) {
  const c = validateCustomer(customer);
  if (!['online', 'cod'].includes(paymentMethod)) throw new HttpError(400, 'Choose a payment method.');
  if (paymentMethod === 'cod' && !config.codEnabled) throw new HttpError(400, 'Cash on delivery is not available right now.');
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Your cart is empty.');
  if (items.length > 50) throw new HttpError(400, 'Too many different items in one order.');

  const qtyById = new Map();
  for (const it of items) {
    const id = Number(it?.id); const qty = Number(it?.qty);
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(qty) || qty < 1 || qty > 99) throw new HttpError(400, 'Cart has an invalid item. Refresh the page and try again.');
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
  }
  const products = await listProducts({ ids: [...qtyById.keys()] });
  const lines = [];
  for (const [id, qty] of qtyById) {
    const p = products.find((x) => x.id === id);
    if (!p) throw new HttpError(409, 'An item in your cart is no longer available. Remove it and try again.');
    if (p.stock < qty) throw new HttpError(409, p.stock === 0 ? `${p.name} is out of stock. Remove it to continue.` : `Only ${p.stock} ${p.unit} of ${p.name} left. Lower the quantity to continue.`);
    lines.push({ product: p, qty, line_total: p.price * qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const delivery_fee = deliveryFeeFor(subtotal);
  const total = subtotal + delivery_fee;
  if (paymentMethod === 'online' && total < 100) throw new HttpError(400, 'Order total is too small for online payment.');

  const order_number = await newOrderNumber();
  return tx(async () => {
    const isCod = paymentMethod === 'cod';
    const row = await one(`INSERT INTO orders (order_number, customer_name, phone, email, address, city, state, pincode, notes,
        subtotal, delivery_fee, total, payment_method, payment_status, order_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [order_number, c.name, c.phone, c.email, c.address, c.city, c.state, c.pincode, c.notes,
      subtotal, delivery_fee, total, paymentMethod, isCod ? 'cod' : 'pending', isCod ? 'confirmed' : 'pending_payment']);
    for (const l of lines) {
      await exec('INSERT INTO order_items (order_id, product_id, name, unit, image, price, qty, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [row.id, l.product.id, l.product.name, l.product.unit, l.product.image, l.product.price, l.qty, l.line_total]);
    }
    if (isCod) await deductStock(row.id, { strict: true });
    return getOrderById(row.id);
  });
}

/** Reduce stock for an order's items. strict = fail if not enough (used before payment is taken). */
async function deductStock(orderId, { strict }) {
  const items = await all('SELECT product_id, qty, name FROM order_items WHERE order_id = ?', [orderId]);
  for (const it of items) {
    if (strict) {
      const r = await exec('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', [it.qty, it.product_id, it.qty]);
      if (!r.rowCount) throw new HttpError(409, `${it.name} just sold out. Lower the quantity or remove it.`);
    } else {
      // Payment already taken: never block, just floor at zero.
      await exec('UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?', [it.qty, it.product_id]);
    }
  }
  await exec('UPDATE orders SET stock_deducted = 1 WHERE id = ?', [orderId]);
}

async function restoreStock(orderId) {
  const items = await all('SELECT product_id, qty FROM order_items WHERE order_id = ?', [orderId]);
  for (const it of items) await exec('UPDATE products SET stock = stock + ? WHERE id = ?', [it.qty, it.product_id]);
  await exec('UPDATE orders SET stock_deducted = 0 WHERE id = ?', [orderId]);
}

export async function getOrderById(id) {
  const order = await one('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return null;
  order.items = await all('SELECT product_id, name, unit, image, price, qty, line_total FROM order_items WHERE order_id = ? ORDER BY id', [id]);
  return order;
}

export async function getOrderByNumber(orderNumber) {
  const row = await one('SELECT id FROM orders WHERE order_number = ?', [String(orderNumber ?? '').trim().toUpperCase()]);
  return row ? getOrderById(row.id) : null;
}

/** Order lookup for customers: needs order number + the phone used on the order. */
export async function findCustomerOrder(orderNumber, phone) {
  const order = await getOrderByNumber(orderNumber);
  if (!order || order.phone !== normalizePhone(phone)) throw new HttpError(404, 'No order matches that order number and mobile number.');
  return order;
}

export function publicOrder(o) {
  return {
    order_number: o.order_number, created_at: o.created_at, customer_name: o.customer_name,
    address: o.address, city: o.city, state: o.state, pincode: o.pincode,
    subtotal: o.subtotal, delivery_fee: o.delivery_fee, total: o.total,
    payment_method: o.payment_method, payment_status: o.payment_status, order_status: o.order_status,
    items: o.items,
  };
}

export async function setRazorpayOrderId(orderId, rzpOrderId) {
  await exec('UPDATE orders SET razorpay_order_id = ?, updated_at = now() WHERE id = ?', [rzpOrderId, orderId]);
}

export async function markPaymentFailedToStart(orderId) {
  await exec("UPDATE orders SET payment_status = 'failed', order_status = 'cancelled', updated_at = now() WHERE id = ?", [orderId]);
}

/** Mark an online order paid. Safe to call more than once (checkout callback + webhook). */
export function markPaid(razorpayOrderId, razorpayPaymentId) {
  return tx(async () => {
    const order = await one('SELECT * FROM orders WHERE razorpay_order_id = ? FOR UPDATE', [razorpayOrderId]);
    if (!order) return null;
    if (order.payment_status !== 'paid') {
      const nextStatus = order.order_status === 'pending_payment' || order.order_status === 'cancelled' ? 'confirmed' : order.order_status;
      await exec("UPDATE orders SET payment_status = 'paid', order_status = ?, razorpay_payment_id = ?, updated_at = now() WHERE id = ?",
        [nextStatus, razorpayPaymentId || '', order.id]);
      if (!order.stock_deducted) await deductStock(order.id, { strict: false });
    }
    return getOrderById(order.id);
  });
}

// ---------------- Admin ----------------

export async function adminListOrders({ status, q, limit = 100, offset = 0 } = {}) {
  const where = []; const params = [];
  if (status && ORDER_STATUSES.includes(status)) { where.push('order_status = ?'); params.push(status); }
  if (q) { where.push('(order_number ILIKE ? OR customer_name ILIKE ? OR phone ILIKE ?)'); const like = `%${q}%`; params.push(like, like, like); }
  const rows = await all(`SELECT id, order_number, customer_name, phone, city, total, payment_method, payment_status, order_status, created_at,
      (SELECT SUM(qty) FROM order_items WHERE order_id = orders.id)::int AS item_count
      FROM orders ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ? OFFSET ?`,
  [...params, Math.min(Number(limit) || 100, 500), Math.max(Number(offset) || 0, 0)]);
  return rows.map((r) => ({ ...r, item_count: Number(r.item_count) || 0 }));
}

export function adminUpdateOrderStatus(id, status) {
  if (!ORDER_STATUSES.includes(status) || status === 'pending_payment') throw new HttpError(400, 'Choose a valid status.');
  return tx(async () => {
    const locked = await one('SELECT id FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (!locked) throw new HttpError(404, 'Order not found.');
    const order = await getOrderById(id);
    if (order.order_status === 'cancelled') throw new HttpError(400, 'This order is cancelled and can no longer be changed.');
    if (order.order_status === 'pending_payment' && status !== 'cancelled') {
      throw new HttpError(400, 'This order has not been paid yet. You can only cancel it.');
    }
    let paymentStatus = order.payment_status;
    if (status === 'delivered' && order.payment_method === 'cod') paymentStatus = 'paid'; // cash collected
    await exec('UPDATE orders SET order_status = ?, payment_status = ?, updated_at = now() WHERE id = ?', [status, paymentStatus, id]);
    if (status === 'cancelled' && order.stock_deducted) await restoreStock(id);
    return getOrderById(id);
  });
}

export async function adminStats() {
  const n = async (sql) => Number((await one(sql))?.n) || 0;
  return {
    orders_today: await n(`SELECT COUNT(*) AS n FROM orders
      WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date AND order_status != 'pending_payment'`),
    to_ship: await n("SELECT COUNT(*) AS n FROM orders WHERE order_status IN ('confirmed','packed')"),
    revenue_30d: await n("SELECT COALESCE(SUM(total),0) AS n FROM orders WHERE payment_status = 'paid' AND created_at >= now() - interval '30 days'"),
    awaiting_payment: await n("SELECT COUNT(*) AS n FROM orders WHERE order_status = 'pending_payment'"),
    low_stock: await all('SELECT id, name, stock, unit FROM products WHERE active = 1 AND stock <= 10 ORDER BY stock'),
  };
}
