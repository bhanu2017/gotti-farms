// Postgres access for Netlify Functions.
// Each request gets its own connection, opened on first use and closed when the request ends.
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { config } from './config.js';
import { HttpError } from './errors.js';
import { STARTER_POSTS } from './seed-posts.js';

const requestContext = new AsyncLocalStorage();

/** Write SQL with ? placeholders; this turns them into Postgres $1, $2 … */
function toPg(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

/** Run fn with a database connection scoped to this request. */
export function withRequestDb(fn) {
  const state = { clientPromise: null };
  return requestContext.run(state, async () => {
    try {
      return await fn();
    } finally {
      if (state.clientPromise) {
        const client = await state.clientPromise.catch(() => null);
        await client?.end().catch(() => {});
      }
    }
  });
}

async function connect() {
  if (!config.databaseUrl) throw new HttpError(503, 'The store database is not connected yet. Add DATABASE_URL in Netlify environment variables.');
  const client = new pg.Client({ connectionString: config.databaseUrl, connectionTimeoutMillis: 8000 });
  await client.connect();
  await ensureSchema(client);
  return client;
}

function client() {
  const state = requestContext.getStore();
  if (!state) throw new Error('Database used outside a request.');
  state.clientPromise ??= connect();
  return state.clientPromise;
}

/** Run a statement. Returns { rows, rowCount }. */
export async function exec(sql, params = []) {
  const c = await client();
  const r = await c.query(toPg(sql), params);
  return { rows: r.rows, rowCount: r.rowCount };
}
export const all = async (sql, params) => (await exec(sql, params)).rows;
export const one = async (sql, params) => (await exec(sql, params)).rows[0];

/** Run fn inside a transaction on this request's connection. */
export async function tx(fn) {
  const c = await client();
  await c.query('BEGIN');
  try {
    const result = await fn();
    await c.query('COMMIT');
    return result;
  } catch (err) {
    await c.query('ROLLBACK').catch(() => {});
    throw err;
  }
}

// ---------------- Tables (created automatically on first use) ----------------

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    image       TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS products (
    id           SERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    category_id  TEXT NOT NULL REFERENCES categories(id),
    price        INTEGER NOT NULL,
    unit         TEXT NOT NULL DEFAULT 'kg',
    image        TEXT NOT NULL DEFAULT '',
    description  TEXT NOT NULL DEFAULT '',
    stock        INTEGER NOT NULL DEFAULT 0,
    featured     INTEGER NOT NULL DEFAULT 0,
    active       INTEGER NOT NULL DEFAULT 1,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS orders (
    id                   SERIAL PRIMARY KEY,
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
    payment_method       TEXT NOT NULL,
    payment_status       TEXT NOT NULL,
    order_status         TEXT NOT NULL,
    razorpay_order_id    TEXT UNIQUE,
    razorpay_payment_id  TEXT,
    stock_deducted       INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL,
    name        TEXT NOT NULL,
    unit        TEXT NOT NULL,
    image       TEXT NOT NULL DEFAULT '',
    price       INTEGER NOT NULL,
    qty         INTEGER NOT NULL,
    line_total  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS posts (
    id          SERIAL PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    category    TEXT NOT NULL DEFAULT 'general',
    image       TEXT NOT NULL DEFAULT '',
    title_en    TEXT NOT NULL,
    summary_en  TEXT NOT NULL DEFAULT '',
    body_en     TEXT NOT NULL,
    title_te    TEXT NOT NULL DEFAULT '',
    summary_te  TEXT NOT NULL DEFAULT '',
    body_te     TEXT NOT NULL DEFAULT '',
    published   INTEGER NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published, created_at);
`;

const CATEGORIES = [
  ['grains', 'Grains', '/images/cat-grains.jpg', 1],
  ['vegetables', 'Vegetables', '/images/cat-vegetables.jpg', 2],
  ['fruits', 'Fruits', '/images/cat-fruits.jpg', 3],
  ['seeds', 'Seeds', '/images/cat-seeds.jpg', 4],
  ['plants', 'Plants', '/images/cat-plants.jpg', 5],
  ['organic-inputs', 'Organic Inputs', '/images/cat-organic-inputs.jpg', 6],
];
// [name, category, price ₹, unit, image, description, stock, featured]
const PRODUCTS = [
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

let schemaReady = null; // once per function instance

function ensureSchema(c) {
  schemaReady ??= (async () => {
    await c.query(SCHEMA);
    // Seed sample data once. The lock stops two first visitors from seeding twice.
    await c.query('BEGIN');
    try {
      await c.query('SELECT pg_advisory_xact_lock(724501)');
      const count = async (table) => Number((await c.query(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n);
      if (await count('categories') === 0) {
        for (const row of CATEGORIES) {
          await c.query(toPg('INSERT INTO categories (id, name, image, sort_order) VALUES (?, ?, ?, ?)'), row);
        }
        for (const [name, cat, price, unit, image, desc, stock, featured] of PRODUCTS) {
          await c.query(toPg(`INSERT INTO products (name, category_id, price, unit, image, description, stock, featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`), [name, cat, price * 100, unit, image, desc, stock, featured]);
        }
      }
      if (await count('posts') === 0) {
        let i = 0;
        for (const p of STARTER_POSTS) {
          const created = new Date(Date.now() - i++ * 86400000).toISOString();
          await c.query(toPg(`INSERT INTO posts (slug, category, image, title_en, summary_en, body_en, title_te, summary_te, body_te, published, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`),
            [p.slug, p.category, p.image, p.title_en, p.summary_en, p.body_en, p.title_te, p.summary_te, p.body_te, created, created]);
        }
      }
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK').catch(() => {});
      throw err;
    }
  })().catch((err) => { schemaReady = null; throw err; });
  return schemaReady;
}
