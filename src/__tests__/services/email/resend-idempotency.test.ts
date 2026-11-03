import { afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  send: vi.fn(async () => ({ data: { id: "sent" }, error: null })),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: m.send };
  },
}));
import { sendEmail } from "@/server/services/email/resend-client";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it("passes a daily idempotency key to the provider to prevent duplicate deliveries", async () => {
  vi.stubEnv("RESEND_API_KEY", "test-only");
  await sendEmail({
    to: "qa@example.invalid",
    subject: "Test",
    html: "<p>Test</p>",
    idempotencyKey: "learning-digest/test/2026-11-03",
  });
  expect(m.send).toHaveBeenCalledWith(
    expect.objectContaining({ to: "qa@example.invalid" }),
    { idempotencyKey: "learning-digest/test/2026-11-03" },
  );
});
