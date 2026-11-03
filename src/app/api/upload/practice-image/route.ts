import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { imageMime } from "@/server/services/learning/practice-feedback-service";
import { z } from "zod";
const identity = z.object({
  practiceId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
});
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const id = z
    .string()
    .uuid()
    .safeParse(req.nextUrl.searchParams.get("practiceId"));
  if (!id.success)
    return NextResponse.json(
      { error: "Identificador inválido." },
      { status: 400 },
    );
  const p = await prisma.learningPractice.findFirst({
    where: { id: id.data, userId: user.id },
    include: { attachments: { orderBy: { createdAt: "asc" } } },
  });
  if (!p)
    return NextResponse.json(
      { error: "Práctica no disponible." },
      { status: 404 },
    );
  const files = await Promise.all(
    p.attachments.map(async (a) => {
      const { data, error } = await sb.storage
        .from("practice-images")
        .createSignedUrl(a.path, 300);
      if (error) throw error;
      return { id: a.id, url: data.signedUrl };
    }),
  );
  return NextResponse.json(
    { files },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (Number(req.headers.get("content-length")) > 6 * 1024 * 1024)
    return NextResponse.json(
      { error: "Máximo 5 MB por imagen." },
      { status: 413 },
    );
  const f = await req.formData().catch(() => null);
  if (!f)
    return NextResponse.json(
      { error: "Formulario inválido." },
      { status: 400 },
    );
  const parsed = identity.extend({ uploadId: z.string().uuid() }).safeParse({
    uploadId: f.get("uploadId"),
    practiceId: f.get("practiceId"),
    expectedVersion: f.get("expectedVersion"),
  });
  const file = f.get("file");
  if (
    !parsed.success ||
    !(file instanceof File) ||
    !file.size ||
    file.size > 5 * 1024 * 1024
  )
    return NextResponse.json(
      { error: "Imagen inválida. Máximo 5 MB." },
      { status: 400 },
    );
  const bytes = new Uint8Array(await file.arrayBuffer()),
    mime = imageMime(bytes);
  if (!mime || mime !== file.type)
    return NextResponse.json(
      { error: "Usa una imagen PNG, JPEG o WebP válida." },
      { status: 400 },
    );
  const path = `${user.id}/${parsed.data.practiceId}/${parsed.data.uploadId}.${mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp"}`;
  let uploaded = false;
  const storage = createAdminClient().storage.from("practice-images");
  try {
    const p = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM learning_practices WHERE id=${parsed.data.practiceId}::uuid AND user_id=${user.id}::uuid FOR UPDATE`;
        const p = await tx.learningPractice.findFirst({
          where: { id: parsed.data.practiceId, userId: user.id },
          include: { attachments: true },
        });
        if (!p) throw new Error("NOT_FOUND");
        if (p.attachments.some((a) => a.id === parsed.data.uploadId)) return p;
        if (p.version !== parsed.data.expectedVersion)
          throw new Error("CONFLICT");
        if (p.attachments.length >= 5) throw new Error("LIMIT");
        const { error } = await storage.upload(path, bytes, {
          contentType: mime,
          upsert: true,
        });
        if (error) throw new Error("STORAGE");
        uploaded = true;
        await tx.practiceAttachment.create({
          data: { id: parsed.data.uploadId, practiceId: p.id, path, mime },
        });
        return tx.learningPractice.update({
          where: { id: p.id },
          data: { version: { increment: 1 } },
        });
      },
      { timeout: 20000 },
    );
    return NextResponse.json({ version: p.version });
  } catch (e) {
    if (uploaded) await storage.remove([path]);
    const reason = e instanceof Error ? e.message : "";
    return NextResponse.json(
      {
        error:
          reason === "CONFLICT"
            ? "La práctica cambió. Actualiza antes de subir."
            : reason === "LIMIT"
              ? "Máximo cinco capturas por práctica."
              : "No se pudo subir la captura. Reintenta.",
      },
      {
        status:
          reason === "NOT_FOUND"
            ? 404
            : reason === "CONFLICT"
              ? 409
              : reason === "LIMIT"
                ? 400
                : 500,
      },
    );
  }
}
export async function DELETE(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const parsed = identity
    .extend({ attachmentId: z.string().uuid() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  try {
    return NextResponse.json(
      await prisma.$transaction(async (tx) => {
        const { practiceId, attachmentId, expectedVersion } = parsed.data;
        await tx.$queryRaw`SELECT id FROM learning_practices WHERE id=${practiceId}::uuid AND user_id=${user.id}::uuid FOR UPDATE`;
        const p = await tx.learningPractice.findFirst({
          where: { id: practiceId, userId: user.id },
          include: { attachments: true },
        });
        if (!p) throw new Error("NOT_FOUND");
        if (p.version !== expectedVersion) throw new Error("CONFLICT");
        const a = p.attachments.find((a) => a.id === attachmentId);
        if (!a) throw new Error("NOT_FOUND");
        const { error } = await createAdminClient()
          .storage.from("practice-images")
          .remove([a.path]);
        if (error) throw new Error("STORAGE");
        await tx.practiceAttachment.delete({ where: { id: a.id } });
        return tx.learningPractice.update({
          where: { id: p.id },
          data: { version: { increment: 1 } },
          select: { version: true },
        });
      }),
    );
  } catch (e) {
    const reason = e instanceof Error ? e.message : "";
    return NextResponse.json(
      {
        error:
          reason === "CONFLICT"
            ? "La práctica cambió. Actualiza y reintenta."
            : "No se pudo eliminar la captura.",
      },
      {
        status:
          reason === "NOT_FOUND" ? 404 : reason === "CONFLICT" ? 409 : 500,
      },
    );
  }
}
