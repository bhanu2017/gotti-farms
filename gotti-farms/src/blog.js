import { all, one, exec } from './db.js';
import { HttpError } from './errors.js';

export const POST_CATEGORIES = ['pests', 'diseases', 'soil', 'water', 'general'];

const listColumns = `id, slug, category, image, title_en, summary_en, title_te, summary_te, published, created_at, updated_at,
  length(body_en) AS length_en, length(body_te) AS length_te`;

export function listPosts({ category, q, limit, includeDrafts = false } = {}) {
  const where = []; const params = [];
  if (!includeDrafts) where.push('published = 1');
  if (category && POST_CATEGORIES.includes(category)) { where.push('category = ?'); params.push(category); }
  if (q) {
    where.push('(title_en ILIKE ? OR summary_en ILIKE ? OR body_en ILIKE ? OR title_te ILIKE ? OR summary_te ILIKE ? OR body_te ILIKE ?)');
    const like = `%${q}%`; params.push(like, like, like, like, like, like);
  }
  const lim = Math.min(Math.max(Number(limit) || 200, 1), 200);
  return all(`SELECT ${listColumns} FROM posts ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY created_at DESC, id DESC LIMIT ?`, [...params, lim]);
}

export async function getPostBySlug(slug, { includeDrafts = false } = {}) {
  const post = await one('SELECT * FROM posts WHERE slug = ?', [String(slug ?? '')]);
  if (!post || (!post.published && !includeDrafts)) return null;
  return post;
}

export const getPostById = (id) => one('SELECT * FROM posts WHERE id = ?', [id]);

async function slugify(text) {
  const base = String(text).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/[\s_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'post';
  let slug = base; let n = 2;
  while (await one('SELECT 1 AS ok FROM posts WHERE slug = ?', [slug])) slug = `${base}-${n++}`;
  return slug;
}

function cleanPost(input) {
  const s = (v, max) => String(v ?? '').trim().slice(0, max);
  const p = {
    category: s(input.category, 20),
    image: s(input.image, 500),
    title_en: s(input.title_en, 150), summary_en: s(input.summary_en, 400), body_en: s(input.body_en, 50000),
    title_te: s(input.title_te, 200), summary_te: s(input.summary_te, 600), body_te: s(input.body_te, 80000),
    published: input.published ? 1 : 0,
  };
  if (!POST_CATEGORIES.includes(p.category)) throw new HttpError(400, 'Choose a topic for the post.');
  if (p.title_en.length < 3) throw new HttpError(400, 'Enter an English title.');
  if (p.body_en.length < 20) throw new HttpError(400, 'Write the English article (at least a few sentences).');
  if ((p.title_te || p.body_te) && !(p.title_te && p.body_te)) throw new HttpError(400, 'Fill in both the Telugu title and Telugu article, or leave both empty.');
  if (p.image && !/^(\/(images|uploads)\/[\w.\-]+|https:\/\/\S+)$/.test(p.image)) throw new HttpError(400, 'Cover photo must be an uploaded image.');
  return p;
}

export async function createPost(input) {
  const p = cleanPost(input);
  const slug = await slugify(p.title_en);
  const row = await one(`INSERT INTO posts (slug, category, image, title_en, summary_en, body_en, title_te, summary_te, body_te, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  [slug, p.category, p.image, p.title_en, p.summary_en, p.body_en, p.title_te, p.summary_te, p.body_te, p.published]);
  return getPostById(row.id);
}

export async function updatePost(id, input) {
  if (!(await getPostById(id))) throw new HttpError(404, 'Post not found.');
  const p = cleanPost(input);
  // The link (slug) stays the same after publishing so shared links keep working.
  await exec(`UPDATE posts SET category=?, image=?, title_en=?, summary_en=?, body_en=?, title_te=?, summary_te=?, body_te=?,
    published=?, updated_at=now() WHERE id=?`,
  [p.category, p.image, p.title_en, p.summary_en, p.body_en, p.title_te, p.summary_te, p.body_te, p.published, id]);
  return getPostById(id);
}

export async function deletePost(id) {
  if (!(await exec('DELETE FROM posts WHERE id = ?', [id])).rowCount) throw new HttpError(404, 'Post not found.');
}
