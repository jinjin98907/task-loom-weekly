// 종단간 암호화(E2EE): 클라우드에는 브라우저에서 AES-256-GCM으로 잠근 암호문만 올라간다.
// 열쇠는 사용자의 비밀번호에서 PBKDF2로 만들고 이 기기 LocalStorage에만 보관한다(서버로 보내지 않음).
import type { StoreName } from "@/lib/cloud-merge";

export type Envelope = { __enc: 1; iv: string; ct: string };
const KEY_PREFIX = "teacher-e2ee-key:";
const ITERATIONS = 310_000;

const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function deriveKey(password: string, userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(`teacher-e2ee:${userId}`), iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function saveKey(storage: Storage, userId: string, key: CryptoKey) {
  storage.setItem(KEY_PREFIX + userId, b64(await crypto.subtle.exportKey("raw", key)));
}

export async function loadKey(storage: Storage, userId: string): Promise<CryptoKey | null> {
  const raw = storage.getItem(KEY_PREFIX + userId);
  if (!raw) return null;
  try {
    return await crypto.subtle.importKey("raw", unb64(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
  } catch {
    return null;
  }
}

export function hasKey(storage: Storage, userId: string) {
  return !!storage.getItem(KEY_PREFIX + userId);
}

export function clearKeys(storage: Storage) {
  for (let i = storage.length - 1; i >= 0; i--) {
    const k = storage.key(i);
    if (k?.startsWith(KEY_PREFIX)) storage.removeItem(k);
  }
}

export function isEnvelope(v: unknown): v is Envelope {
  return !!v && typeof v === "object" && (v as Envelope).__enc === 1 &&
    typeof (v as Envelope).iv === "string" && typeof (v as Envelope).ct === "string";
}

/** 저장소별 클라우드 형태: 객체 저장소는 봉투 그대로, 배열 저장소는 [봉투]. */
function unwrap(v: unknown): Envelope | null {
  if (isEnvelope(v)) return v;
  if (Array.isArray(v) && v.length === 1 && isEnvelope(v[0])) return v[0];
  return null;
}

export const ENCRYPTED_STORES: StoreName[] = ["dashboard", "yearly", "rules", "memo"];

export async function encryptStore(store: StoreName, value: unknown, key: CryptoKey): Promise<unknown> {
  if (!ENCRYPTED_STORES.includes(store)) return value;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  const env: Envelope = { __enc: 1, iv: b64(iv), ct: b64(ct) };
  return store === "rules" || store === "memo" ? [env] : env;
}

export class DecryptError extends Error {}

/** 암호문이면 풀고, 예전 평문 데이터면 그대로 돌려준다. 열쇠가 틀리면 DecryptError. */
export async function decryptStore(value: unknown, key: CryptoKey): Promise<unknown> {
  const env = unwrap(value);
  if (!env) return value;
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, key, unb64(env.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch {
    throw new DecryptError("decrypt failed");
  }
}

export function isEncryptedValue(v: unknown) {
  return unwrap(v) !== null;
}
