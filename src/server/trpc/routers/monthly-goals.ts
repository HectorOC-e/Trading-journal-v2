import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { operationalModeSchema } from "@/domains/trading/operational-mode"
import { router, protectedProcedure } from "../init"

const STATUS=z.enum(["pending","partial","done"])
const period=z.object({year:z.number().int(),month:z.number().int().min(1).max(12),mode:operationalModeSchema.default("REAL")})
const owned=z.object({id:z.string().uuid(),mode:operationalModeSchema.default("REAL")})

export const monthlyGoalsRouter=router({
  list:protectedProcedure.input(period).query(({ctx,input})=>ctx.prisma.monthlyGoal.findMany({
    where:{userId:ctx.userId,year:input.year,month:input.month,operationalMode:input.mode},orderBy:{sortOrder:"asc"},
  })),
  unclassified:protectedProcedure.input(period.omit({mode:true})).query(({ctx,input})=>ctx.prisma.monthlyGoal.findMany({
    where:{userId:ctx.userId,year:input.year,month:input.month,operationalMode:null},orderBy:{sortOrder:"asc"},
  })),
  assignMode:protectedProcedure.input(owned).mutation(async({ctx,input})=>{
    const changed=await ctx.prisma.monthlyGoal.updateMany({where:{id:input.id,userId:ctx.userId,operationalMode:null},data:{operationalMode:input.mode}})
    if(changed.count!==1)throw new TRPCError({code:"CONFLICT",message:"El objetivo ya tiene una modalidad o no está disponible."})
    return ctx.prisma.monthlyGoal.findUniqueOrThrow({where:{id:input.id,userId:ctx.userId,operationalMode:input.mode}})
  }),
  add:protectedProcedure.input(period.extend({text:z.string().min(1).max(200)})).mutation(async({ctx,input})=>{
    const where={userId:ctx.userId,year:input.year,month:input.month,operationalMode:input.mode}
    const count=await ctx.prisma.monthlyGoal.count({where})
    return ctx.prisma.monthlyGoal.create({data:{...where,text:input.text,sortOrder:count}})
  }),
  updateText:protectedProcedure.input(owned.extend({text:z.string().min(1).max(200)})).mutation(({ctx,input})=>ctx.prisma.monthlyGoal.update({
    where:{id:input.id,userId:ctx.userId,operationalMode:input.mode},data:{text:input.text},
  })),
  setStatus:protectedProcedure.input(owned.extend({status:STATUS,note:z.string().max(300).optional()})).mutation(({ctx,input})=>ctx.prisma.monthlyGoal.update({
    where:{id:input.id,userId:ctx.userId,operationalMode:input.mode},data:{status:input.status,userConfirmed:true,...(input.note!==undefined?{note:input.note}:{})},
  })),
  remove:protectedProcedure.input(z.union([z.string().uuid(),owned])).mutation(async({ctx,input})=>{
    const selected=typeof input==="string"?{id:input,mode:"REAL" as const}:input
    await ctx.prisma.monthlyGoal.delete({where:{id:selected.id,userId:ctx.userId,operationalMode:selected.mode}})
    return {ok:true}
  }),
  carryForward:protectedProcedure.input(period).mutation(async({ctx,input})=>{
    const where={userId:ctx.userId,year:input.year,month:input.month,operationalMode:input.mode}
    const existing=await ctx.prisma.monthlyGoal.count({where})
    if(existing===0){
      const prevMonth=input.month===1?12:input.month-1
      const prevYear=input.month===1?input.year-1:input.year
      const previous=await ctx.prisma.monthlyGoal.findMany({where:{userId:ctx.userId,year:prevYear,month:prevMonth,operationalMode:input.mode},orderBy:{sortOrder:"asc"}})
      if(previous.length)await ctx.prisma.monthlyGoal.createMany({data:previous.map((goal,i)=>({...where,text:goal.text,sortOrder:i}))})
    }
    return ctx.prisma.monthlyGoal.findMany({where,orderBy:{sortOrder:"asc"}})
  }),
})
