import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAccountDeletionBatch } from "@/server/services/profile/account-deletion";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return new NextResponse("CRON_SECRET not configured", { status: 412 });
  const supplied = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await processAccountDeletionBatch(prisma));
}
