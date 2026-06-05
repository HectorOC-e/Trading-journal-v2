import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { encryptApiKey, decryptApiKey, maskApiKey, rotateEncryptionKey } from "@/lib/ai/key-encryption"

const VALID_SECRET = "a".repeat(64) // 64-char hex string (32 bytes conceptually)

describe("key-encryption", () => {
  const origEnv = process.env.AI_KEY_ENCRYPTION_SECRET

  beforeEach(() => {
    process.env.AI_KEY_ENCRYPTION_SECRET = VALID_SECRET
  })

  afterEach(() => {
    process.env.AI_KEY_ENCRYPTION_SECRET = origEnv
  })

  it("encrypt and decrypt roundtrip", () => {
    const plaintext = "sk-ant-api03-test-key-1234567890"
    const encrypted = encryptApiKey(plaintext)
    expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)
    const decrypted = decryptApiKey(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it("each encryption produces a unique ciphertext (random IV)", () => {
    const plaintext = "same-key-always"
    const enc1 = encryptApiKey(plaintext)
    const enc2 = encryptApiKey(plaintext)
    expect(enc1).not.toBe(enc2)
    expect(decryptApiKey(enc1)).toBe(plaintext)
    expect(decryptApiKey(enc2)).toBe(plaintext)
  })

  it("decrypt throws on tampered ciphertext", () => {
    const encrypted = encryptApiKey("original")
    const parts = encrypted.split(":")
    parts[2] = "deadbeef"
    expect(() => decryptApiKey(parts.join(":"))).toThrow()
  })

  it("decrypt throws on invalid format", () => {
    expect(() => decryptApiKey("not:valid")).toThrow("Invalid encrypted key format")
  })

  it("throws on non-hex secret", () => {
    expect(() => encryptApiKey("test", "z".repeat(64))).toThrow(/64-character hex/)
  })

  it("encrypt/decrypt with secretOverride", () => {
    const altSecret = "b".repeat(64)
    const plaintext = "override-test-key"
    const encrypted = encryptApiKey(plaintext, altSecret)
    expect(() => decryptApiKey(encrypted)).toThrow()
    expect(decryptApiKey(encrypted, altSecret)).toBe(plaintext)
  })

  it("maskApiKey shows first 8 and last 4 chars", () => {
    const key    = "sk-ant-api03-abcdefgh1234567890xyz9"
    const masked = maskApiKey(key)
    expect(masked).toBe(`${key.slice(0, 8)}...${key.slice(-4)}`)
  })

  it("maskApiKey returns *** for short keys", () => {
    expect(maskApiKey("short")).toBe("***")
  })
})

describe("rotateEncryptionKey", () => {
  it("re-encrypts all configs with new key", async () => {
    const oldSecret  = "c".repeat(64)
    const newSecret  = "d".repeat(64)
    const plaintext1 = "key-one-plaintext"
    const plaintext2 = "key-two-plaintext"

    const configs = [
      { id: "cfg-1", apiKeyEnc: encryptApiKey(plaintext1, oldSecret) },
      { id: "cfg-2", apiKeyEnc: encryptApiKey(plaintext2, oldSecret) },
    ]

    const updateLog: Array<{ id: string; apiKeyEnc: string }> = []
    const getAllConfigs = async () => configs
    const updateConfig  = async (id: string, apiKeyEnc: string) => {
      updateLog.push({ id, apiKeyEnc })
    }

    const { rotated, failed } = await rotateEncryptionKey(oldSecret, newSecret, getAllConfigs, updateConfig)

    expect(rotated).toBe(2)
    expect(failed).toBe(0)
    expect(updateLog).toHaveLength(2)

    // Verify new key decrypts correctly
    expect(decryptApiKey(updateLog[0].apiKeyEnc, newSecret)).toBe(plaintext1)
    expect(decryptApiKey(updateLog[1].apiKeyEnc, newSecret)).toBe(plaintext2)

    // Old key no longer works
    expect(() => decryptApiKey(updateLog[0].apiKeyEnc, oldSecret)).toThrow()
  })

  it("returns failed count for bad encrypted values", async () => {
    const oldSecret = "e".repeat(64)
    const newSecret = "f".repeat(64)
    const configs = [
      { id: "bad-1", apiKeyEnc: "invalid:format:data" },
    ]
    const { rotated, failed } = await rotateEncryptionKey(
      oldSecret, newSecret,
      async () => configs,
      async () => {},
    )
    expect(rotated).toBe(0)
    expect(failed).toBe(1)
  })

  it("throws if secrets are wrong length", async () => {
    await expect(
      rotateEncryptionKey("short", "f".repeat(64), async () => [], async () => {}),
    ).rejects.toThrow("64-character hex strings")
  })

  it("throws if secrets contain non-hex characters", async () => {
    const nonHex = "z".repeat(64)
    await expect(
      rotateEncryptionKey(nonHex, "d".repeat(64), async () => [], async () => {}),
    ).rejects.toThrow("non-hex")
  })

  it("throws if old and new secret are identical", async () => {
    const secret = "c".repeat(64)
    await expect(
      rotateEncryptionKey(secret, secret, async () => [], async () => {}),
    ).rejects.toThrow("oldSecret and newSecret must be different")
  })
})
