import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createStorageClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import {
  readFiscalUploadBody,
  uploadEvidence,
  listEvidence,
  downloadEvidence,
  linkEvidence,
  removeEvidence,
} from "@/server/services/tax/evidence-service";
export const runtime = "nodejs";
export const maxDuration = 60;
function fiscalStorage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Los documentos no están disponibles en este entorno.",
    });
  return createStorageClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: AbortSignal.any([
            AbortSignal.timeout(20000),
            ...(init?.signal ? [init.signal] : []),
          ]),
        }),
    },
  }).storage.from("tax-evidence");
}
const uuid = z.string().uuid();
const write = z.object({
  periodId: uuid,
  requestId: uuid,
  expectedRevision: z.coerce.number().int().positive(),
});
const headers = { "Cache-Control": "private, no-store" };
async function identity() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (
    !user ||
    (await prisma.accountDeletionJob.findUnique({
      where: { userId: user.id },
      select: { userId: true },
    }))
  )
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Inicia sesión para acceder a tus documentos.",
    });
  return user.id;
}
function failure(error: unknown) {
  const status =
    error instanceof TRPCError
      ? ((
          {
            UNAUTHORIZED: 401,
            FORBIDDEN: 403,
            NOT_FOUND: 404,
            BAD_REQUEST: 400,
            CONFLICT: 409,
            PAYLOAD_TOO_LARGE: 413,
          } as Record<string, number>
        )[error.code] ?? 503)
      : error instanceof z.ZodError
        ? 400
        : 500;
  if (status === 500)
    console.error("tax_evidence_unexpected_error", {
      type: error instanceof Error ? error.name : "unknown",
    });
  return Response.json(
    {
      error:
        error instanceof TRPCError
          ? error.message
          : status === 400
            ? "Revisa los datos del documento."
            : "No se pudo completar la operación del documento.",
    },
    { status, headers },
  );
}
export async function GET(req: Request) {
  try {
    const userId = await identity(),
      url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id)
      return Response.json(
        await downloadEvidence(prisma, userId, uuid.parse(id), fiscalStorage()),
        { headers },
      );
    const periodId = uuid.parse(url.searchParams.get("periodId")),
      cursor = uuid
        .optional()
        .parse(url.searchParams.get("cursor") ?? undefined);
    return Response.json(await listEvidence(prisma, userId, periodId, cursor), {
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: Request) {
  try {
    const userId = await identity(),
      form = await readFiscalUploadBody(req),
      file = form.get("file");
    if (!(file instanceof File))
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Selecciona un documento.",
      });
    const input = write
      .extend({
        name: z
          .string()
          .trim()
          .min(1)
          .max(180)
          .regex(/^[^\r\n\0]+$/),
        mime: z.string(),
        documentDate: z.iso.date().optional(),
        supersedesId: uuid.optional(),
        filingReturnId: uuid.optional(),
      })
      .strict()
      .parse({
        periodId: form.get("periodId"),
        requestId: form.get("requestId"),
        expectedRevision: form.get("expectedRevision"),
        name: file.name,
        mime: file.type,
        documentDate: form.get("documentDate") || undefined,
        supersedesId: form.get("supersedesId") || undefined,
        filingReturnId: form.get("filingReturnId") || undefined,
      });
    const result = await uploadEvidence(
      prisma,
      userId,
      input,
      new Uint8Array(await file.arrayBuffer()),
      fiscalStorage(),
    );
    return Response.json(result, { headers });
  } catch (error) {
    return failure(error);
  }
}
async function smallJson(req: Request) {
  const text = await req.text();
  if (text.length > 8192) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE" });
  try {
    return JSON.parse(text);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
}
export async function PATCH(req: Request) {
  try {
    const userId = await identity();
    const input = write
      .extend({
        evidenceId: uuid,
        target: z.enum(["income", "transaction", "deduction", "credit"]),
        targetId: uuid,
      })
      .strict()
      .parse(await smallJson(req));
    return Response.json(await linkEvidence(prisma, userId, input), {
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(req: Request) {
  try {
    const userId = await identity();
    const input = write
      .extend({ id: uuid })
      .strict()
      .parse(await smallJson(req));
    return Response.json(
      await removeEvidence(prisma, userId, input, fiscalStorage()),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
