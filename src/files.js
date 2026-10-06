// Uploaded photos are stored in Netlify Blobs and served from /uploads/<key>.
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import { HttpError } from './errors.js';

const uploads = () => getStore({ name: 'uploads', consistency: 'strong' });

const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function saveImage(base64) {
  const buf = Buffer.from(String(base64 || '').replace(/^data:[^,]+,/, ''), 'base64');
  if (!buf.length) throw new HttpError(400, 'Choose an image file.');
  if (buf.length > 3 * 1024 * 1024) throw new HttpError(400, 'Image must be smaller than 3 MB.');
  const ext = buf[0] === 0xff && buf[1] === 0xd8 ? 'jpg'
    : buf.subarray(0, 4).toString('hex') === '89504e47' ? 'png'
    : buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP' ? 'webp' : null;
  if (!ext) throw new HttpError(400, 'Upload a JPG, PNG or WebP image.');
  const key = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  await uploads().set(key, new Blob([buf], { type: TYPES[ext] }), { metadata: { contentType: TYPES[ext] } });
  return `/uploads/${key}`;
}

export async function imageResponse(key) {
  if (!/^[\w.-]+$/.test(key)) return new Response('Not found', { status: 404 });
  const entry = await uploads().getWithMetadata(key, { type: 'arrayBuffer' });
  if (!entry) return new Response('Not found', { status: 404 });
  return new Response(entry.data, {
    headers: {
      'Content-Type': entry.metadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
