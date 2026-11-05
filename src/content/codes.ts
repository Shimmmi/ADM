/** Нормализация кодов (03_GIFTS §4): регистр, ё→е, без пробелов. */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/Ё/g, 'Е').replace(/\s+/g, '');
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashCode(salt: string, raw: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${normalizeCode(raw)}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}
