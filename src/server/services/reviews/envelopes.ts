import type { PrismaClient } from "@/lib/generated/prisma/client"

/** One shared manual envelope per week. Serialize current writers without changing legacy rows. */
export async function ensureWeeklyReviewEnvelope(prisma:PrismaClient,userId:string,weekStart:string) {
  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM public.users WHERE id=${userId}::uuid FOR UPDATE`
    const start=new Date(weekStart+"T00:00:00Z")
    const existing=await tx.weeklyReview.findFirst({where:{userId,weekStart:start},orderBy:[{createdAt:"asc"},{id:"asc"}]})
    if(existing)return existing
    const end=new Date(start);end.setUTCDate(start.getUTCDate()+6)
    const label=`Semana del ${start.toLocaleDateString("es",{day:"numeric",month:"short",timeZone:"UTC"})}`
    return tx.weeklyReview.create({data:{userId,weekStart:start,weekEnd:end,weekLabel:label,weekRange:label,status:"draft"}})
  })
}
