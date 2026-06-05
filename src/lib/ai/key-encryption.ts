import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto"

const ALGO = "aes-256-gcm"

/** Distinguishable error so callers can tell "server misconfigured" from "bad user key". */
export class EncryptionConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EncryptionConfigError"
  }
}

let warnedDevKey = false

/**
 * Resolve the AES-256 key.
 * - Production: requires a 64-char hex `AI_KEY_ENCRYPTION_SECRET`. Missing/invalid → EncryptionConfigError.
 * - Development/test: if the secret is missing, derive a STABLE dev key from a fixed seed
 *   so local development works without setup. Logged once, loud — never use in production.
 */
function getEncryptionKey(secretOverride?: string): Buffer {
  const secret = secretOverride ?? process.env.AI_KEY_ENCRYPTION_SECRET
  const isProd = process.env.NODE_ENV === "production"

  if (!secret) {
    if (isProd) {
      throw new EncryptionConfigError("AI_KEY_ENCRYPTION_SECRET is not configured on the server")
    }
    if (!warnedDevKey) {
      warnedDevKey = true
      console.warn(
        "[key-encryption] AI_KEY_ENCRYPTION_SECRET missing — using an INSECURE derived dev key. " +
        "Set a real 64-char hex secret before production (openssl rand -hex 32).",
      )
    }
    // Deterministic 32-byte key derived from a dev-only seed.
    return createHash("sha256").update("tj-dev-insecure-ai-key-encryption-seed").digest()
  }

  if (secret.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(secret)) {
    throw new EncryptionConfigError("AI_KEY_ENCRYPTION_SECRET must be a 64-character hex string (32 bytes)")
  }
  return Buffer.from(secret, "hex")
}

// Returns "<iv_hex>:<tag_hex>:<ciphertext_hex>"
export function encryptApiKey(plaintext: string, secretOverride?: string): string {
  const key = getEncryptionKey(secretOverride)
  const iv  = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`
}

export function decryptApiKey(encrypted: string, secretOverride?: string): string {
  const parts = encrypted.split(":")
  if (parts.length !== 3) throw new Error("Invalid encrypted key format")
  const [ivHex, tagHex, ciphertextHex] = parts
  const key        = getEncryptionKey(secretOverride)
  const iv         = Buffer.from(ivHex, "hex")
  const tag        = Buffer.from(tagHex, "hex")
  const ciphertext = Buffer.from(ciphertextHex, "hex")
  const decipher   = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
}

/**
 * Re-encrypts all UserAiConfig rows from oldSecret to newSecret.
 * Run as a one-time migration when rotating the encryption key.
 * Both args must be 64-character hex strings (32 bytes each).
 */
export async function rotateEncryptionKey(
  oldSecret: string,
  newSecret: string,
  getAllConfigs: () => Promise<Array<{ id: string; apiKeyEnc: string }>>,
  updateConfig:  (id: string, apiKeyEnc: string) => Promise<void>,
): Promise<{ rotated: number; failed: number }> {
  if (oldSecret.length !== 64 || newSecret.length !== 64) {
    throw new Error("Both secrets must be 64-character hex strings")
  }
  if (!/^[0-9a-fA-F]{64}$/.test(oldSecret) || !/^[0-9a-fA-F]{64}$/.test(newSecret)) {
    throw new Error("Secrets contain non-hex characters")
  }
  if (oldSecret === newSecret) {
    throw new Error("oldSecret and newSecret must be different")
  }
  const configs = await getAllConfigs()
  let rotated = 0, failed = 0
  for (const cfg of configs) {
    try {
      const plaintext = decryptApiKey(cfg.apiKeyEnc, oldSecret)
      const reEncrypted = encryptApiKey(plaintext, newSecret)
      await updateConfig(cfg.id, reEncrypted)
      rotated++
    } catch {
      failed++
    }
  }
  return { rotated, failed }
}

// Returns first 8 chars + "..." + last 4 chars to show user without exposing key
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) return "***"
  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
}
