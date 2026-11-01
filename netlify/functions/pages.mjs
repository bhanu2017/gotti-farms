// Server-side rendering for pages that show store data:
//   /                home page (featured products)
//   /shop            shop page (products, category filter, search, sort)
//   /product/:id-…   one product (with weight options, product schema for Google)
//   /blog/:slug      farmer tip article (title, description and preview tags)
//   /recipes/:slug   recipe / health article
//   /sitemap.xml     list of pages for Google
//
// The page HTML is read from public/, real data from the database is written into it, and the
// finished page is sent. Google, WhatsApp and Facebook link previews see the content straight
// away, without running JavaScript. The browser scripts only add the interactive parts.
//
// Finished pages are kept in Netlify's CDN cache for 60 seconds and refreshed in the background,
// so the database is not hit on every visit. Admin product changes clear the cache immediately
// (see purgeProductPages in api.mjs).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as settings, razorpayEnabled } from '../../src/config.js';
import { withRequestDb } from '../../src/db.js';
import * as store from '../../src/store.js';
import * as blog from '../../src/blog.js';
import {
  esc, money, productCardHtml, shopChipsHtml, shopTitle, emptyShopHtml, ssrDataScript, productPageHtml,
  productOptions, productUrl, cheapestPerUnit,
} from '../../public/js/render.js';

export const PRODUCT_CACHE_TAG = 'products';
const SORTS = new Set(['', 'price_asc', 'price_desc', 'name', 'newest']);
const SITE = () => settings.siteUrl;
const OG_IMAGE = '/images/og-image.jpg';

// ---------- Page templates (bundled with the function via included_files in netlify.toml) ----------
const templateCache = new Map();
async function template(file) {
  if (templateCache.has(file)) return templateCache.get(file);
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), 'public', file),
    path.join(process.env.LAMBDA_TASK_ROOT || '/var/task', 'public', file),
    path.join(here, '..', '..', 'public', file),
    path.join(here, 'public', file),
  ];
  for (const p of candidates) {
    try {
      const html = await readFile(p, 'utf8');
      templateCache.set(file, html);
      return html;
    } catch { /* try the next location */ }
  }
  throw new Error(`Page template public/${file} was not found in the function bundle.`);
}

/** Replace the content between <!--ssr:name--> and <!--/ssr:name--> markers. */
function fill(html, name, content) {
  const re = new RegExp(`<!--ssr:${name}-->[\\s\\S]*?<!--/ssr:${name}-->`);
  return html.replace(re, () => content);
}
const addData = (html, data) => html.replace('</body>', () => `${ssrDataScript(data)}\n</body>`);
const absolute = (url) => (/^https?:\/\//.test(url) ? url : `${SITE()}${url.startsWith('/') ? '' : '/'}${url}`);
const clip = (s, n) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; };

/** <title>, description, canonical link and Open Graph / Twitter preview tags. */
function headTags({ title, description, url, image = OG_IMAGE, type = 'website', jsonLd, noindex = false }) {
  // Link previews (WhatsApp, Facebook) are most reliable with JPG, and every /images/*.webp has a .jpg twin.
  const img = absolute(String(image).replace(/^(\/images\/[\w.-]+)\.webp$/, '$1.jpg'));
  const isDefaultImage = image === OG_IMAGE;
  return `<title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(absolute(url))}">
  ${noindex ? '<meta name="robots" content="noindex">' : ''}
  <meta property="og:site_name" content="Gotti Farms">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(absolute(url))}">
  <meta property="og:image" content="${esc(img)}">
  ${isDefaultImage ? '<meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">' : ''}
  <meta property="og:locale" content="en_IN">
  <meta name="twitter:card" content="${isDefaultImage ? 'summary_large_image' : 'summary'}">
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}`;
}

// ---------- Pages ----------
async function homePage() {
  const html = await template('index.html');
  const products = (await store.listProducts({ featured: true })).slice(0, 12);
  const grid = products.length
    ? products.map((p) => productCardHtml(p)).join('')
    : '<p class="muted">New products are coming soon.</p>';
  return addData(fill(html, 'featured', grid), { page: 'home', featured: products });
}

const CATEGORY_TEXT = {
  rice: 'Buy naturally grown rice, including Sona Masoori, from Gotti Farms in 1 kg, 5 kg and 25 kg packs.',
  turmeric: 'Buy naturally grown Guntur turmeric from Gotti Farms: deep colour, strong aroma, ground in small batches.',
  groundnut: 'Buy naturally grown groundnut from Gotti Farms, fresh from our fields in Andhra Pradesh.',
  vegetables: 'Buy farm-fresh vegetables from Gotti Farms: tomatoes, chillies, brinjal and seasonal greens picked close to delivery.',
  seeds: 'Buy vegetable seeds for your kitchen garden from Gotti Farms.',
  plants: 'Buy healthy vegetable saplings and plants from Gotti Farms.',
};

async function shopPage(url) {
  const html = await template('shop.html');
  const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
  const sortParam = url.searchParams.get('sort') || '';
  const sort = SORTS.has(sortParam) ? sortParam : '';
  const category = (url.searchParams.get('category') || '').slice(0, 40);

  const categories = await store.listCategories();
  const known = category === 'saved' || categories.some((c) => c.id === category);
  const activeCategory = known ? category : '';
  const products = await store.listProducts({
    category: activeCategory && activeCategory !== 'saved' ? activeCategory : undefined,
    q: q || undefined,
    sort: sort || undefined,
  });

  // "Saved" lives in the visitor's browser, so the browser fills that view in.
  const grid = activeCategory === 'saved'
    ? '<p class="muted">Loading your saved products…</p>'
    : products.length ? products.map((p, i) => productCardHtml(p, { eager: i < 2 })).join('') : emptyShopHtml(false);

  const cat = categories.find((c) => c.id === activeCategory);
  const head = cat
    ? headTags({
      title: `${cat.name} – Buy Naturally Grown ${cat.name} Online | Gotti Farms`,
      description: CATEGORY_TEXT[cat.id] || `Buy ${cat.name.toLowerCase()} from Gotti Farms. Free delivery on orders above ₹499.`,
      url: `/shop?category=${encodeURIComponent(cat.id)}`,
      image: cat.image || OG_IMAGE,
    })
    : headTags({
      title: q ? `Search: ${q} | Gotti Farms` : 'Shop Naturally Grown Rice, Turmeric, Groundnut & Vegetables | Gotti Farms',
      description: 'Shop farm-fresh rice, turmeric, groundnut, vegetables, seeds and plants from Gotti Farms. Choose 1 kg, 5 kg or 25 kg packs. Cash on delivery and free delivery above ₹499.',
      url: '/shop',
      noindex: Boolean(q) || activeCategory === 'saved',
    });

  let out = fill(html, 'head', head);
  out = fill(out, 'title', shopTitle({ category: activeCategory, q }, categories));
  out = fill(out, 'chips', shopChipsHtml(categories, activeCategory));
  out = fill(out, 'grid', grid);
  return addData(out, { page: 'shop', query: { category: activeCategory, q, sort }, categories, products });
}

function productSchema(p) {
  const opts = productOptions(p);
  const inStock = p.stock >= Math.min(...opts.map((o) => o.size));
  const offer = (o) => ({
    '@type': 'Offer',
    price: (o.price / 100).toFixed(2),
    priceCurrency: 'INR',
    availability: inStock && p.stock >= o.size ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url: absolute(productUrl(p)),
    ...(o.label ? { name: o.label } : {}),
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    image: [absolute(p.image || '/images/placeholder.svg')],
    description: p.description || `${p.name} from Gotti Farms.`,
    sku: `GF-${p.id}`,
    brand: { '@type': 'Brand', name: 'Gotti Farms' },
    category: p.category_name,
    offers: opts.length > 1
      ? { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: (Math.min(...opts.map((o) => o.price)) / 100).toFixed(2), highPrice: (Math.max(...opts.map((o) => o.price)) / 100).toFixed(2), offerCount: opts.length, availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', offers: opts.map(offer) }
      : offer(opts[0]),
  };
}

async function productPage(url) {
  const id = Number((url.pathname.match(/^\/product\/(\d+)/) || [])[1]);
  const p = id ? await store.getProduct(id) : null;
  if (!p || !p.active) return null;
  const canonical = productUrl(p);
  if (url.pathname !== canonical) return { redirect: canonical };

  const html = await template('product.html');
  const opts = productOptions(p);
  const first = opts[0];
  const weight = first.label || (/^\d/.test(p.unit) ? p.unit : `1 ${p.unit}`);
  const priceText = opts.length > 1
    ? `from ${money(Math.round(cheapestPerUnit(p)))} / ${p.unit} in ${opts.map((o) => o.label).join(', ')} packs`
    : `${money(first.price)} / ${p.unit}`;
  const head = headTags({
    title: `${p.name} ${weight} – Gotti Farms`,
    description: clip(`${p.name} ${priceText} from Gotti Farms. Cash on delivery, free delivery above ₹499. ${p.description || ''}`, 158),
    url: canonical,
    image: p.image || OG_IMAGE,
    type: 'product',
    jsonLd: productSchema(p),
  });
  const body = productPageHtml(p, { freeAbove: settings.freeDeliveryAbove, onlineEnabled: razorpayEnabled() });
  return addData(fill(fill(html, 'head', head), 'product', body), { page: 'product', product: p });
}

async function articlePage(url) {
  const m = url.pathname.match(/^\/(blog|recipes)\/([^/]+)\/?$/);
  if (!m) return null;
  const post = await blog.getPostBySlug(decodeURIComponent(m[2]));
  if (!post) return null;
  const section = post.category === 'recipes' ? 'recipes' : 'blog';
  if (section !== m[1]) return { redirect: `/${section}/${post.slug}` };
  const html = await template('blog-post.html');
  const head = headTags({
    title: `${post.title_en} | Gotti Farms`,
    description: clip(post.summary_en || post.body_en, 158),
    url: `/${section}/${post.slug}`,
    image: post.image || OG_IMAGE,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title_en,
      description: clip(post.summary_en || post.body_en, 200),
      image: post.image ? [absolute(post.image)] : undefined,
      datePublished: new Date(post.created_at).toISOString(),
      dateModified: new Date(post.updated_at || post.created_at).toISOString(),
      author: { '@type': 'Organization', name: 'Gotti Farms' },
      publisher: { '@type': 'Organization', name: 'Gotti Farms' },
      inLanguage: post.title_te ? ['en', 'te'] : 'en',
    },
  });
  return addData(fill(html, 'head', head), { page: 'article', post });
}

const STATIC_PAGES = ['/', '/shop', '/about', '/contact', '/recipes', '/blog', '/shipping-policy', '/refund-policy', '/privacy-policy', '/terms'];

async function sitemap() {
  const [products, categories, posts] = await Promise.all([
    store.listProducts(), store.listCategories(), blog.listPosts({ limit: 200 }),
  ]);
  const urls = [
    ...STATIC_PAGES.map((p) => ({ loc: p })),
    ...categories.filter((c) => c.product_count > 0).map((c) => ({ loc: `/shop?category=${encodeURIComponent(c.id)}` })),
    ...products.map((p) => ({ loc: productUrl(p) })),
    ...posts.map((p) => ({ loc: `/${p.category === 'recipes' ? 'recipes' : 'blog'}/${p.slug}`, lastmod: p.updated_at || p.created_at })),
  ];
  const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${xmlEsc(absolute(u.loc))}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
}

// ---------- Handler ----------
const CACHED = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=60, stale-while-revalidate=86400',
  'Netlify-Cache-Tag': `${PRODUCT_CACHE_TAG},posts`,
};
const NO_STORE = { 'Cache-Control': 'no-store', 'Netlify-CDN-Cache-Control': 'no-store' };
const htmlHeaders = (extra) => ({ 'Content-Type': 'text/html; charset=utf-8', ...extra });

function templateFor(pathname) {
  if (pathname === '/') return 'index.html';
  if (pathname === '/shop') return 'shop.html';
  if (pathname.startsWith('/product/')) return 'product.html';
  return 'blog-post.html';
}

export default async function handler(req) {
  const url = new URL(req.url);
  const { pathname } = url;
  try {
    if (pathname === '/sitemap.xml') {
      const xml = await withRequestDb(sitemap);
      return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', ...CACHED, 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=3600, stale-while-revalidate=86400' } });
    }
    const result = await withRequestDb(() => {
      if (pathname === '/') return homePage();
      if (pathname === '/shop') return shopPage(url);
      if (pathname.startsWith('/product/')) return productPage(url);
      return articlePage(url);
    });
    if (result?.redirect) return new Response(null, { status: 301, headers: { Location: result.redirect + url.search, ...CACHED } });
    if (result == null) {
      return new Response(await template('404.html'), { status: 404, headers: htmlHeaders({ ...CACHED, 'Netlify-Vary': 'query=category|q|sort' }) });
    }
    return new Response(result, { headers: htmlHeaders({ ...CACHED, 'Netlify-Vary': 'query=category|q|sort' }) });
  } catch (err) {
    // Database unreachable or similar: send the plain page. Its scripts load the content
    // in the browser instead, so visitors still get a working shop.
    console.error('SSR failed, sending the plain page:', err);
    try {
      if (pathname === '/sitemap.xml') throw err;
      return new Response(await template(templateFor(pathname)), { status: 200, headers: htmlHeaders(NO_STORE) });
    } catch (e) {
      console.error(e);
      return new Response('The page could not be loaded. Please refresh in a moment.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NO_STORE } });
    }
  }
}

export const config = {
  path: ['/', '/shop', '/product/*', '/blog/*', '/recipes/*', '/sitemap.xml'],
};
