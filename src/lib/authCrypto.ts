/**
 * Pure TypeScript SHA-256 & Credential Hashing Utility
 * Ensures passwords are never stored in plaintext in localStorage or Firestore.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function sha256Hex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return Array.from(H)
    .map(v => v.toString(16).padStart(8, '0'))
    .join('');
}

const CREDENTIAL_DOMAIN_SALT = 'E-SPPG-TMG2::GFBQSYXD::AUTH-V1';

export function hashLoginPassword(email: string, password: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  return sha256Hex(`${CREDENTIAL_DOMAIN_SALT}::${normalizedEmail}::${password}`);
}

export function verifyLoginPassword(email: string, password: string, expectedHash: string): boolean {
  if (!expectedHash) return false;
  const candidate = hashLoginPassword(email, password);
  if (candidate.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

export const PROTECTED_SUPER_ADMIN_EMAILS = [
  'sppgkrejengantemenggungan2@gmail.com',
  'gustiagung1100@gmail.com',
] as const;

export function isProtectedSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (PROTECTED_SUPER_ADMIN_EMAILS as readonly string[]).includes(normalized);
}

const SESSION_TOKEN_SALT = 'E-SPPG-TMG2::GFBQSYXD::SESSION-SIG-V1';
const SESSION_DURATION_DEFAULT_MS = 12 * 60 * 60 * 1000; // 12 jam
const SESSION_DURATION_REMEMBER_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export interface StoredAuthSession {
  authenticated: true;
  uid: string;
  email: string;
  role: string;
  rememberMe: boolean;
  issuedAt: number;
  expiresAt: number;
  sessionToken: string;
}

function computeSessionSignature(
  uid: string,
  email: string,
  role: string,
  issuedAt: number,
  expiresAt: number
): string {
  const normalizedEmail = email.trim().toLowerCase();
  return sha256Hex(
    `${SESSION_TOKEN_SALT}::${uid}::${normalizedEmail}::${role}::${issuedAt}::${expiresAt}`
  );
}

export function createSignedAuthSession(params: {
  uid: string;
  email: string;
  role: string;
  rememberMe: boolean;
}): StoredAuthSession {
  const issuedAt = Date.now();
  const ttl = params.rememberMe ? SESSION_DURATION_REMEMBER_MS : SESSION_DURATION_DEFAULT_MS;
  const expiresAt = issuedAt + ttl;
  const normalizedEmail = params.email.trim().toLowerCase();
  return {
    authenticated: true,
    uid: params.uid,
    email: normalizedEmail,
    role: params.role,
    rememberMe: Boolean(params.rememberMe),
    issuedAt,
    expiresAt,
    sessionToken: computeSessionSignature(params.uid, normalizedEmail, params.role, issuedAt, expiresAt),
  };
}

export function verifyStoredAuthSession(candidate: unknown): StoredAuthSession | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const obj = candidate as Record<string, unknown>;
  if (obj.authenticated !== true) return null;
  if (
    typeof obj.uid !== 'string' ||
    !obj.uid.trim() ||
    typeof obj.email !== 'string' ||
    !obj.email.trim() ||
    typeof obj.role !== 'string' ||
    !obj.role.trim() ||
    typeof obj.issuedAt !== 'number' ||
    typeof obj.expiresAt !== 'number' ||
    typeof obj.sessionToken !== 'string'
  ) {
    return null;
  }
  if (!Number.isFinite(obj.issuedAt) || !Number.isFinite(obj.expiresAt)) return null;
  if (obj.expiresAt <= obj.issuedAt || Date.now() >= obj.expiresAt) return null;

  const expectedToken = computeSessionSignature(
    obj.uid,
    obj.email,
    obj.role,
    obj.issuedAt,
    obj.expiresAt
  );
  if (obj.sessionToken.length !== expectedToken.length) return null;
  let diff = 0;
  for (let i = 0; i < expectedToken.length; i++) {
    diff |= obj.sessionToken.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  if (diff !== 0) return null;

  return {
    authenticated: true,
    uid: obj.uid,
    email: obj.email.trim().toLowerCase(),
    role: obj.role,
    rememberMe: Boolean(obj.rememberMe),
    issuedAt: obj.issuedAt,
    expiresAt: obj.expiresAt,
    sessionToken: obj.sessionToken,
  };
}

