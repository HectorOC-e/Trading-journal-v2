import { createHash, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { withTaxWrite } from "./context";
import { serializeTax } from "./serializers";
export const MAX_FISCAL_FILE_BYTES = 4 * 1024 * 1024;
export interface FiscalStorage {
  upload(
    path: string,
    bytes: Uint8Array,
    options: { contentType: string; upsert: boolean; cacheControl: string },
  ): Promise<{ error: { message: string } | null }>;
  download(
    path: string,
  ): Promise<{ data: Blob | null; error: { message: string } | null }>;
  remove(paths: string[]): Promise<{ error: { message: string } | null }>;
  createSignedUrl(
    path: string,
    expires: number,
    options: { download: string },
  ): Promise<{
    data: { signedUrl: string } | null;
    error: { message: string } | null;
  }>;
}
export function validateFiscalFile(bytes: Uint8Array, declaredMime: string) {
  if (!bytes.length || bytes.length > MAX_FISCAL_FILE_BYTES)
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: "Máximo 4 MiB por documento.",
    });
  const has = (v: number[]) => v.every((n, i) => bytes[i] === n);
  const mime = has([0x25, 0x50, 0x44, 0x46, 0x2d])
    ? "application/pdf"
    : has([0xff, 0xd8, 0xff])
      ? "image/jpeg"
      : has([137, 80, 78, 71, 13, 10, 26, 10])
        ? "image/png"
        : null;
  if (!mime || mime !== declaredMime)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "El archivo debe ser un PDF, PNG o JPEG válido.",
    });
  return {
    mime,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
export async function readFiscalUploadBody(
  request: Request,
): Promise<FormData> {
  const limit = MAX_FISCAL_FILE_BYTES + 65536;
  if (Number(request.headers.get("content-length")) > limit)
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE" });
  const reader = request.body?.getReader();
  if (!reader)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selecciona un documento.",
    });
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new TRPCError({
        code: "PAYLOAD_TOO_LARGE",
        message: "Máximo 4 MiB por documento.",
      });
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return await new Response(body, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Formulario de documento inválido.",
    });
  }
}
function phaseId(requestId: string, phase: string) {
  const h = createHash("sha256")
    .update(requestId + ":" + phase)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export async function uploadEvidence(
  db: PrismaClient,
  userId: string,
  input: {
    periodId: string;
    expectedRevision: number;
    requestId: string;
    name: string;
    mime: string;
    documentDate?: string;
    supersedesId?: string;
  },
  bytes: Uint8Array,
  storage: FiscalStorage,
) {
  const verified = validateFiscalFile(bytes, input.mime);
  const payload = { ...input, ...verified };
  const started = await withTaxWrite(
    db,
    userId,
    {
      requestId: input.requestId,
      action: "evidence.upload",
      payload,
      periodIds: [input.periodId],
      expectedRevisions: { [input.periodId]: input.expectedRevision },
    },
    async (tx) => {
      if (input.supersedesId) {
        const prior = await tx.taxEvidence.findFirst({
          where: {
            id: input.supersedesId,
            userId,
            periodId: input.periodId,
            status: "AVAILABLE",
          },
        });
        if (!prior)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Documento anterior no disponible.",
          });
      }
      const id = randomUUID();
      const path = `${userId}/${id}/${randomUUID()}.${verified.mime === "application/pdf" ? "pdf" : verified.mime === "image/png" ? "png" : "jpg"}`;
      return tx.taxEvidence.create({
        data: {
          id,
          userId,
          periodId: input.periodId,
          name: input.name,
          ...verified,
          path,
          documentDate: input.documentDate
            ? new Date(input.documentDate)
            : null,
          supersedesId: input.supersedesId,
          expiresAt: new Date(Date.now() + 15 * 60000),
        },
      });
    },
  );
  if (
    !started ||
    Array.isArray(started) ||
    typeof started !== "object" ||
    typeof started.id !== "string"
  )
    throw Error("Invalid evidence identity");
  const evidence = await db.taxEvidence.findFirst({
    where: { id: started.id, userId },
  });
  if (!evidence) throw new TRPCError({ code: "NOT_FOUND" });
  if (evidence.status === "AVAILABLE") return serializeTax(evidence);
  if (
    evidence.status !== "PENDING" ||
    evidence.expiresAt.getTime() < Date.now()
  )
    throw new TRPCError({
      code: "CONFLICT",
      message: "La carga caducó. Selecciona el archivo de nuevo.",
    });
  try {
    const uploaded = await storage.upload(evidence.path, bytes, {
      contentType: verified.mime,
      upsert: false,
      cacheControl: "0",
    });
    if (uploaded.error) {
      // A retry can encounter the immutable object already uploaded by the same request.
      const previous = await storage.download(evidence.path);
      if (
        previous.error ||
        !previous.data ||
        createHash("sha256")
          .update(new Uint8Array(await previous.data.arrayBuffer()))
          .digest("hex") !== verified.sha256
      )
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "No se pudo almacenar el documento. Inténtalo de nuevo.",
        });
    }
    return await withTaxWrite(
      db,
      userId,
      {
        requestId: phaseId(input.requestId, "finalize"),
        action: "evidence.finalize",
        payload: { id: evidence.id, sha256: verified.sha256 },
        periodIds: [input.periodId],
        expectedRevisions: { [input.periodId]: input.expectedRevision + 1 },
      },
      async (tx) => {
        const current = await tx.taxEvidence.findFirst({
          where: {
            id: evidence.id,
            userId,
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
        });
        if (!current)
          throw new TRPCError({
            code: "CONFLICT",
            message: "La carga ya no está disponible.",
          });
        return tx.taxEvidence.update({
          where: { id: evidence.id, userId },
          data: { status: "AVAILABLE", revision: { increment: 1 } },
        });
      },
    );
  } catch (error) {
    // Technical compensation cannot change available evidence or financial snapshots.
    const deletionPending = await db.accountDeletionJob
      .findUnique({ where: { userId }, select: { userId: true } })
      .catch(() => null);
    const rejected = deletionPending
      ? true
      : await withTaxWrite(
          db,
          userId,
          {
            requestId: phaseId(input.requestId, "reject"),
            action: "evidence.rejectPending",
            payload: { id: evidence.id },
          },
          async (tx) => {
            const current = await tx.taxEvidence.findFirst({
              where: { id: evidence.id, userId },
            });
            if (!current || current.status === "AVAILABLE") return false;
            await tx.taxEvidence.update({
              where: { id: evidence.id, userId },
              data: { status: "REJECTED", revision: { increment: 1 } },
            });
            return true;
          },
        ).catch(() => {
          console.error("tax_evidence_pending_compensation_failed");
          return false;
        });
    if (rejected) {
      try {
        const cleanup = await storage.remove([evidence.path]);
        if (cleanup.error)
          console.error("tax_evidence_object_compensation_failed");
      } catch {
        console.error("tax_evidence_object_compensation_failed");
      }
    }
    throw error;
  }
}
export async function listEvidence(
  db: PrismaClient,
  userId: string,
  periodId: string,
  cursor?: string,
) {
  const period = await db.taxPeriod.findFirst({
    where: { id: periodId, userId },
    select: { id: true },
  });
  if (!period) throw new TRPCError({ code: "NOT_FOUND" });
  const items = await db.taxEvidence.findMany({
    where: {
      userId,
      periodId,
      status: { not: "REMOVED" },
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    orderBy: { id: "asc" },
    take: 100,
  });
  return serializeTax({
    items,
    nextCursor: items.length === 100 ? items[items.length - 1].id : null,
  });
}
export async function downloadEvidence(
  db: PrismaClient,
  userId: string,
  id: string,
  storage: FiscalStorage,
) {
  const evidence = await db.taxEvidence.findFirst({
    where: { id, userId, status: "AVAILABLE" },
  });
  if (!evidence)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Documento no disponible.",
    });
  const { data, error } = await storage.createSignedUrl(evidence.path, 300, {
    download: evidence.name.replace(/[\r\n\0]/g, ""),
  });
  if (error || !data)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "No se pudo descargar el documento.",
    });
  return { id: evidence.id, name: evidence.name, url: data.signedUrl };
}
type EvidenceTarget = "income" | "transaction" | "deduction" | "credit";
const delegates = {
  income: "taxIncome",
  transaction: "taxTransaction",
  deduction: "taxDeduction",
  credit: "taxCredit",
} as const;
const links = {
  income: "taxIncomeEvidence",
  transaction: "taxTransactionEvidence",
  deduction: "taxDeductionEvidence",
  credit: "taxCreditEvidence",
} as const;
export async function linkEvidence(
  db: PrismaClient,
  userId: string,
  input: {
    periodId: string;
    expectedRevision: number;
    requestId: string;
    evidenceId: string;
    target: EvidenceTarget;
    targetId: string;
  },
) {
  return withTaxWrite(
    db,
    userId,
    {
      requestId: input.requestId,
      action: "evidence.link",
      payload: input,
      periodIds: [input.periodId],
      expectedRevisions: { [input.periodId]: input.expectedRevision },
    },
    async (tx) => {
      const evidence = await tx.taxEvidence.findFirst({
        where: {
          id: input.evidenceId,
          userId,
          periodId: input.periodId,
          status: "AVAILABLE",
        },
      });
      if (!evidence) throw new TRPCError({ code: "NOT_FOUND" });
      const record = await (
        tx[delegates[input.target]] as unknown as {
          findFirst: (args: unknown) => Promise<unknown>;
        }
      ).findFirst({
        where: { id: input.targetId, userId, periodId: input.periodId },
      });
      if (!record)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registro fiscal no disponible.",
        });
      const delegate = tx[links[input.target]] as unknown as {
        findFirst: (args: unknown) => Promise<unknown>;
        create: (args: unknown) => Promise<unknown>;
      };
      const field = input.target + "Id";
      const previous = await delegate.findFirst({
        where: {
          userId,
          evidenceId: input.evidenceId,
          [field]: input.targetId,
        },
      });
      if (previous) return previous;
      return delegate.create({
        data: { userId, evidenceId: input.evidenceId, [field]: input.targetId },
      });
    },
  );
}
export async function removeEvidence(
  db: PrismaClient,
  userId: string,
  input: {
    periodId: string;
    expectedRevision: number;
    requestId: string;
    id: string;
  },
  storage: FiscalStorage,
) {
  const result = await withTaxWrite(
    db,
    userId,
    {
      requestId: input.requestId,
      action: "evidence.remove",
      payload: input,
      periodIds: [input.periodId],
      expectedRevisions: { [input.periodId]: input.expectedRevision },
    },
    async (tx) => {
      const evidence = await tx.taxEvidence.findFirst({
        where: { id: input.id, userId, periodId: input.periodId },
        include: { returnLinks: { select: { id: true }, take: 1 } },
      });
      if (!evidence) throw new TRPCError({ code: "NOT_FOUND" });
      if (evidence.returnLinks.length)
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "El documento forma parte de un borrador archivado. Consérvalo y añade una nueva versión.",
        });
      await tx.taxEvidence.update({
        where: { id: evidence.id, userId },
        data: { status: "REMOVED", revision: { increment: 1 } },
      });
      return { id: evidence.id, path: evidence.path };
    },
  );
  if (
    result &&
    typeof result === "object" &&
    !Array.isArray(result) &&
    typeof result.path === "string"
  ) {
    const { error } = await storage.remove([result.path]);
    if (error)
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message:
          "El documento fue retirado; vuelve a intentarlo para completar el borrado del archivo.",
      });
  }
  return { ok: true };
}
