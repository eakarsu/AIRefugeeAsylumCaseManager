// Webhooks delivery service.
// Looks up every active webhook subscribed to `event`, POSTs the payload with
// an HMAC-SHA256 signature in the X-Defense-Signature header, and records the
// delivery attempt into webhook_deliveries.
//
// Failures never throw — we log + continue so caller paths aren't blocked.

const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const pool = require('../config/database');

function postOnce(urlStr, body, headers) {
  return new Promise((resolve) => {
    try {
      const u = new URL(urlStr);
      const lib = u.protocol === 'https:' ? https : http;
      const opts = {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + (u.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
        timeout: 5000,
      };
      const req = lib.request(opts, (res) => {
        let buf = '';
        res.on('data', (chunk) => { buf += chunk; });
        res.on('end', () => resolve({ status: res.statusCode || 0, body: buf.slice(0, 2000) }));
      });
      req.on('error', (e) => resolve({ status: 0, body: `error: ${e.message}` }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
      req.write(body);
      req.end();
    } catch (e) {
      resolve({ status: 0, body: `error: ${e.message}` });
    }
  });
}

async function fireWebhook(event, payload) {
  let subs;
  try {
    const r = await pool.query('SELECT * FROM webhooks WHERE active = TRUE');
    subs = r.rows;
  } catch (e) {
    console.warn('[webhooks] lookup failed:', e.message);
    return { event, delivered: 0, skipped: 0, error: e.message };
  }
  const matching = subs.filter((s) => {
    const events = String(s.events || '').split(',').map((x) => x.trim()).filter(Boolean);
    return events.length === 0 || events.includes(event) || events.includes('*');
  });

  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  let delivered = 0;
  for (const sub of matching) {
    const sig = crypto.createHmac('sha256', sub.secret || '').update(body).digest('hex');
    const headers = {
      'X-Defense-Event': event,
      'X-Defense-Signature': `sha256=${sig}`,
      'X-Defense-Webhook-Id': String(sub.id),
    };
    const result = await postOnce(sub.url, body, headers);
    try {
      await pool.query(
        `INSERT INTO webhook_deliveries (webhook_id, event, payload, status_code, response_body)
         VALUES ($1,$2,$3,$4,$5)`,
        [sub.id, event, JSON.parse(body), result.status, result.body]
      );
    } catch (e) {
      console.warn('[webhooks] delivery log failed:', e.message);
    }
    if (result.status >= 200 && result.status < 300) delivered++;
  }
  return { event, delivered, matching: matching.length };
}

module.exports = { fireWebhook };
