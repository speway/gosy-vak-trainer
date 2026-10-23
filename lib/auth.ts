export const AUTH_COOKIE_NAME = "examarium_auth_token";

const DEFAULT_USER = "admin";
const DEFAULT_PASS = "exam2026";
const DEFAULT_SECRET = "examarium-auth-secret-key-2026-gosy-vak";

export function getExpectedCredentials() {
  return {
    user: (process.env.AUTH_USER || DEFAULT_USER).trim(),
    pass: (process.env.AUTH_PASS || DEFAULT_PASS).trim(),
  };
}

function getSecretKey(): string {
  return (process.env.AUTH_SECRET || DEFAULT_SECRET).trim();
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signToken(username: string): Promise<string> {
  const secret = getSecretKey();
  const timestamp = Date.now().toString();
  const payload = `${username}:${timestamp}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const hexSignature = bufferToHex(signature);
  return `${payload}:${hexSignature}`;
}

export async function verifyToken(
  token: string
): Promise<{ valid: boolean; username: string | null }> {
  try {
    if (!token) return { valid: false, username: null };

    const parts = token.split(":");
    if (parts.length !== 3) return { valid: false, username: null };

    const [username, timestamp, hexSignature] = parts;
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime)) return { valid: false, username: null };

    // Valid for 30 days
    const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - tokenTime > maxAgeMs) {
      return { valid: false, username: null };
    }

    const secret = getSecretKey();
    const payload = `${username}:${timestamp}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expectedSignature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    const expectedHex = bufferToHex(expectedSignature);

    if (constantTimeEqual(hexSignature, expectedHex)) {
      return { valid: true, username };
    }

    return { valid: false, username: null };
  } catch {
    return { valid: false, username: null };
  }
}
