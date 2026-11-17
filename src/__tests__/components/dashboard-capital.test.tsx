// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { summarizeCapital } from "@/app/dashboard/capital-summary"
import { CapitalOverview } from "@/app/dashboard/components/capital-overview"

const accounts = [
  {accountId:"personal",balance:1100,status:"ACTIVE",availableForTrading:true,capitalKind:"PERSONAL" as const},
  {accountId:"archived",balance:9000,status:"INACTIVE",availableForTrading:false,capitalKind:"PERSONAL" as const},
  {accountId:"locked",balance:500,status:"ACTIVE",availableForTrading:false,capitalKind:"PERSONAL" as const},
  {accountId:"eval",balance:100000,status:"ACTIVE",availableForTrading:true,capitalKind:"EVALUATION" as const},
  {accountId:"funded",balance:50000,status:"ACTIVE",availableForTrading:true,capitalKind:"FUNDED" as const},
  {accountId:"sim",balance:2000,status:"ACTIVE",availableForTrading:true,capitalKind:"SIMULATED" as const},
]
afterEach(cleanup)
it("uses already converted balances and keeps unavailable and nominal capital out of personal availability",()=>{
  expect(summarizeCapital(accounts)).toEqual({PERSONAL:1100,EVALUATION:100000,FUNDED:50000,SIMULATED:2000,unavailableCount:2})
})
it("shows separate capital contexts with base currency and retained unavailable history",()=>{
  render(<CapitalOverview accounts={accounts} baseCurrency="EUR" />)
  for(const label of ["Personal disponible","Evaluación · nominal","Fondeo · nominal","Simulado"]) expect(screen.getByText(label)).toBeInTheDocument()
  expect(screen.getByText("€1,100.00 EUR")).toBeInTheDocument()
  expect(screen.getByText(/2 cuentas no disponibles.*historial/)).toBeInTheDocument()
  expect(screen.queryByText(/162,600/)).not.toBeInTheDocument()
})
