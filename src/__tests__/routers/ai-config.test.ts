/**
 * TASK-033: AI Config encryption + CRUD tests.
 * Gate 3: Validates serialization of encrypted keys.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/ai/key-encryption"

// Provide a 32-byte (64-char hex) test encryption key
const TEST_KEY = "a".repeat(64)

beforeEach(() => {
  vi.stubEnv("AI_KEY_ENCRYPTION_SECRET", TEST_KEY)
})

describe("key-encryption: encryptApiKey / decryptApiKey (AES-256-GCM)", () => {
  it("roundtrip: encrypt then decrypt returns original plaintext", () => {
    const plaintext = "sk-ant-api-testkey12345678"
    const encrypted = encryptApiKey(plaintext)
    expect(decryptApiKey(encrypted)).toBe(plaintext)
  })

  it("format: encrypted string has 3 colon-separated parts", () => {
    const encrypted = encryptApiKey("sk-ant-api-testkey99999")
    const parts = encrypted.split(":")
    expect(parts).toHaveLength(3)
    const [iv, tag, ciphertext] = parts
    expect(iv).toMatch(/^[0-9a-f]+$/)
    expect(tag).toMatch(/^[0-9a-f]+$/)
    expect(ciphertext).toMatch(/^[0-9a-f]+$/)
  })

  it("non-deterministic: two encryptions of same plaintext produce different ciphertext (random IV)", () => {
    const plaintext = "sk-ant-api-testkey99999"
    const enc1 = encryptApiKey(plaintext)
    const enc2 = encryptApiKey(plaintext)
    expect(enc1).not.toBe(enc2)
    // But both decrypt to same value
    expect(decryptApiKey(enc1)).toBe(plaintext)
    expect(decryptApiKey(enc2)).toBe(plaintext)
  })

  it("tamper detection: decrypting modified ciphertext throws", () => {
    const encrypted = encryptApiKey("sk-testkey")
    const parts = encrypted.split(":")
    // Flip a bit in the ciphertext
    parts[2] = parts[2].slice(0, -2) + "00"
    expect(() => decryptApiKey(parts.join(":"))).toThrow()
  })

  it("throws on invalid format (wrong number of parts)", () => {
    expect(() => decryptApiKey("only-two:parts")).toThrow("Invalid encrypted key format")
  })

  it("throws EncryptionConfigError when secret missing in production", async () => {
    const { EncryptionConfigError } = await import("@/lib/ai/key-encryption")
    vi.stubEnv("AI_KEY_ENCRYPTION_SECRET", "")
    vi.stubEnv("NODE_ENV", "production")
    expect(() => encryptApiKey("sk-test")).toThrow(EncryptionConfigError)
  })

  it("uses an insecure dev key (no throw) when secret missing outside production", () => {
    vi.stubEnv("AI_KEY_ENCRYPTION_SECRET", "")
    vi.stubEnv("NODE_ENV", "development")
    const encrypted = encryptApiKey("sk-test")          // does not throw
    expect(decryptApiKey(encrypted)).toBe("sk-test")    // roundtrips with derived dev key
  })

  it("throws if AI_KEY_ENCRYPTION_SECRET is wrong length", () => {
    vi.stubEnv("AI_KEY_ENCRYPTION_SECRET", "too-short")
    expect(() => encryptApiKey("sk-test")).toThrow("AI_KEY_ENCRYPTION_SECRET")
  })

  it("handles empty string plaintext", () => {
    const encrypted = encryptApiKey("")
    expect(decryptApiKey(encrypted)).toBe("")
  })

  it("handles long API keys (200 chars)", () => {
    const longKey = "sk-ant-api-" + "x".repeat(189)
    const encrypted = encryptApiKey(longKey)
    expect(decryptApiKey(encrypted)).toBe(longKey)
  })
})

describe("maskApiKey", () => {
  it("shows first 8 and last 4 chars with ellipsis", () => {
    const key = "sk-ant-api-abc12345678xyz9"
    const masked = maskApiKey(key)
    expect(masked).toBe(`${key.slice(0, 8)}...${key.slice(-4)}`)
    expect(masked).toContain("...")
    expect(masked.startsWith(key.slice(0, 8))).toBe(true)
    expect(masked.endsWith(key.slice(-4))).toBe(true)
  })

  it("returns *** for short keys", () => {
    expect(maskApiKey("sk-short")).toBe("***")
    expect(maskApiKey("abc")).toBe("***")
  })

  it("exactly 12 chars returns ***", () => {
    expect(maskApiKey("123456789012")).toBe("***")
  })

  it("13 chars shows masked form", () => {
    const key = "1234567890123"
    const masked = maskApiKey(key)
    expect(masked).toContain("...")
  })
})

describe("Gate 3: Serialization validation", () => {
  it("encrypted key is a string (safe to store as TEXT in DB)", () => {
    const encrypted = encryptApiKey("sk-ant-api-test12345")
    expect(typeof encrypted).toBe("string")
    // Should be storable as plain ASCII hex + colons
    expect(encrypted).toMatch(/^[0-9a-f:]+$/)
  })

  it("decrypted key is always a string (not Buffer)", () => {
    const encrypted = encryptApiKey("sk-ant-api-test12345")
    const decrypted = decryptApiKey(encrypted)
    expect(typeof decrypted).toBe("string")
  })
})
