// Apply pass 7: PII encryption-at-rest helper.
// AES-256-GCM with a single active key id; bring-your-own-key via env.
// Format on disk:   v1.<kid>.<iv_b64>.<tag_b64>.<ciphertext_b64>
// Key source order:
//   1. process.env.PII_ENCRYPTION_KEY_<kid>   (hex or base64, 32 bytes)
//   2. process.env.PII_ENCRYPTION_KEY         (hex or base64, 32 bytes — kid defaults to "k1")
//   3. derived from JWT_SECRET via scrypt as a last-resort dev fallback
// Never overwrites or clears user credentials.

const crypto = require('crypto');

const ACTIVE_KID = process.env.PII_ACTIVE_KID || 'k1';

function decodeKey(raw) {
  if (!raw) return null;
  // hex?
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  // base64?
  try {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length === 32) return buf;
  } catch (_) {}
  return null;
}

function getKey(kid) {
  const id = kid || ACTIVE_KID;
  const direct =
    process.env[`PII_ENCRYPTION_KEY_${id}`] ||
    (id === ACTIVE_KID ? process.env.PII_ENCRYPTION_KEY : null);
  const decoded = decodeKey(direct);
  if (decoded) return decoded;
  // Dev fallback — deterministic key derived from JWT_SECRET.
  // Production should set PII_ENCRYPTION_KEY explicitly.
  const seed = process.env.JWT_SECRET || 'refugee-asylum-case-manager-secret-key-2026';
  return crypto.scryptSync(seed, `pii-kid-${id}`, 32);
}

function encrypt(plaintext, kid = ACTIVE_KID) {
  if (plaintext == null) return null;
  const data = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
  const key = getKey(kid);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    'v1',
    kid,
    iv.toString('base64'),
    tag.toString('base64'),
    ct.toString('base64'),
  ].join('.');
}

function decrypt(envelope) {
  if (!envelope) return null;
  const parts = String(envelope).split('.');
  if (parts.length !== 5 || parts[0] !== 'v1') {
    throw new Error('invalid PII envelope');
  }
  const [, kid, ivB64, tagB64, ctB64] = parts;
  const key = getKey(kid);
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

function tryDecryptJson(envelope) {
  try {
    const s = decrypt(envelope);
    if (s == null) return null;
    try { return JSON.parse(s); } catch (_) { return s; }
  } catch (e) {
    return { __error: e.message };
  }
}

module.exports = {
  ACTIVE_KID,
  encrypt,
  decrypt,
  tryDecryptJson,
};
