import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { exportReturn } from '@/server/services/tax/export-service';
export const runtime = 'nodejs';
export const maxDuration = 60;
const querySchema = z.object({ returnId: z.string().uuid(), format: z.enum(['json', 'csv', 'pdf']) }).strict();
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || await prisma.accountDeletionJob.findUnique({ where: { userId: user.id }, select: { userId: true } }))
            throw new TRPCError({ code: 'UNAUTHORIZED' });
        const input = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
        const result = await exportReturn(prisma, user.id, input.returnId, input.format);
        return new Response(result.body as BodyInit, { headers: {
                ...headers, 'Content-Type': result.contentType, 'Content-Disposition': `attachment; filename="${result.filename}"`
            } });
    }
    catch (error) {
        const status = error instanceof z.ZodError ? 400 : error instanceof TRPCError ? ({
            UNAUTHORIZED: 401, NOT_FOUND: 404, PAYLOAD_TOO_LARGE: 413, SERVICE_UNAVAILABLE: 503
        }[error.code as 'UNAUTHORIZED' | 'NOT_FOUND' | 'PAYLOAD_TOO_LARGE' | 'SERVICE_UNAVAILABLE'] ?? 500) : 500;
        return Response.json({ error: error instanceof TRPCError ? error.message : status === 400 ? 'Revisa los parámetros de exportación.' : 'No se pudo exportar el borrador.' }, { status, headers: { ...headers, ...(status === 503 ? { 'Retry-After': '30' } : {}) } });
    }
}
