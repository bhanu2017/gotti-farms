# Gotti Farms – October 2026 update

All 13 requested changes. Deploy them together (see "How to deploy" at the end).

## 1. Fill in these placeholders

### Contact and business details: one file, used across the whole site
**`public/js/site-info.js`**

| Placeholder | What to write | Example |
|---|---|---|
| `[PHONE]` | Phone number as people should read it | `+91 83091 83156` |
| `[WHATSAPP]` | WhatsApp number, country code, digits only | `918309183156` |
| `[EMAIL]` | Email address | `gottifarms018@gmail.com` |
| `[ADDRESS]` | Full farm address | `Gotti Farms, Village, Mandal, Guntur Dist., AP 522xxx` |
| `[FSSAI NUMBER]` | 14-digit FSSAI licence number | |
| `[DELIVERY AREAS]` | Where you deliver | `Guntur, Vijayawada, Tenali and nearby towns` |
| `[DELIVERY DAYS]` | Usual delivery time | `2–4 days` |
| `[REFERRAL DISCOUNT]` | What each person gets for a referral | `₹50 off` |
| `[GA_ID]` | Google Analytics 4 ID (leave as is to keep analytics off) | `G-ABC123XYZ` |

Social links (`facebook`, `instagram`, `youtube`) are optional; icons appear when filled.
Until phone, WhatsApp and email are filled here, the site uses the STORE_PHONE / STORE_EMAIL / STORE_WHATSAPP values already set on Netlify.

### Home page: `public/index.html`
- `[SEARCH_CONSOLE_CODE]`: Google Search Console verification code (HTML tag method)
- Customer Reviews: `[CUSTOMER NAME 1–3]`, `[TOWN]` and the review text in square brackets
- Meet Our Farmers: `[FARMER NAME 1–3]`, `[VILLAGE NAME]`, what they grow
- Photos: put photos in `public/images/` (WebP or JPG) and change the `src` of the matching `<img>`

### Information pages
- `public/about.html`: `[VILLAGE / MANDAL]`, `[DISTRICT]`, `[YEAR STARTED]`, `[FARM SIZE]`, `[OWNER NAME]`, `[FAMILY / TEAM DETAILS]`
- `public/contact.html`: `[OPENING HOURS]`
- `public/shipping-policy.html`: `[EFFECTIVE DATE]`, `[DELIVERY CHARGE]`, `[NUMBER]` (delivery attempts)
- `public/refund-policy.html`: `[EFFECTIVE DATE]`, `[24 HOURS]`, `[3 DAYS]`, `[5–7 WORKING DAYS]`
- `public/privacy-policy.html`: `[EFFECTIVE DATE]`
- `public/terms.html`: `[EFFECTIVE DATE]`, `[CITY]` (courts for disputes)

Phone, WhatsApp, email, address, FSSAI and delivery placeholders on these pages are filled automatically from `site-info.js`.

### Optional Netlify settings (Site configuration → Environment variables)
| Name | Default | Meaning |
|---|---|---|
| `SITE_URL` | `https://gugulefarms.com` | Address used in link previews and the sitemap |
| `FIRST_ORDER_CODE` | `WELCOME10` | Code shown in the first-order pop-up |
| `FIRST_ORDER_PERCENT` | `10` | % off the first order (0 turns the offer off) |
| `FIRST_ORDER_MAX_DISCOUNT` | `100` | Most the code can take off, in ₹ |

## 2. What changed

| # | Change | Files |
|---|---|---|
| 1 | Home and shop pages (plus product pages and articles) are built on the server, so Google and WhatsApp see real products | `netlify/functions/pages.mjs` (new), `public/js/render.js` (new), `home.js`, `shop.js`, `app.js`, `netlify.toml`, `package.json`, `api.mjs` |
| 2 | Shop by Category cards: Rice, Vegetables, Turmeric, Groundnut, Seeds, Plants | `index.html`, `images/cat-rice/turmeric/groundnut.*`, `src/db.js` (moves products into the new categories once) |
| 3 | Phone, WhatsApp, email and address in the top bar and footer; floating "Order on WhatsApp" button | `site-info.js` (new), `app.js`, `style.css` |
| 4 | Weight options (1 kg / 5 kg / 25 kg) with price per kg; product pages with a sticky Add to cart bar on phones; accepted payments and delivery note near cart and checkout | `product.html`, `product.js` (new), `render.js`, `cart.js`, `track.js`, `admin.js`, `src/store.js`, `src/db.js` |
| 5 | English / తెలుగు switch in the header; menus, headings and buttons translated | `i18n.js`, `i18n-te.js` (new), all pages, `blog-common.js` |
| 6 | Customer Reviews, Meet Our Farmers, FSSAI number in the footer | `index.html`, `app.js`, `images/avatar-placeholder.svg`, `images/farmer-placeholder.svg` |
| 7 | "Organic" replaced with "Naturally Grown" (stats, product and category names). "Organic carbon" in the soil-testing article stays, because it is the name of a soil test value | `index.html`, `src/db.js`, `src/seed-posts.js` |
| 8 | About Us, Contact Us, Shipping, Refund & Return, Privacy, Terms pages, linked in the footer | 6 new `.html` pages |
| 9 | Recipes & Health section (/recipes) with list and post pages, plus two articles in English and Telugu | `recipes.html` (new), `blog.js`, `blog-post.js`, `src/blog.js`, `src/seed-posts.js` |
| 10 | First-order pop-up (once per visitor, never on the cart page) that gives a discount code; the code works at checkout for first orders; sign-ups listed in admin; Refer a Friend section | `app.js`, `cart.js`, `api.mjs`, `src/store.js`, `admin.js`, `index.html` |
| 11 | Own title and description on every page, link-preview tags, product schema, sitemap.xml, robots.txt | all pages, `pages.mjs`, `robots.txt` (new) |
| 12 | Images converted to WebP (about 40% smaller); images below the top load lazily; the video and its poster load only when scrolled to | `public/images/*.webp`, `videos/*.webp`, `home.js`, `style.css` |
| 13 | Google Analytics and Search Console placeholders | `site-info.js`, `index.html` |

### Database
On the first visit after deploying, the store updates itself once (nothing to do by hand):
- adds the Rice, Turmeric and Groundnut categories and moves matching products out of "Grains"
- gives rice, turmeric and groundnut sold per kg the options 1 kg / 5 kg / 25 kg at 1×, 5× and 25× the 1 kg price (change bulk prices in Admin → Products → Edit)
- renames "Organic …" products to "Naturally Grown …" and "Organic Inputs" to "Natural Farm Inputs"
- points product images at the new WebP files
- adds the two recipe articles

## 3. How to deploy
See the step-by-step in the chat message that came with this file.
