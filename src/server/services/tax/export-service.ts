import { TRPCError } from '@trpc/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import type { PrismaClient, TaxReturn } from '@/lib/generated/prisma/client';
import { serializeTax } from './serializers';
const MAX_EXPORT_BYTES = 2 * 1024 * 1024;
export function csvCell(value: unknown): string {
    const text = typeof value === 'string' ? value : JSON.stringify(value) ?? '';
    const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
}
function htmlEscape(value: string) { return value.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]!)); }
export function renderReturnHtml(record: TaxReturn): string {
    return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Borrador fiscal</title><style>body{font:11px sans-serif;margin:28px}pre{white-space:pre-wrap;overflow-wrap:anywhere}h1{font-size:20px}</style><h1>Borrador / no presentado</h1><p>Versión ${record.version}. Declaraciones aportadas por el usuario; sin validación oficial SAR.</p><pre>${htmlEscape(JSON.stringify(serializeTax(record), null, 2))}</pre></html>`;
}
async function renderPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
        args: chromium.args, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath(), headless: true
    });
    try {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', request => { void request.abort(); });
        await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
        return Buffer.from(await page.pdf({
            format: 'A4', printBackground: true, timeout: 20000
        }));
    }
    finally {
        await browser.close();
    }
}
function flatten(value: unknown, path = ''): string[][] {
    if (Array.isArray(value))
        return value.flatMap((v, i) => flatten(v, `${path}[${i}]`));
    if (value && typeof value === 'object')
        return Object.entries(value).flatMap(([k, v]) => flatten(v, path ? `${path}.${k}` : k));
    return [[path, value === null ? '' : String(value)]];
}
export async function exportReturn(db: PrismaClient, userId: string, returnId: string, format: 'json' | 'csv' | 'pdf', pdfRenderer: (html: string) => Promise<Buffer> = renderPdf): Promise<{
    body: string | Uint8Array;
    contentType: string;
    filename: string;
}> {
    const record = await db.taxReturn.findFirst({ where: { id: returnId, userId } });
    if (!record)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Borrador no disponible.' });
    const envelope = serializeTax({ ...record, notice: 'Borrador / no presentado. Presentación declarada por el usuario, sin validación oficial SAR.' });
    const json = JSON.stringify(envelope, null, 2);
    if (Buffer.byteLength(json) > MAX_EXPORT_BYTES)
        throw new TRPCError({ code: 'PAYLOAD_TOO_LARGE', message: 'El borrador supera el límite de exportación de 2 MiB.' });
    const filename = `borrador-fiscal-v${record.version}.${format}`;
    if (format === 'json')
        return {
            body: json, contentType: 'application/json; charset=utf-8', filename
        };
    if (format === 'csv') {
        const body = '\uFEFF' + [['Campo', 'Valor'], ...flatten(envelope)].map(row => row.map(csvCell).join(',')).join('\r\n');
        if (Buffer.byteLength(body) > MAX_EXPORT_BYTES)
            throw new TRPCError({ code: 'PAYLOAD_TOO_LARGE', message: 'El CSV supera el límite de 2 MiB.' });
        return { body, contentType: 'text/csv; charset=utf-8', filename };
    }
    try {
        const body = await pdfRenderer(renderReturnHtml(record));
        if (body.byteLength > MAX_EXPORT_BYTES)
            throw new TRPCError({ code: 'PAYLOAD_TOO_LARGE' });
        return {
            body: new Uint8Array(body), contentType: 'application/pdf', filename
        };
    }
    catch (error) {
        if (error instanceof TRPCError)
            throw error;
        throw new TRPCError({ code: 'SERVICE_UNAVAILABLE', message: 'El motor PDF no está disponible. Reintenta o descarga JSON/CSV.' });
    }
}
