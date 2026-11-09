import { describe, expect, it } from "vitest";
import {
  uploadEvidence,
  type FiscalStorage,
} from "@/server/services/tax/evidence-service";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** A serialized transaction store, with one deliberately delayed nontransactional read. */
function fixture(status = "OPEN") {
  const userId = "00000000-0000-4000-8000-000000000001";
  const periodId = "00000000-0000-4000-8000-000000000002";
  const period = { id: periodId, userId, status, revision: 1 };
  let evidence: any = null;
  let deletionPending = false;
  const audits = new Map<string, any>();
  const leases = new Map<string, any>();
  const objects = new Map<string, Uint8Array>();
  const uploadStarted = deferred(),
    releaseUpload = deferred();
  const staleReadStarted = deferred(),
    releaseStaleRead = deferred();
  let delayNextRead = false;
  let uploads = 0;
  const matches = (row: any, where: any) =>
    row &&
    Object.entries(where).every(([key, value]: any) =>
      key === "expiresAt" ? row.expiresAt > value.gt : row[key] === value,
    );
  const evidenceDelegate = {
    create: async ({ data }: any) => {
      evidence = { ...data, status: "PENDING", revision: 1 };
      return { ...evidence };
    },
    findFirst: async ({ where }: any) =>
      matches(evidence, where) ? { ...evidence } : null,
    update: async ({ data }: any) => {
      evidence = {
        ...evidence,
        ...data,
        revision: evidence.revision + (data.revision?.increment ?? 0),
      };
      return { ...evidence };
    },
  };
  const tx: any = {
    $queryRaw: async () => [],
    accountDeletionJob: {
      findUnique: async () => (deletionPending ? { userId } : null),
    },
    taxAuditEvent: {
      findUnique: async ({ where }: any) =>
        audits.get(where.userId_requestId.requestId) ?? null,
      create: async ({ data }: any) => {
        audits.set(data.requestId, data);
        return data;
      },
    },
    taxPeriod: {
      findMany: async () => [{ ...period }],
      findFirst: async ({ where }: any) =>
        matches(period, where) ? { ...period } : null,
      updateMany: async () => {
        period.revision++;
        return { count: 1 };
      },
    },
    taxReturn: { updateMany: async () => ({ count: 0 }), findFirst: async ({where}:any) => where.id === "00000000-0000-4000-8000-000000000088" && where.userId === userId && where.periodId === periodId ? {id:where.id, userId, periodId, closedAt:new Date(), snapshotHash:"immutable"} : null },
    taxEvidence: evidenceDelegate,
    taxUploadLease: {
      create: async ({ data }: any) => {
        leases.set(data.id, data);
        return data;
      },
    },
  };
  let transactions = Promise.resolve();
  const db: any = {
    $transaction: (fn: any) => {
      const result = transactions.then(() => fn(tx));
      transactions = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    accountDeletionJob: tx.accountDeletionJob,
    taxEvidence: {
      findFirst: async (args: any) => {
        const snapshot = await evidenceDelegate.findFirst(args);
        if (delayNextRead) {
          delayNextRead = false;
          staleReadStarted.resolve();
          await releaseStaleRead.promise;
        }
        return snapshot;
      },
    },
    taxUploadLease: {
      updateMany: async ({ where, data }: any) => {
        const lease = leases.get(where.id);
        if (lease) leases.set(where.id, { ...lease, ...data });
        return { count: lease ? 1 : 0 };
      },
    },
  };
  const storage: FiscalStorage = {
    upload: async (path, bytes) => {
      uploads++;
      uploadStarted.resolve();
      await releaseUpload.promise;
      objects.set(path, bytes);
      return { error: null };
    },
    download: async (path) => ({
      data: objects.has(path)
        ? new Blob([objects.get(path)! as Uint8Array<ArrayBuffer>])
        : null,
      error: null,
    }),
    remove: async (paths) => {
      for (const path of paths) objects.delete(path);
      return { error: null };
    },
    createSignedUrl: async () => ({ data: null, error: null }),
  };
  return {
    db,
    storage,
    userId,
    periodId,
    uploadStarted,
    releaseUpload,
    staleReadStarted,
    releaseStaleRead,
    delayRead: () => {
      delayNextRead = true;
    },
    requestDeletion: () => {
      deletionPending = true;
    },
    state: () => ({ evidence, leases, objects, uploads }),
  };
}
const bytes = new TextEncoder().encode("%PDF-1.7\nretry QA");

describe("same-request evidence upload retries", () => {
  it("attaches a new filing receipt after close without changing the archived return", async () => {
    const f=fixture("CLOSED"); f.releaseUpload.resolve();
    const input={periodId:f.periodId,expectedRevision:1,requestId:"00000000-0000-4000-8000-000000000003",name:"sar-receipt.pdf",mime:"application/pdf",filingReturnId:"00000000-0000-4000-8000-000000000088"};
    expect(await uploadEvidence(f.db,f.userId,input,bytes,f.storage)).toMatchObject({status:"AVAILABLE"});
    expect(f.state().uploads).toBe(1);
  });
  it.each([undefined,"00000000-0000-4000-8000-000000000099"])("rejects general uploads or unknown closed return: %s",async filingReturnId=>{
    const f=fixture("CLOSED"); f.releaseUpload.resolve();
    await expect(uploadEvidence(f.db,f.userId,{periodId:f.periodId,expectedRevision:1,requestId:"00000000-0000-4000-8000-000000000003",name:"sar.pdf",mime:"application/pdf",filingReturnId} as any,bytes,f.storage)).rejects.toBeDefined();
    expect(f.state().uploads).toBe(0);
  });

  it("keeps the original request content identity when an upload already succeeded", async () => {
    const f = fixture();
    const input = {
      periodId: f.periodId,
      expectedRevision: 1,
      requestId: "00000000-0000-4000-8000-000000000003",
      name: "proof.pdf",
      mime: "application/pdf",
    };
    f.releaseUpload.resolve();
    await uploadEvidence(f.db, f.userId, input, bytes, f.storage);
    await expect(
      uploadEvidence(
        f.db,
        f.userId,
        input,
        new TextEncoder().encode("%PDF-1.7\nchanged content"),
        f.storage,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(f.state().evidence.status).toBe("AVAILABLE");
    expect(f.state().objects.size).toBe(1);
    expect(f.state().uploads).toBe(1);
  });

  it("still rejects a stale retry when account deletion starts after its initial check", async () => {
    const f = fixture();
    const input = {
      periodId: f.periodId,
      expectedRevision: 1,
      requestId: "00000000-0000-4000-8000-000000000003",
      name: "proof.pdf",
      mime: "application/pdf",
    };
    const first = uploadEvidence(f.db, f.userId, input, bytes, f.storage);
    await f.uploadStarted.promise;
    f.delayRead();
    const retry = uploadEvidence(f.db, f.userId, input, bytes, f.storage);
    const retryResult = retry.then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    await f.staleReadStarted.promise;
    f.releaseUpload.resolve();
    await first;
    f.requestDeletion();
    f.releaseStaleRead.resolve();
    expect(await retryResult).toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
    expect(f.state().uploads).toBe(1);
    expect(f.state().leases.size).toBe(1);
  });

  it("returns the committed evidence when a delayed retry read saw the old pending version", async () => {
    const f = fixture();
    const input = {
      periodId: f.periodId,
      expectedRevision: 1,
      requestId: "00000000-0000-4000-8000-000000000003",
      name: "proof.pdf",
      mime: "application/pdf",
    };
    const first = uploadEvidence(f.db, f.userId, input, bytes, f.storage);
    await f.uploadStarted.promise;
    f.delayRead();
    const second = uploadEvidence(f.db, f.userId, input, bytes, f.storage);
    // Observe rejection immediately so the old implementation does not produce an unhandled rejection.
    const retryResult = second.then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    await f.staleReadStarted.promise;
    f.releaseUpload.resolve();
    const committed = await first;
    f.releaseStaleRead.resolve();
    expect(await retryResult).toEqual({ value: committed });
    expect(f.state().evidence.status).toBe("AVAILABLE");
    expect(f.state().objects.size).toBe(1);
    expect(f.state().uploads).toBe(1);
    expect(f.state().leases.size).toBe(1);
    expect(
      [...f.state().leases.values()].every((lease) => lease.completedAt),
    ).toBe(true);
  });
});
