# Gotti Farms online store (Netlify version)

Online store for Gotti Farms: home page, product catalogue, cart, checkout with Razorpay (UPI, cards, net banking) and cash on delivery, order tracking, an admin panel, and a farmer blog in English and Telugu.

## How it runs on Netlify

| Part | Where it lives |
| --- | --- |
| Website pages, CSS, JS, images | `public/` (served by Netlify) |
| All server logic (`/api/*`) | One Netlify Function: `netlify/functions/api.mjs` |
| Products, orders, blog posts | Postgres database (Neon, Netlify Database, or Supabase) via `DATABASE_URL` |
| Photos uploaded in the admin panel | Netlify Blobs, served at `/uploads/...` |

Tables and sample data (12 products, 4 farmer-tip articles) are created automatically the first time the site talks to an empty database.

## Settings (environment variables)

Set these in **Netlify → Site configuration → Environment variables**, and in a `.env` file for local testing (copy `.env.example`).

| Name | What it is |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. With Neon, use the **pooled** connection string. |
| `ADMIN_PASSWORD` | Password for `/admin` |
| `SESSION_SECRET` | Long random string that signs admin logins |
| `STORE_PHONE`, `STORE_EMAIL`, `STORE_WHATSAPP` | Shown on the site (WhatsApp as digits with country code, e.g. 919876543210) |
| `DELIVERY_FEE`, `FREE_DELIVERY_ABOVE`, `COD_ENABLED` | Delivery charges in rupees, and cash on delivery on/off |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Online payments. Leave empty until you have **live** keys. |

If you use Netlify's own database instead of Neon, you don't need `DATABASE_URL`: the code also reads `NETLIFY_DB_URL` (and the older `NETLIFY_DATABASE_URL`) automatically.

After changing environment variables on Netlify, redeploy (**Deploys → Trigger deploy**) so the function picks them up.

## Test on your computer

```
npm install -g netlify-cli
npm install
cp .env.example .env      # then fill in DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET
netlify dev
```

Open http://localhost:8888. `netlify dev` runs the website, the function, and a local version of Netlify Blobs.

Your computer and the live site can share the same database. If you want test orders kept apart, create a second database (or a Neon "branch") for testing and use its connection string in `.env`.

## Deploy

Push to the GitHub branch connected to Netlify. Netlify deploys every push automatically.

## Razorpay webhook

Webhook URL: `https://YOUR-DOMAIN/api/payments/webhook`, events `payment.captured` and `order.paid`. Put the webhook secret in `RAZORPAY_WEBHOOK_SECRET`.

## Making changes

| What | Where |
| --- | --- |
| Products, prices, stock, photos, blog posts | Admin panel at `/admin` |
| Colours, fonts, spacing | `public/css/style.css` |
| Header menu and footer | `renderLayout()` in `public/js/app.js` |
| Home page text | `public/index.html` |
| Blog topics and page text in both languages | `public/js/blog-common.js` and `POST_CATEGORIES` in `src/blog.js` |
| Order rules, stock, delivery fee | `src/store.js` |
| API routes | `netlify/functions/api.mjs` |
| Database tables and sample data | `src/db.js` |
| Redirects and headers | `netlify.toml` |

## Free-tier notes

- Neon's free database pauses when idle, so the first visit after a quiet period can take a second or two longer.
- Netlify and Neon free plans have monthly limits (function calls, bandwidth, database storage and compute). A small farm store normally fits, but check both dashboards occasionally.
- Back up your data: Neon lets you restore to an earlier point in time within a limited window on each plan. For a long-term copy, export the database now and then from the Neon console.

## Project layout

```
netlify.toml                 Netlify settings, redirects, headers
netlify/functions/api.mjs    All /api routes and /uploads images
src/config.js                Settings from environment variables
src/db.js                    Postgres connection, tables, sample data
src/store.js                 Products, orders, stock, payments logic
src/blog.js                  Farmer blog posts
src/seed-posts.js            The 4 starter articles (English + Telugu)
src/files.js                 Photo uploads (Netlify Blobs)
src/razorpay.js              Razorpay order creation and signature checks
src/auth.js                  Admin login and rate limiting
public/                      The website
```
