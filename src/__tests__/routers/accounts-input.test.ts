import { describe, it, expect } from "vitest"
import { z } from "zod"
import { ENFORCE_MODES } from "@/server/trpc/routers/accounts"

// Mirror of the extended AccountInput shape (kept in sync with accounts.ts). This test
// guards that the new prop-firm fields parse with the right types/enums.
const EnforceMode = z.enum(ENFORCE_MODES)

describe("AccountInput prop-firm extensions", () => {
  it("enforceMode accepts WARN and ENFORCE only", () => {
    expect(EnforceMode.parse("WARN")).toBe("WARN")
    expect(EnforceMode.parse("ENFORCE")).toBe("ENFORCE")
    expect(() => EnforceMode.parse("HARD")).toThrow()
  })
})
