import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "@/server/trpc/root";
import { TRPCError } from "@trpc/server";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const mockDeleteUser = vi.fn().mockResolvedValue({ error: null });
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      admin: {
        deleteUser: mockDeleteUser,
        getUserById: vi.fn(async () => ({
          data: { user: null },
          error: { status: 404 },
        })),
      },
    },
    storage: {
      from: () => ({
        list: vi.fn(async () => ({ data: [], error: null })),
        remove: vi.fn(async () => ({ error: null })),
      }),
    },
  }),
}));

const USER_ID = "550e8400-e29b-41d4-a716-446655440001";

const BASE_USER = {
  id: USER_ID,
  email: "trader@example.com",
  name: "Test Trader",
  role: "USER",
  timezone: "America/Tegucigalpa",
  baseCurrency: "USD",
  language: "es",
  weeklyGoalMinutes: 300,
  emailNotifications: true,
  currentStreak: 5,
  bestStreak: 12,
  lastReviewDate: new Date("2026-05-20T00:00:00.000Z"),
  createdAt: new Date("2025-01-10T00:00:00.000Z"),
};

function makeMockPrisma() {
  return {
    taxUploadLease: { count: vi.fn(async () => 0), deleteMany: vi.fn(async () => ({count:0})) },
    $queryRaw: vi.fn(async () => []),
    accountDeletionJob: {
      upsert: vi.fn(async () => ({})),
      findUnique: vi.fn(async () => ({ status: "pending", attempts: 0 })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    setup: { findMany: vi.fn(async () => []) },
    practiceAttachment: { findMany: vi.fn(async () => []) },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    trade: { findMany: vi.fn().mockResolvedValue([]) },
    account: { findMany: vi.fn().mockResolvedValue([]) },
    rule: { findMany: vi.fn().mockResolvedValue([]) },
    weeklyReview: { findMany: vi.fn().mockResolvedValue([]) },
    tradeStatsCache: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  };
}

const mockSupabase = {
  auth: {
    updateUser: vi.fn().mockResolvedValue({ error: null }),
  },
};

describe("profile.get", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
    caller = appRouter.createCaller({
      prisma: mockPrisma as any,
      supabase: mockSupabase as any,
      userId: USER_ID,
    });
    vi.clearAllMocks();
    mockDeleteUser.mockResolvedValue({ error: null });
  });

  it("returns user data with Date fields serialized to ISO strings", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(BASE_USER);

    const result = await caller.profile.get();

    expect(typeof result.lastReviewDate).toBe("string");
    expect(typeof result.createdAt).toBe("string");
    expect(result.lastReviewDate).toBe("2026-05-20T00:00:00.000Z");
    expect(result.createdAt).toBe("2025-01-10T00:00:00.000Z");
  });

  it("serializes null lastReviewDate to null (not ISO string)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...BASE_USER,
      lastReviewDate: null,
    });

    const result = await caller.profile.get();

    expect(result.lastReviewDate).toBeNull();
  });

  it("throws NOT_FOUND when user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(caller.profile.get()).rejects.toThrow(TRPCError);
    await expect(caller.profile.get()).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("queries with userId scope", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(BASE_USER);

    await caller.profile.get();

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER_ID } }),
    );
  });
});

describe("profile.update — M-005 date serialization + M-004 cache gate", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
    caller = appRouter.createCaller({
      prisma: mockPrisma as any,
      supabase: mockSupabase as any,
      userId: USER_ID,
    });
    vi.clearAllMocks();
    mockDeleteUser.mockResolvedValue({ error: null });
    mockPrisma.user.update.mockResolvedValue(BASE_USER);
  });

  it("returns Date fields as ISO strings, not Date objects", async () => {
    const result = await caller.profile.update({ name: "New Name" });

    expect(typeof result.createdAt).toBe("string");
    expect(typeof result.lastReviewDate).toBe("string");
    expect(result.createdAt).toBe("2025-01-10T00:00:00.000Z");
  });

  it("returns null for null lastReviewDate", async () => {
    mockPrisma.user.update.mockResolvedValue({
      ...BASE_USER,
      lastReviewDate: null,
    });

    const result = await caller.profile.update({ name: "New Name" });

    expect(result.lastReviewDate).toBeNull();
  });

  it("invalidates analytics cache when baseCurrency is sent (M-004 gate)", async () => {
    await caller.profile.update({ baseCurrency: "EUR" });

    expect(mockPrisma.tradeStatsCache.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });

  it("invalidates analytics cache when timezone is sent (M-004 gate)", async () => {
    await caller.profile.update({ timezone: "Europe/London" });

    expect(mockPrisma.tradeStatsCache.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });

  it("does NOT invalidate analytics cache when only name is sent (M-004 gate)", async () => {
    await caller.profile.update({ name: "New Name" });

    expect(mockPrisma.tradeStatsCache.deleteMany).not.toHaveBeenCalled();
  });

  it("does NOT invalidate analytics cache for emailNotifications-only change (M-004 gate)", async () => {
    await caller.profile.update({ emailNotifications: false });

    expect(mockPrisma.tradeStatsCache.deleteMany).not.toHaveBeenCalled();
  });

  it("throws BAD_REQUEST for invalid timezone", async () => {
    await expect(
      caller.profile.update({ timezone: "Not/ATimezone" }),
    ).rejects.toThrow(TRPCError);
  });

  it("throws BAD_REQUEST for invalid currency code", async () => {
    await expect(caller.profile.update({ baseCurrency: "US" })).rejects.toThrow(
      TRPCError,
    );
  });

  it("passes weeklyTradesGoal to Prisma update data (B-01 type-contract fix)", async () => {
    await caller.profile.update({ weeklyTradesGoal: 10 });
    const call = mockPrisma.user.update.mock.calls[0][0];
    expect(call.data).toMatchObject({ weeklyTradesGoal: 10 });
  });

  it("passes weeklyPnlGoal to Prisma update data (B-01 type-contract fix)", async () => {
    await caller.profile.update({ weeklyPnlGoal: 500 });
    const call = mockPrisma.user.update.mock.calls[0][0];
    expect(call.data).toMatchObject({ weeklyPnlGoal: 500 });
  });

  it("passes null weeklyTradesGoal to clear goal (B-01 type-contract fix)", async () => {
    await caller.profile.update({ weeklyTradesGoal: null });
    const call = mockPrisma.user.update.mock.calls[0][0];
    expect(call.data).toMatchObject({ weeklyTradesGoal: null });
  });
});

describe("profile.changePassword", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
    caller = appRouter.createCaller({
      prisma: mockPrisma as any,
      supabase: mockSupabase as any,
      userId: USER_ID,
    });
    vi.clearAllMocks();
    mockDeleteUser.mockResolvedValue({ error: null });
  });

  it("returns { ok: true } on success", async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const result = await caller.profile.changePassword({
      newPassword: "newpass123",
    });

    expect(result).toEqual({ ok: true });
  });

  it("throws BAD_REQUEST when supabase returns an error", async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({
      error: { message: "Auth error" },
    });

    await expect(
      caller.profile.changePassword({ newPassword: "newpass123" }),
    ).rejects.toThrow(TRPCError);
    await expect(
      caller.profile.changePassword({ newPassword: "newpass123" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects passwords shorter than 8 chars at the input validation level", async () => {
    await expect(
      caller.profile.changePassword({ newPassword: "short" }),
    ).rejects.toThrow();
  });
});

describe("profile.deleteAccount durable cleanup", () => {
  let p: ReturnType<typeof makeMockPrisma>,
    caller: ReturnType<typeof appRouter.createCaller>;
  beforeEach(() => {
    p = makeMockPrisma();
    caller = appRouter.createCaller({
      prisma: p as never,
      supabase: mockSupabase as never,
      userId: USER_ID,
    });
    vi.clearAllMocks();
    mockDeleteUser.mockResolvedValue({ error: null });
  });
  it("completes Auth and DB cleanup after recording intent", async () => {
    expect(await caller.profile.deleteAccount()).toEqual({
      ok: true,
      status: "completed",
    });
    expect(p.accountDeletionJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { userId: USER_ID } }),
    );
    expect(mockDeleteUser).toHaveBeenCalledWith(USER_ID);
    expect(p.user.deleteMany).toHaveBeenCalledWith({ where: { id: USER_ID } });
  });
  it("deletes Auth before application data", async () => {
    const order: string[] = [];
    mockDeleteUser.mockImplementation(async () => {
      order.push("auth");
      return { error: null };
    });
    p.user.deleteMany.mockImplementation(async () => {
      order.push("database");
      return { count: 1 };
    });
    await caller.profile.deleteAccount();
    expect(order).toEqual(["auth", "database"]);
  });
  it("returns pending and preserves DB when Auth fails", async () => {
    mockDeleteUser.mockResolvedValue({ error: { status: 503 } });
    expect(await caller.profile.deleteAccount()).toEqual({
      ok: false,
      status: "pending",
    });
    expect(p.user.deleteMany).not.toHaveBeenCalled();
  });
  it("returns pending when DB cleanup fails after Auth deletion", async () => {
    p.user.deleteMany.mockRejectedValue(new Error("db unavailable"));
    expect(await caller.profile.deleteAccount()).toEqual({
      ok: false,
      status: "pending",
    });
    expect(p.accountDeletionJob.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "pending" }),
      }),
    );
  });
});

describe("learning reminder time", () => {
  it("persists a valid 24-hour reminder using only the current user", async () => {
    const p = makeMockPrisma();
    p.user.update.mockResolvedValue({
      ...BASE_USER,
      learningReminderTime: "06:45",
    });
    const c = appRouter.createCaller({
      prisma: p as never,
      supabase: mockSupabase as never,
      userId: USER_ID,
    });
    const result = await c.profile.update({ learningReminderTime: "06:45" });
    expect(p.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({ learningReminderTime: "06:45" }),
        select: expect.objectContaining({ learningReminderTime: true }),
      }),
    );
    expect(result.learningReminderTime).toBe("06:45");
  });
  it.each(["24:00", "19:60", "7:00", "", "abc", "19:00\n"])(
    "rejects invalid reminder %s",
    async (learningReminderTime) => {
      const p = makeMockPrisma();
      p.user.update.mockResolvedValue(BASE_USER);
      const c = appRouter.createCaller({
        prisma: p as never,
        supabase: mockSupabase as never,
        userId: USER_ID,
      });
      await expect(
        c.profile.update({ learningReminderTime }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(p.user.update).not.toHaveBeenCalled();
    },
  );
});
