import crypto from 'node:crypto';

// Load .env if present (Node 22 built-in, no dotenv needed)
try { process.loadEnvFile(); } catch { /* no .env file */ }

const env = process.env;
const rupees = (v, d) => Math.round((Number(v ?? d) || 0) * 100);

if (!env.SESSION_SECRET) {
  console.warn('[config] SESSION_SECRET is not set. Admin sessions will reset every restart.');
}
if (!env.ADMIN_PASSWORD) {
  console.warn('[config] ADMIN_PASSWORD is not set. The admin panel is disabled.');
}

export const config = {
  port: Number(env.PORT) || 3000,
  isProd: env.NODE_ENV === 'production',
  store: {
    name: env.STORE_NAME || 'Gotti Farms',
    phone: env.STORE_PHONE || '+91 98765 43210',
    email: env.STORE_EMAIL || 'info@gottifarms.com',
    whatsapp: (env.STORE_WHATSAPP || '').replace(/\D/g, ''),
  },
  deliveryFee: rupees(env.DELIVERY_FEE, 40),
  freeDeliveryAbove: rupees(env.FREE_DELIVERY_ABOVE, 499),
  codEnabled: env.COD_ENABLED !== 'false',
  adminPassword: env.ADMIN_PASSWORD || '',
  sessionSecret: env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID || '',
    keySecret: env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || '',
    apiBase: env.RAZORPAY_API_BASE || 'https://api.razorpay.com',
  },
  dbPath: env.DB_PATH || './data/store.db',
};

export const razorpayEnabled = () => Boolean(config.razorpay.keyId && config.razorpay.keySecret);
