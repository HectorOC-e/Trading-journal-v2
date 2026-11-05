import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Dependencies = {
  createAdmin: (deadline?: number) => SupabaseClient;
  now: () => Date;
  deadline?: number;
};
const defaults: Dependencies = {
  now: () => new Date(),
  createAdmin: (deadline = Date.now() + 40_000) => {
    const boundedFetch: typeof fetch = (input, init) => {
      const signals = [
        AbortSignal.timeout(
          Math.max(1, Math.min(10_000, deadline - Date.now())),
        ),
      ];
      if (init?.signal) signals.push(init.signal);
      return fetch(input, { ...init, signal: AbortSignal.any(signals) });
    };
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { fetch: boundedFetch },
      },
    );
  },
};
const pending = { ok: false, status: "pending" as const };
const completed = { ok: true, status: "completed" as const };
const LEASE_MS = 5 * 60_000;
const buckets = [
  "trade-screenshots",
  "setup-images",
  "practice-images",
] as const;

/** Persist first: failures after this point can be recovered without a user session. */
export async function requestAccountDeletion(
  db: PrismaClient,
  userId: string,
  deps = defaults,
) {
  await db.accountDeletionJob.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return processAccountDeletion(db, userId, deps);
}

export async function processAccountDeletion(
  db: PrismaClient,
  userId: string,
  deps = defaults,
) {
  const job = await db.accountDeletionJob.findUnique({ where: { userId } });
  if (!job) return pending;
  if (job.status === "completed") return completed;
  const now = deps.now(),
    token = randomUUID();
  const deadline = Math.min(now.getTime() + 40_000, deps.deadline ?? Infinity);
  const claimed = await db.accountDeletionJob.updateMany({
    where: {
      userId,
      status: { in: ["pending", "processing"] },
      nextAttemptAt: { lte: now },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
    },
    data: {
      status: "processing",
      leaseToken: token,
      leaseUntil: new Date(now.getTime() + LEASE_MS),
      attempts: { increment: 1 },
    },
  });
  if (!claimed.count) return pending;
  async function renew() {
    const at = deps.now();
    if (at.getTime() >= deadline) throw new Error("attempt_time_budget");
    const result = await db.accountDeletionJob.updateMany({
      where: {
        userId,
        leaseToken: token,
        status: "processing",
        leaseUntil: { gt: at },
      },
      data: { leaseUntil: new Date(at.getTime() + LEASE_MS) },
    });
    if (!result.count) throw new Error("lease_lost");
  }
  try {
    const admin = deps.createAdmin(deadline);
    // Collect legacy DB-owned paths before cascades remove their references.
    const [trades, setups, attachments] = await Promise.all([
      db.trade.findMany({
        where: { userId },
        select: { screenshotUrls: true },
      }),
      db.setup.findMany({ where: { userId }, select: { images: true } }),
      db.practiceAttachment.findMany({
        where: { practice: { userId } },
        select: { path: true },
      }),
    ]);
    // Legacy trade uploads used a shared trades/ directory. Storage ownership
    // finds unreferenced objects without sweeping another user's prefix.
    const ownedObjects = await db.$queryRaw<
      { bucket_id: string; name: string }[]
    >`
      SELECT bucket_id, name FROM storage.objects
      WHERE bucket_id IN ('trade-screenshots', 'setup-images', 'practice-images')
        AND owner_id = ${userId}
      ORDER BY bucket_id, name LIMIT 1000
    `;
    let operations = 0;
    for (const bucket of buckets) {
      const storage = admin.storage.from(bucket);
      const paths = new Set(
        ownedObjects.filter((o) => o.bucket_id === bucket).map((o) => o.name),
      );
      const mayRemove = (path: string) =>
        paths.has(path) ||
        path.startsWith(`${userId}/`) ||
        (bucket === "setup-images" && path.startsWith(`setups/${userId}/`));
      const urls =
        bucket === "trade-screenshots"
          ? trades.flatMap((t) => t.screenshotUrls)
          : bucket === "setup-images"
            ? setups.flatMap((s) => s.images)
            : [];
      for (const url of urls) {
        const marker = `/storage/v1/object/public/${bucket}/`;
        const pos = url.indexOf(marker);
        if (pos >= 0) {
          const path = decodeURIComponent(
            url.slice(pos + marker.length).split("?")[0],
          );
          if (mayRemove(path)) paths.add(path);
        }
      }
      if (bucket === "practice-images")
        for (const a of attachments) if (mayRemove(a.path)) paths.add(a.path);
      // Delete each page before fetching the next. Bounded attempts always make
      // progress, including prefixes larger than one invocation's time budget.
      async function removePaths(all: string[]) {
        for (let i = 0; i < all.length; i += 100) {
          await renew();
          const { error } = await storage.remove(all.slice(i, i + 100));
          if (error) throw new Error("storage_remove_failed");
        }
      }
      await removePaths([...paths]);
      async function sweep(folder: string): Promise<void> {
        while (true) {
          await renew();
          if (++operations > 200) throw new Error("storage_batch_limit");
          const { data, error } = await storage.list(folder, {
            limit: 100,
            offset: 0,
            sortBy: { column: "name", order: "asc" },
          });
          if (error || !data) throw new Error("storage_list_failed");
          if (!data.length) return;
          await removePaths(
            data
              .filter((item) => item.id)
              .map((item) => `${folder}/${item.name}`),
          );
          for (const item of data)
            if (!item.id) await sweep(`${folder}/${item.name}`);
          // Deletions shift pagination; always restart at zero.
        }
      }
      await sweep(userId);
      if (bucket === "setup-images") await sweep(`setups/${userId}`);
    }
    // Storage owners can block Auth deletion: remove objects first, preserve DB until Auth succeeds.
    await renew();
    const deletion = await admin.auth.admin.deleteUser(userId);
    if (deletion.error && deletion.error.status !== 404)
      throw new Error("auth_delete_failed");
    const identity = await admin.auth.admin.getUserById(userId);
    if (
      identity.data?.user ||
      (identity.error && identity.error.status !== 404)
    )
      throw new Error("auth_verification_failed");
    // Verify no new uploads appeared while identity deletion was in flight. If
    // anything remains, keep the intent pending so the next attempt sweeps it.
    for (const bucket of buckets) {
      for (const prefix of [
        userId,
        ...(bucket === "setup-images" ? [`setups/${userId}`] : []),
      ]) {
        const folders = [prefix];
        while (folders.length) {
          await renew();
          if (++operations > 200) throw new Error("storage_batch_limit");
          const folder = folders.shift()!;
          const { data, error } = await admin.storage
            .from(bucket)
            .list(folder, { limit: 100 });
          if (error || !data) throw new Error("storage_verification_failed");
          for (const item of data) {
            if (item.id) throw new Error("storage_not_empty");
            folders.push(`${folder}/${item.name}`);
          }
          // More than 100 empty directories still requires another attempt; never
          // declare completion after checking only the first page.
          if (data.length === 100)
            throw new Error("storage_verification_limit");
        }
      }
    }
    await renew();
    await db.user.deleteMany({ where: { id: userId } });
    if (
      await db.user.findUnique({ where: { id: userId }, select: { id: true } })
    )
      throw new Error("db_verification_failed");
    const done = await db.accountDeletionJob.updateMany({
      where: { userId, leaseToken: token, status: "processing" },
      data: { status: "completed", leaseToken: null, leaseUntil: null },
    });
    return done.count ? completed : pending;
  } catch {
    // Never persist provider errors: they can contain credentials or personal data.
    const delay = Math.min(
      24 * 60 * 60_000,
      60_000 * 2 ** Math.min(job.attempts, 10),
    );
    await db.accountDeletionJob.updateMany({
      where: { userId, leaseToken: token },
      data: {
        status: "pending",
        leaseToken: null,
        leaseUntil: null,
        nextAttemptAt: new Date(deps.now().getTime() + delay),
      },
    });
    return pending;
  }
}

export async function processAccountDeletionBatch(
  db: PrismaClient,
  deps = defaults,
) {
  const start = deps.now().getTime();
  const jobs = await db.accountDeletionJob.findMany({
    where: {
      status: { in: ["pending", "processing"] },
      nextAttemptAt: { lte: deps.now() },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: deps.now() } }],
    },
    orderBy: { nextAttemptAt: "asc" },
    take: 5,
    select: { userId: true },
  });
  let completedCount = 0,
    processed = 0;
  for (const job of jobs) {
    if (deps.now().getTime() - start > 40_000) break;
    const result = await processAccountDeletion(db, job.userId, {
      ...deps,
      deadline: start + 45_000,
    });
    processed++;
    if (result.ok) completedCount++;
  }
  return {
    processed,
    completed: completedCount,
    pending: processed - completedCount,
  };
}
