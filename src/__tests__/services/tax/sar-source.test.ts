import { readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";
import { HN_ISR_2026 } from "@/domains/tax/rules/hn/2026";
import {
  parseSarRulePage,
  discoverSarRulePages,
  fetchSarPage,
} from "@/server/services/tax/rules/sar-source";

const html = readFileSync(
  process.env.FISCAL_SAR_HTML_PATH ??
    new URL("../../fixtures/tax/sar-2026.html", import.meta.url),
  "utf8",
);
const url = HN_ISR_2026.references[0].url;
describe("official SAR annual adjustment parser", () => {
  it("reads the exact official 2026 table", () => {
    const result = parseSarRulePage(html, url, "2026-11-13");
    expect(result.rule.year).toBe(2026);
    expect(result.rule.brackets).toEqual(HN_ISR_2026.brackets);
    expect(result.agreement).toBe("SAR-01-2026");
  });
  it("ignores counters and unrelated page furniture when identifying a release", () => {
    const a = parseSarRulePage(html, url, "2026-11-13");
    const b = parseSarRulePage(
      html.replace("</body>", "<footer>Descargas 13211</footer></body>"),
      url,
      "2026-11-14",
    );
    expect(a.rule.version).toBe(b.rule.version);
    expect(a.semanticKey).toBe(b.semanticKey);
  });
  it.each([
    ["missing interval", html.replace("L348,154.11", "L348,154.12")],
    ["overlapping interval", html.replace("L348,154.11", "L348,154.10")],
    ["different marginal rate", html.replace("15%", "16%")],
    ["ambiguous tables", html + html],
    [
      "different fiscal year",
      html.replace("ejercicio fiscal 2026", "ejercicio fiscal 2027"),
    ],
    ["missing adjustment basis", html.replace("(IPC)", "")],
  ])("requires review instead of silently accepting %s", (_label, input) => {
    expect(() => parseSarRulePage(input, url, "2026-11-13")).toThrow();
  });
  it("never parses a table attributed to a nonofficial host", () => {
    expect(() =>
      parseSarRulePage(
        html,
        "https://example.com/download/sar-01-2026/",
        "2026-11-13",
      ),
    ).toThrow();
  });
  it("discovers bounded official agreement permalinks for supported years", () => {
    const index = `<a href="${url}">Tabla</a><a href="https://attacker.test/download/sar-01-2027/">SAR</a><a href="https://www.sar.gob.hn/download/acuerdo-sar-01-2025/">Old</a><a href="${url}">Duplicate</a>`;
    expect(
      discoverSarRulePages(index, new Date("2026-11-13T12:00:00Z")),
    ).toEqual([url]);
  });
  it("rejects a redirect to an unrelated host before making another request", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "https://attacker.test/payload" },
        }),
      );
    await expect(fetchSarPage(url, fetcher)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects private addresses and oversized documents", async () => {
    const fetcher = vi.fn();
    await expect(fetchSarPage("https://127.0.0.1/", fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(
      new Response("x", {
        headers: { "content-type": "text/html", "content-length": "2000000" },
      }),
    );
    await expect(fetchSarPage(url, fetcher)).rejects.toThrow();
  });
});
