import { describe, it, expect } from "vitest"
import { getLoadState, getObjectLoadState } from "@/lib/load-state"

describe("getLoadState", () => {
  it("returns 'loading' when status is pending", () => {
    expect(getLoadState({ status: "pending" })).toBe("loading")
  })

  it("returns 'error' when status is error", () => {
    expect(getLoadState({ status: "error" })).toBe("error")
  })

  it("returns 'empty' when data is an empty array", () => {
    expect(getLoadState({ status: "success", data: [] })).toBe("empty")
  })

  it("returns 'empty' when data is null", () => {
    expect(getLoadState({ status: "success", data: null })).toBe("empty")
  })

  it("returns 'empty' when data is undefined", () => {
    expect(getLoadState({ status: "success", data: undefined })).toBe("empty")
  })

  it("returns 'content' when data has items", () => {
    expect(getLoadState({ status: "success", data: [{ id: "1" }] })).toBe("content")
  })

  it("loading takes priority over all other states", () => {
    // Even if data is present, pending means loading
    expect(getLoadState({ status: "pending", data: [{ id: "1" }] })).toBe("loading")
  })
})

describe("getObjectLoadState", () => {
  it("returns 'loading' when pending", () => {
    expect(getObjectLoadState({ status: "pending" })).toBe("loading")
  })

  it("returns 'error' when error", () => {
    expect(getObjectLoadState({ status: "error" })).toBe("error")
  })

  it("returns 'empty' when data is null", () => {
    expect(getObjectLoadState({ status: "success", data: null })).toBe("empty")
  })

  it("returns 'content' when data is an object", () => {
    expect(getObjectLoadState({ status: "success", data: { name: "John" } })).toBe("content")
  })
})
