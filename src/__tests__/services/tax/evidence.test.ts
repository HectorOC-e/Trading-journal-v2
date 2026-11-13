import { describe, it, expect } from "vitest";
import {
  validateFiscalFile,
  readFiscalUploadBody,
  MAX_FISCAL_FILE_BYTES,
  downloadEvidence,
} from "@/server/services/tax/evidence-service";
describe("private fiscal evidence", () => {
  it("accepts a PDF by verified signature and computes a stable SHA256", () => {
    const file = validateFiscalFile(
      new TextEncoder().encode("%PDF-1.7\nQA fixture"),
      "application/pdf",
    );
    expect(file.mime).toBe("application/pdf");
    expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(
      validateFiscalFile(
        new TextEncoder().encode("%PDF-1.7\nQA fixture"),
        "application/pdf",
      ).sha256,
    ).toBe(file.sha256);
  });
  it("rejects active content disguised as a PDF and unsupported SVG", () => {
    expect(() =>
      validateFiscalFile(
        new TextEncoder().encode("<svg><script/></svg>"),
        "application/pdf",
      ),
    ).toThrow();
    expect(() =>
      validateFiscalFile(new TextEncoder().encode("<svg/>"), "image/svg+xml"),
    ).toThrow();
  });
  it("rejects oversized content before accepting evidence", () => {
    const bytes = new Uint8Array(MAX_FISCAL_FILE_BYTES + 1);
    bytes.set(new TextEncoder().encode("%PDF-"));
    expect(() => validateFiscalFile(bytes, "application/pdf")).toThrow();
  });
  it("bounds streamed multipart bodies even without a trustworthy length header", async () => {
    const chunk = new Uint8Array(MAX_FISCAL_FILE_BYTES + 65537);
    const body = new ReadableStream({
      start(c) {
        c.enqueue(chunk);
        c.close();
      },
    });
    await expect(
      readFiscalUploadBody(
        new Request("https://qa.test", {
          method: "POST",
          body,
          duplex: "half",
        } as RequestInit),
      ),
    ).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  });
  it("does not return a signed URL for another owner evidence", async () => {
    const db = {
      taxEvidence: {
        findFirst: async ({ where }: any) =>
          where.userId === "owner-a"
            ? {
                id: "file",
                userId: "owner-a",
                status: "AVAILABLE",
                path: "owner-a/file.pdf",
              }
            : null,
      },
    } as any;
    await expect(
      downloadEvidence(db, "owner-b", "file", {} as any),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
