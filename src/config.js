// All settings come from environment variables.
// On Netlify: Site configuration -> Environment variables. Locally: the .env file (read by `netlify dev`).
const env = process.env;
const rupees = (v, d) => Math.round((Number(v ?? d) || 0) * 100);

export const config = {
  isProd: env.CONTEXT === 'production' || env.NODE_ENV === 'production',
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
  sessionSecret: env.SESSION_SECRET || '',
  // Any Postgres connection string works: Neon, Netlify Database, Supabase.
  databaseUrl: env.DATABASE_URL || env.NETLIFY_DB_URL || env.NETLIFY_DATABASE_URL || '',
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID || '',
    keySecret: env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || '',
    apiBase: env.RAZORPAY_API_BASE || 'https://api.razorpay.com',
  },
};

export const razorpayEnabled = () => Boolean(config.razorpay.keyId && config.razorpay.keySecret);
