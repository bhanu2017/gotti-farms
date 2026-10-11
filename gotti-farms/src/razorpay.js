import crypto from 'node:crypto';
import { config } from './config.js';

const { razorpay } = config;

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a), 'utf8');
  const y = Buffer.from(String(b), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Create a Razorpay order. amount is in paise. */
export async function createRazorpayOrder({ amount, receipt, notes }) {
  const auth = Buffer.from(`${razorpay.keyId}:${razorpay.keySecret}`).toString('base64');
  const res = await fetch(`${razorpay.apiBase}/v1/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount, currency: 'INR', receipt, notes }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) {
    const reason = data?.error?.description || `HTTP ${res.status}`;
    throw new Error(`Razorpay order creation failed: ${reason}`);
  }
  return data; // { id: 'order_xxx', amount, currency, ... }
}

/** Verify the signature Razorpay Checkout returns after a successful payment. */
export function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature }) {
  if (!razorpayOrderId || !razorpayPaymentId || !signature) return false;
  const expected = crypto
    .createHmac('sha256', razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return safeEqualHex(expected, signature);
}

/** Verify a webhook request body (raw string) against the X-Razorpay-Signature header. */
export function verifyWebhookSignature(rawBody, signature) {
  if (!razorpay.webhookSecret || !signature) return false;
  const expected = crypto.createHmac('sha256', razorpay.webhookSecret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
