// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import TradesPage from "@/app/trades/page"
const m=vi.hoisted(()=>({create:vi.fn(),update:vi.fn(),event:vi.fn(),accountsQuery:vi.fn(),form:{} as any,trade:{id:"t",accountId:"a",date:"2024-01-02",operationalMode:"BACKTEST",account:{id:"a",type:"BACKTEST"},events:[]} as any}))
vi.mock("@/lib/operational-mode-store",()=>({useOperationalMode:(select:any)=>select({mode:"BACKTEST",setMode:vi.fn()})}))
vi.mock("@/lib/trpc/client",()=>({trpc:{
 accounts:{list:{useQuery:(input:any)=>{m.accountsQuery(input);return{data:[{id:"a",type:"BACKTEST"}],isLoading:false}}}},
 setups:{list:{useQuery:()=>({data:[],isLoading:false})}},markets:{list:{useQuery:()=>({data:[{symbol:"X"}],isLoading:false})},seedDefaults:{useMutation:()=>({isIdle:false})}},tags:{list:{useQuery:()=>({data:[]})}},
 trades:{list:{useInfiniteQuery:()=>({data:{pages:[{items:[m.trade]}]},isLoading:false})},byId:{useQuery:()=>({})},dashboardStats:{useQuery:()=>({data:{kpis:{total:1,netPnl:100,wins:1,winRate:100,avgR:1}}})},
 create:{useMutation:()=>({mutate:m.create})},update:{useMutation:()=>({mutate:m.update})},addEvent:{useMutation:()=>({mutate:m.event})},close:{useMutation:()=>({mutate:vi.fn()})},delete:{useMutation:()=>({mutate:vi.fn()})},saveChecklistResult:{useMutation:()=>({mutate:vi.fn()})}},
 useUtils:()=>({trades:{list:{invalidate:vi.fn()},dashboardStats:{invalidate:vi.fn()}},accounts:{list:{invalidate:vi.fn()}},markets:{list:{invalidate:vi.fn()}}}),
}}))
vi.mock("@/components/layout/top-bar",()=>({TopBar:({actions}:any)=><>{actions.map((action:any)=><button key={action.label} onClick={action.onClick}>{action.label}</button>)}</>}))
vi.mock("@/components/ui/operational-mode-selector",()=>({OperationalModeSelector:()=>null}))
vi.mock("@/components/ui/kpi-strip",()=>({KpiStrip:()=>null}))
vi.mock("@/components/trades/trades-table",()=>({TradesTable:({onSelect}:any)=><button onClick={()=>onSelect(m.trade)}>Ver operación</button>}))
vi.mock("@/components/trades/trade-detail-panel",()=>({TradeDetailPanel:({onEdit,onPositionLog}:any)=><><button onClick={onEdit}>Editar operación</button><button onClick={onPositionLog}>Registrar parcial</button></>}))
vi.mock("@/components/ui/drawer-panel",()=>({DrawerPanel:({open,children}:any)=>open?children:null}))
vi.mock("@/components/trades/register-trade-modal",()=>({RegisterTradeModal:({open,onSubmit}:any)=>open?<button onClick={()=>onSubmit(m.form)}>Guardar histórico</button>:null}))
vi.mock("@/components/trades/edit-trade-modal",()=>({EditTradeModal:({onSave}:any)=><button onClick={()=>onSave({date:"2024-01-03",openTime:"01:00",marketTimeZone:"America/Tegucigalpa",marketClosedAt:"2024-01-04T07:00:00Z",eventTimestamps:[{id:"p",timestamp:"2024-01-03T08:00:00Z"}]})}>Guardar corrección</button>}))
vi.mock("@/components/trades/position-log-modal",()=>({PositionLogModal:({onAddEvent}:any)=><button onClick={()=>onAddEvent({type:"PARTIAL_CLOSE",price:110,contracts:3,notes:"Historia",timestamp:"2024-01-03T08:00:00Z"})}>Guardar parcial</button>}))
vi.mock("@/components/trades/log-session-popover",()=>({LogSessionPopover:()=>null}))
vi.mock("@/app/trades/components/import-csv-modal",()=>({ImportCsvModal:()=>null}))
beforeEach(()=>{m.form={accountId:"a",setupId:"",direction:"LONG",symbol:"x",entry:"100",stop:"90",target:"120",size:"10",date:"2024-01-02",openTime:"01:00",session:"New York",tags:[],notes:"Historia",planNotes:"",screenshots:[],checklistItems:{},emotionBefore:"calm",confidenceRating:null,executionQuality:null,fomoFlag:false,revengeFlag:false,regime:null,captureContext:"HISTORICAL",marketTimeZone:"America/Tegucigalpa",closeDate:"2024-01-04",closeTime:"01:00",pnl:"100",emotionContext:"PRACTICE",emotionReferenceAt:"2026-11-16T12:00:00Z"}})
afterEach(()=>{cleanup();vi.clearAllMocks()})
it("sends historical closure and emotion clocks through the real page's create callback",()=>{
 render(<TradesPage />);fireEvent.click(screen.getByRole("button",{name:"Registrar trade"}));fireEvent.click(screen.getByRole("button",{name:"Guardar histórico"}))
 expect(m.create).toHaveBeenCalledWith(expect.objectContaining({entry:100,size:10,symbol:"X",status:"CLOSED",captureContext:"HISTORICAL",marketTimeZone:"America/Tegucigalpa",closeDate:"2024-01-04",closeTime:"01:00",pnl:100,emotionContext:"PRACTICE",emotionReferenceAt:"2026-11-16T12:00:00Z"}))
 expect(m.accountsQuery).toHaveBeenCalledWith({includeInactive:true})
})
it("retains the practice link and forwards correction and partial timestamps",()=>{
 render(<TradesPage />);fireEvent.click(screen.getByRole("button",{name:"Ver operación"}))
 expect(screen.getByRole("link",{name:"Usar en una práctica"})).toHaveAttribute("href","/aprendizaje?tab=practicas&register=1&mode=BACKTEST&tradeIds=t")
 fireEvent.click(screen.getByRole("button",{name:"Editar operación"}));fireEvent.click(screen.getByRole("button",{name:"Guardar corrección"}))
 expect(m.update).toHaveBeenCalledWith(expect.objectContaining({id:"t",date:"2024-01-03",eventTimestamps:[{id:"p",timestamp:"2024-01-03T08:00:00Z"}]}))
 fireEvent.click(screen.getByRole("button",{name:"Registrar parcial"}));fireEvent.click(screen.getByRole("button",{name:"Guardar parcial"}))
 expect(m.event).toHaveBeenCalledWith(expect.objectContaining({tradeId:"t",timestamp:"2024-01-03T08:00:00Z"}))
})
