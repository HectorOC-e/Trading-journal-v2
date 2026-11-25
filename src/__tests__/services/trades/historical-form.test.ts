import { expect, it } from "vitest"
import { tradeFormSchema } from "@/domains/trading/schemas/trade-form-schema"

const form = {
  direction:"LONG",symbol:"X",accountId:"a",setupId:"",entry:"100",stop:"90",target:"120",size:"1",riskPct:"1",
  date:"2024-01-02",openTime:"01:00",session:"New York",tags:[],notes:"",planNotes:"",checklistItems:{},screenshots:[],
  emotionBefore:null,confidenceRating:null,executionQuality:null,fomoFlag:false,revengeFlag:false,regime:null,
}
it("requires a market close and total P&L when the form captures historical history",()=>{
  expect(tradeFormSchema.safeParse({...form,captureContext:"HISTORICAL"}).success).toBe(false)
  expect(tradeFormSchema.safeParse({...form,captureContext:"HISTORICAL",marketTimeZone:"America/Tegucigalpa",closeDate:"2024-01-03",closeTime:"01:00",pnl:"100"}).success).toBe(true)
})
it("rejects a historical form whose close precedes its opening",()=>{
  expect(tradeFormSchema.safeParse({...form,captureContext:"HISTORICAL",marketTimeZone:"America/Tegucigalpa",closeDate:"2024-01-01",closeTime:"01:00",pnl:"100"}).success).toBe(false)
})
it("validates historical exit price and commission independently from net P&L", () => {
  const historical = { ...form, captureContext: "HISTORICAL", marketTimeZone: "America/Tegucigalpa", closeDate: "2024-01-03", closeTime: "01:00", pnl: "100" }
  expect(tradeFormSchema.safeParse({ ...historical, closePrice: "110.05", commission: "0.5" }).success).toBe(true)
  expect(tradeFormSchema.safeParse({ ...historical, closePrice: "0", commission: "-1" }).success).toBe(false)
})
