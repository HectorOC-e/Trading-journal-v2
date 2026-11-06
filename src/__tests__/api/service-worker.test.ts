import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

function worker() {
  const handlers: Record<string, (event: unknown) => void> = {}
  const entries = new Map<string, Response>()
  const key = (request: string | { url: string }) => typeof request === "string" ? request : request.url
  const fetch = vi.fn(async (request: string | { url: string }) => new Response(key(request) === "/offline.html" ? "SAFE OFFLINE" : "CURRENT AUTHENTICATED PAGE"))
  const cache = {
    add: vi.fn(async (path: string) => { entries.set(path, await fetch(path)) }),
    put: vi.fn(async (request: string | { url: string }, response: Response) => { entries.set(key(request), response) }),
    match: vi.fn(async (request: string | { url: string }) => entries.get(key(request))?.clone()),
  }
  const caches = { open: vi.fn(async () => cache), match: cache.match, keys: vi.fn(async () => ["tj-v2", "tj-v3", "tj-v4"]), delete: vi.fn(async () => true) }
  runInNewContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), {
    self: { location: { origin: "https://journal.test" }, addEventListener: (name: string, fn: (event: unknown) => void) => { handlers[name] = fn }, skipWaiting() {}, clients: { claim() {} } },
    caches, fetch, Response, URL,
  })
  async function lifecycle(name: string) {
    let work: Promise<unknown> = Promise.resolve()
    handlers[name]({ waitUntil: (promise: Promise<unknown>) => { work = promise } })
    await work
  }
  async function navigate(path: string) {
    let response: Promise<Response> | undefined
    handlers.fetch({ request: { url: `https://journal.test${path}`, mode: "navigate", method: "GET" }, respondWith: (promise: Promise<Response>) => { response = promise } })
    return response!
  }
  return { cache, caches, fetch, lifecycle, navigate, entries }
}

describe("service worker offline contract", () => {
  it("installs only a public offline shell and purges old page caches", async () => {
    const w = worker()
    await w.lifecycle("install")
    expect([...w.entries.keys()].sort()).toEqual(["/manifest.json", "/offline.html"])
    await w.lifecycle("activate")
    expect(w.caches.delete).toHaveBeenCalledWith("tj-v2")
    expect(w.caches.delete).toHaveBeenCalledWith("tj-v3")
  })

  it("never persists authenticated HTML and uses the safe shell for every offline navigation", async () => {
    const w = worker()
    await w.lifecycle("install")
    w.cache.put.mockClear()
    w.entries.set("https://journal.test/dashboard", new Response("STALE USER HTML"))
    expect(await (await w.navigate("/dashboard")).text()).toBe("CURRENT AUTHENTICATED PAGE")
    expect(w.cache.put).not.toHaveBeenCalled()
    w.fetch.mockRejectedValue(new Error("offline"))
    expect(await (await w.navigate("/dashboard")).text()).toBe("SAFE OFFLINE")
    expect(await (await w.navigate("/new-route")).text()).toBe("SAFE OFFLINE")
  })
})

describe("offline installation integrity", () => {
  it("rejects a redirected login response instead of installing it as the offline shell", async () => {
    const w = worker()
    const login = new Response("LOGIN HTML", { headers: { "Content-Type": "text/html" } })
    Object.defineProperty(login, "redirected", { value: true })
    w.fetch.mockResolvedValue(login)
    await expect(w.lifecycle("install")).rejects.toThrow()
    expect(w.entries.has("/offline.html")).toBe(false)
  })
})
