import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

fs.mkdirSync(path.dirname(path.resolve(config.dbPath)), { recursive: true });

export const db = new DatabaseSync(config.dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,          -- slug, e.g. "vegetables"
    name        TEXT NOT NULL,
    image       TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    category_id  TEXT NOT NULL REFERENCES categories(id),
    price        INTEGER NOT NULL,          -- in paise (₹1 = 100)
    unit         TEXT NOT NULL DEFAULT 'kg',
    image        TEXT NOT NULL DEFAULT '',
    description  TEXT NOT NULL DEFAULT '',
    stock        INTEGER NOT NULL DEFAULT 0,
    featured     INTEGER NOT NULL DEFAULT 0,
    active       INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number         TEXT NOT NULL UNIQUE,
    customer_name        TEXT NOT NULL,
    phone                TEXT NOT NULL,
    email                TEXT NOT NULL DEFAULT '',
    address              TEXT NOT NULL,
    city                 TEXT NOT NULL,
    state                TEXT NOT NULL,
    pincode              TEXT NOT NULL,
    notes                TEXT NOT NULL DEFAULT '',
    subtotal             INTEGER NOT NULL,
    delivery_fee         INTEGER NOT NULL,
    total                INTEGER NOT NULL,
    payment_method       TEXT NOT NULL,     -- online | cod
    payment_status       TEXT NOT NULL,     -- pending | paid | failed | cod
    order_status         TEXT NOT NULL,     -- pending_payment | confirmed | packed | shipped | delivered | cancelled
    razorpay_order_id    TEXT UNIQUE,
    razorpay_payment_id  TEXT,
    stock_deducted       INTEGER NOT NULL DEFAULT 0,
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL,
    name        TEXT NOT NULL,
    unit        TEXT NOT NULL,
    image       TEXT NOT NULL DEFAULT '',
    price       INTEGER NOT NULL,
    qty         INTEGER NOT NULL,
    line_total  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`);

/** Run fn inside a transaction. Rolls back if fn throws. */
export function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// ---------- First-run sample data (edit or delete from the admin panel) ----------
const hasCategories = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n > 0;
if (!hasCategories) {
  const categories = [
    ['grains', 'Grains', '/images/cat-grains.jpg', 1],
    ['vegetables', 'Vegetables', '/images/cat-vegetables.jpg', 2],
    ['fruits', 'Fruits', '/images/cat-fruits.jpg', 3],
    ['seeds', 'Seeds', '/images/cat-seeds.jpg', 4],
    ['plants', 'Plants', '/images/cat-plants.jpg', 5],
    ['organic-inputs', 'Organic Inputs', '/images/cat-organic-inputs.jpg', 6],
  ];
  // [name, category, price ₹, unit, image, description, stock, featured]
  const products = [
    ['Organic Rice', 'grains', 120, 'kg', '/images/p-organic-rice.jpg', 'Naturally grown rice, hand-cleaned and sun-dried on our farm.', 200, 1],
    ['Fresh Tomatoes', 'vegetables', 60, 'kg', '/images/p-fresh-tomatoes.jpg', 'Ripe, juicy tomatoes picked the morning they ship.', 80, 1],
    ['Natural Turmeric', 'grains', 180, 'kg', '/images/p-natural-turmeric.jpg', 'Whole turmeric and powder, ground without additives.', 60, 1],
    ['Farm Fresh Chilli', 'vegetables', 100, 'kg', '/images/p-farm-fresh-chilli.jpg', 'Guntur-style green and red chillies with a strong kick.', 50, 1],
    ['Fresh Brinjal', 'vegetables', 50, 'kg', '/images/p-fresh-brinjal.jpg', 'Tender purple brinjal, ideal for curries and fries.', 70, 1],
    ['Organic Groundnut', 'grains', 140, 'kg', '/images/p-organic-groundnut.jpg', 'Raw groundnuts in shell, grown without chemical pesticides.', 90, 1],
    ['Sona Masoori Rice (5 kg)', 'grains', 550, 'bag', '/images/cat-grains.jpg', 'Everyday Sona Masoori rice in a 5 kg bag.', 40, 0],
    ['Mixed Greens Bundle', 'vegetables', 80, 'bundle', '/images/cat-vegetables.jpg', 'A seasonal mix of leafy greens and vegetables.', 30, 0],
    ['Seasonal Fruit Basket', 'fruits', 250, 'basket', '/images/cat-fruits.jpg', 'Mango, banana, orange and more, depending on the season.', 25, 0],
    ['Vegetable Seed Kit', 'seeds', 150, 'pack', '/images/cat-seeds.jpg', 'Five varieties of vegetable seeds for your kitchen garden.', 100, 0],
    ['Vegetable Saplings (Set of 5)', 'plants', 200, 'set', '/images/cat-plants.jpg', 'Healthy saplings ready to plant in pots or beds.', 40, 0],
    ['Organic Bio-Fertilizer', 'organic-inputs', 350, 'litre', '/images/cat-organic-inputs.jpg', 'Plant-based liquid fertilizer for vegetables and fruit trees.', 60, 0],
  ];
  tx(() => {
    const c = db.prepare('INSERT INTO categories (id, name, image, sort_order) VALUES (?, ?, ?, ?)');
    for (const row of categories) c.run(...row);
    const p = db.prepare(`INSERT INTO products (name, category_id, price, unit, image, description, stock, featured)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const [name, cat, price, unit, image, desc, stock, featured] of products) {
      p.run(name, cat, price * 100, unit, image, desc, stock, featured);
    }
  });
  console.log('[db] Added sample categories and products.');
}
