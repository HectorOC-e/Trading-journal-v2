import { beforeEach, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "@/app/api/upload/practice-image/route";
const mocks = vi.hoisted(() => ({
  adminThrows: false,
  deletion: vi.fn(),
  user: { id: "11111111-1111-4111-8111-111111111111" } as { id: string } | null,
  find: vi.fn(),
  signed: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
    storage: {
      from: () => ({ createSignedUrl: mocks.signed, remove: mocks.remove }),
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    if (mocks.adminThrows) throw new Error("supabaseKey is required");
    return {
      storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
    };
  },
}));
vi.mock("@/lib/prisma", () => {
  const p = {
    accountDeletionJob: { findUnique: mocks.deletion },
    learningPractice: { findFirst: mocks.find, update: mocks.update },
    practiceAttachment: { create: mocks.create },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  p.$transaction.mockImplementation((fn) => fn(p));
  return { prisma: p };
});
const id = "22222222-2222-4222-8222-222222222222";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.adminThrows = false;
  mocks.deletion.mockResolvedValue(null);
  mocks.user = { id: "11111111-1111-4111-8111-111111111111" };
  mocks.find.mockResolvedValue(null);
});
it("requires authentication to read private evidence", async () => {
  mocks.user = null;
  expect(
    (
      await GET(
        new NextRequest(
          "https://app/api/upload/practice-image?practiceId=" + id,
        ),
      )
    ).status,
  ).toBe(401);
  expect(mocks.find).not.toHaveBeenCalled();
});
it("does not sign evidence outside own practice", async () => {
  expect(
    (
      await GET(
        new NextRequest(
          "https://app/api/upload/practice-image?practiceId=" + id,
        ),
      )
    ).status,
  ).toBe(404);
  expect(mocks.signed).not.toHaveBeenCalled();
  expect(mocks.find.mock.calls[0][0].where.userId).toBe(mocks.user?.id);
});
it("rejects fake image content before storage", async () => {
  const f = new FormData();
  f.set("practiceId", id);
  f.set("expectedVersion", "1");
  f.set("uploadId", id);
  f.set("file", new File(["<script>"], "bad.png", { type: "image/png" }));
  expect(
    (
      await POST(
        new NextRequest("https://app/api/upload/practice-image", {
          method: "POST",
          body: f,
        }),
      )
    ).status,
  ).toBe(400);
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("does not upload to another user practice", async () => {
  const f = new FormData();
  f.set("practiceId", id);
  f.set("expectedVersion", "1");
  f.set("uploadId", id);
  f.set(
    "file",
    new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "a.png", {
      type: "image/png",
    }),
  );
  expect(
    (
      await POST(
        new NextRequest("https://app/api/upload/practice-image", {
          method: "POST",
          body: f,
        }),
      )
    ).status,
  ).toBe(404);
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("does not delete another user evidence", async () => {
  expect(
    (
      await DELETE(
        new NextRequest("https://app/api/upload/practice-image", {
          method: "DELETE",
          body: JSON.stringify({
            practiceId: id,
            expectedVersion: 1,
            attachmentId: id,
          }),
        }),
      )
    ).status,
  ).toBe(404);
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("rejects uploading beyond five images", async () => {
  mocks.find.mockResolvedValue({
    id,
    version: 1,
    attachments: Array.from({ length: 5 }, () => ({})),
  });
  const f = new FormData();
  f.set("practiceId", id);
  f.set("expectedVersion", "1");
  f.set("uploadId", id);
  f.set(
    "file",
    new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "a.png", {
      type: "image/png",
    }),
  );
  expect(
    (
      await POST(
        new NextRequest("https://app/api/upload/practice-image", {
          method: "POST",
          body: f,
        }),
      )
    ).status,
  ).toBe(400);
  expect(mocks.upload).not.toHaveBeenCalled();
});

it("returns existing upload on retry even after practice version changed", async () => {
  mocks.find.mockResolvedValue({
    id,
    version: 2,
    attachments: [{ id, path: "existing" }],
  });
  const f = new FormData();
  f.set("practiceId", id);
  f.set("expectedVersion", "1");
  f.set("uploadId", id);
  f.set(
    "file",
    new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "a.png", {
      type: "image/png",
    }),
  );
  const response = await POST(
    new NextRequest("https://app/api/upload/practice-image", {
      method: "POST",
      body: f,
    }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ version: 2 });
  expect(mocks.upload).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});

it("returns a readable error when preview storage credentials are unavailable", async () => {
  mocks.adminThrows = true;
  mocks.find.mockResolvedValue({ id, version: 1, attachments: [] });
  const f = new FormData();
  f.set("practiceId", id);
  f.set("expectedVersion", "1");
  f.set("uploadId", id);
  f.set(
    "file",
    new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "a.png", {
      type: "image/png",
    }),
  );
  const response = await POST(
    new NextRequest("https://app/api/upload/practice-image", {
      method: "POST",
      body: f,
    }),
  );
  expect(response.status).toBe(503);
  expect((await response.json()).error).not.toContain("supabaseKey");
});

it("rejects an over-4 MB image before storage or database access", async () => {
  const bytes = new Uint8Array(4 * 1024 * 1024 + 1);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const f = new FormData();
  f.set("practiceId", id);
  f.set("expectedVersion", "1");
  f.set("uploadId", id);
  f.set("file", new File([bytes], "large.png", { type: "image/png" }));
  const response = await POST(
    new NextRequest("https://app/api/upload/practice-image", {
      method: "POST",
      body: f,
    }),
  );
  expect(response.status).toBe(400);
  expect(mocks.find).not.toHaveBeenCalled();
  expect(mocks.upload).not.toHaveBeenCalled();
});

it("blocks uploads while durable deletion is pending", async () => {
  mocks.deletion.mockResolvedValue({ userId: mocks.user!.id });
  const response = await POST(
    new NextRequest("https://app/api/upload/practice-image", {
      method: "POST",
    }),
  );
  expect(response.status).toBe(403);
  expect(mocks.upload).not.toHaveBeenCalled();
  expect(mocks.find).not.toHaveBeenCalled();
});
