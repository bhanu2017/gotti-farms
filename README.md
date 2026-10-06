# Gotti Farms online store

A complete online store for Gotti Farms: home page, product catalogue, cart, checkout with Razorpay (UPI, cards, net banking, wallets) and cash on delivery, order tracking for customers, and an admin panel for managing orders and products.

It has **no npm dependencies**. It runs on Node.js alone and stores data in a single SQLite file, so there is nothing to install apart from Node.

## 1. Run it on your computer

1. Install **Node.js 22.13 or newer** (the LTS version from https://nodejs.org is fine).
2. In this folder, copy `.env.example` to `.env` and set at least `ADMIN_PASSWORD` and `SESSION_SECRET`.
3. Start the store:
   ```
   npm start
   ```
4. Open http://localhost:3000 for the shop and http://localhost:3000/admin for the admin panel.

On first start the store creates `data/store.db` and fills it with the sample products from your design. Edit or delete them from the admin panel.

Cash on delivery works straight away. Online payment turns on when you add Razorpay keys (next section).

## 2. Turn on online payments (Razorpay)

1. Create an account at https://dashboard.razorpay.com.
2. Go to **Account & Settings → API Keys** and generate **test** keys.
3. Put them in `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxx
   ```
4. Restart the store and place a test order. Razorpay's test mode lets you pay with test UPI IDs and cards (listed in Razorpay's docs) without moving real money.
5. **Set up the webhook** (important for real orders): in the Razorpay dashboard go to **Webhooks → Add new webhook**, use the URL `https://YOUR-DOMAIN/api/payments/webhook`, tick the events `payment.captured` and `order.paid`, choose a secret, and put that secret in `.env` as `RAZORPAY_WEBHOOK_SECRET`. This confirms orders even if the customer closes the browser right after paying.
6. When Razorpay activates your account (KYC done), swap the test keys for **live** keys (`rzp_live_...`).

How payment safety works: prices are always recalculated on the server from the database, so a customer can't change a price in the browser. An order is marked paid only after the Razorpay signature is verified on the server.

## 3. Put it online

The site needs a host that runs Node.js and keeps files between restarts (for the database and uploaded photos).

Good options:
- **A small VPS** (Hostinger VPS, DigitalOcean, AWS Lightsail, around ₹400–800/month). Install Node 22, copy this folder, create `.env`, and run it with a process manager such as `pm2` (`npm i -g pm2`, then `pm2 start npm --name gotti -- start`). Put Nginx or Caddy in front for HTTPS. Caddy gets HTTPS certificates automatically.
- **Render or Railway**: create a Node web service, set the start command to `npm start`, add the `.env` values as environment variables, and **attach a persistent disk** mounted at the `data` folder (and `public/uploads`). Without a persistent disk you lose orders on every redeploy.

Before going live:
- Set `NODE_ENV=production` (makes the admin login cookie HTTPS-only).
- Use a long, unique `ADMIN_PASSWORD` and a random `SESSION_SECRET`.
- Use HTTPS. Razorpay requires it for live payments.
- Back up `data/store.db` regularly (it holds all orders and products). Copying the file is enough.

## 4. Managing the store (admin panel)

Open `/admin` and sign in with `ADMIN_PASSWORD`.

**Orders tab:** see today's orders, orders waiting to ship, revenue from the last 30 days, and low-stock warnings. Click an order to see the items and address and to move it through *Confirmed → Packed → Out for delivery → Delivered*. Cancelling returns the stock. Marking a cash order delivered marks it paid. Refunds for online orders are issued from the Razorpay dashboard.

**Products tab:** add products, change prices and stock, upload photos, choose which products appear on the home page, and hide products without deleting them.

**Farmer Tips tab:** write and edit blog posts in English and Telugu. Each post has a topic (Pests, Diseases, Soil, Water, General), a cover photo, a short summary, and the article. Untick **Published** to keep a post as a draft. The Telugu version is optional; if it's missing, Telugu readers see the English version with a note.

Writing format for articles:
- Leave an empty line between paragraphs.
- `## Heading` for a section heading, `### Heading` for a smaller one.
- `- item` for bullet points, `1. step` for numbered steps.
- `**words**` for bold.

Customers can check their order at `/track` with their order number and mobile number.

## 4b. The farmer blog

- Blog list: `/blog` (filter by topic, search in English or Telugu, switch language with the English / తెలుగు buttons).
- Each article has its own link, for example `/blog/how-to-take-a-soil-sample`, which you can share on WhatsApp. Add `?lang=te` to open it in Telugu.
- The site remembers each visitor's language choice.
- The home page shows the 3 newest published tips.
- Four starter articles are added on first run (whitefly and aphid control, chilli leaf curl, soil sampling, drip irrigation and mulching). **Have an agriculture expert and a native Telugu reader check them before going live**, and edit them from the admin panel as needed.

## 5. Making changes

| What you want to change | Where |
| --- | --- |
| Phone, email, WhatsApp number, delivery fee, free-delivery limit, cash on delivery on/off | `.env` |
| Products, prices, stock, photos | Admin panel |
| Colours, fonts, spacing | `public/css/style.css` (colour variables at the top) |
| Header menu and footer links | `renderLayout()` in `public/js/app.js` |
| Home page text and sections | `public/index.html` |
| Hero, about and process photos | Replace files in `public/images/` (keep the same names) |
| Product categories | `categories` list in `src/db.js` (applies to a new database), or edit the `categories` table directly |
| Blog posts | Admin panel → Farmer Tips |
| Blog topics, page text in both languages | `public/js/blog-common.js` (and `POST_CATEGORIES` in `src/blog.js`) |
| Order rules (stock checks, delivery fee logic) | `src/store.js` |
| API routes | `server.js` |

The images in `public/images` were cut from your design mockup so the site looks right from day one. Replace them with real, higher-resolution photos of your farm and products when you have them.

## Project layout

```
server.js            HTTP server, API routes, static files
src/config.js        Settings read from .env
src/db.js            Database tables and first-run sample data
src/store.js         Products, orders, stock, payments logic
src/razorpay.js      Razorpay order creation and signature checks
src/auth.js          Admin login sessions and rate limiting
src/blog.js          Blog posts table, starter articles, queries
public/              The website (HTML, CSS, JS, images)
public/uploads/      Product photos uploaded from the admin panel
data/store.db        The database (created on first run)
```
