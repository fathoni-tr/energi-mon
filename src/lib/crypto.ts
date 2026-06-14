import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.CONFIG_ENCRYPTION_KEY;
  if (!raw) throw new Error("CONFIG_ENCRYPTION_KEY tidak di-set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32)
    throw new Error(
      "CONFIG_ENCRYPTION_KEY harus 32 byte (base64 dari 32 byte)",
    );
  return key;
}

/**
 * Enkripsi string plaintext dengan AES-256-GCM.
 * Output: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Dekripsi output dari `encrypt()`.
 * Throws jika MAC check gagal (tampered data).
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Format ciphertext tidak valid");
  const [ivHex, authTagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
