import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGO = "aes-256-gcm"

function getEncryptionKey(): Buffer {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET
  if (!secret || secret.length !== 64) {
    throw new Error("AI_KEY_ENCRYPTION_SECRET must be a 64-character hex string (32 bytes)")
  }
  return Buffer.from(secret, "hex")
}

// Returns "<iv_hex>:<tag_hex>:<ciphertext_hex>"
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey()
  const iv  = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`
}

export function decryptApiKey(encrypted: string): string {
  const parts = encrypted.split(":")
  if (parts.length !== 3) throw new Error("Invalid encrypted key format")
  const [ivHex, tagHex, ciphertextHex] = parts
  const key        = getEncryptionKey()
  const iv         = Buffer.from(ivHex, "hex")
  const tag        = Buffer.from(tagHex, "hex")
  const ciphertext = Buffer.from(ciphertextHex, "hex")
  const decipher   = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
}

// Returns first 8 chars + "..." + last 4 chars to show user without exposing key
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) return "***"
  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
}
