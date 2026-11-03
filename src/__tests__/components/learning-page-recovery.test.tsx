// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
const state = vi.hoisted(() => ({ data: undefined as unknown, error: new Error("offline"), retry: vi.fn() }))
vi.mock("@/lib/trpc/client", () => {
 const query = () => ({data: state.data, error: state.error,isLoading:false,refetch:state.retry})
 const endpoint = {useQuery:query,useMutation:()=>({mutate:vi.fn()})}
 const proxy: unknown = new Proxy({}, {get:()=>new Proxy(endpoint,{get:(obj,key)=>key in obj ? obj[key as keyof typeof obj] : ()=>Promise.resolve()})})
 return {trpc: new Proxy({}, {get:(_,key)=>key === "useUtils" ? ()=>proxy : key === "studySessions" ? {home:{useQuery:()=>({data:undefined})}} : proxy})}
})
vi.mock("@/app/aprendizaje/hooks/use-learning-calendar",()=>({useLearningCalendar:()=>({today:"2026-11-02",timezone:"UTC"})}))
vi.mock("@/app/aprendizaje/hooks/use-resource-actions",()=>({useResourceActions:()=>({handleOpen:vi.fn(),handleEditOpen:vi.fn(),setModalOpen:vi.fn(),setEditTarget:vi.fn(),setRevisarResource:vi.fn(),setLinkSetupTarget:vi.fn(),setImpactTarget:vi.fn(),setDrawerResource:vi.fn()})}))
vi.mock("@/components/layout/top-bar",()=>({TopBar:()=>null}))
vi.mock("@/components/aprendizaje/resource-grid",()=>({ResourceGrid:()=> <div>Library content</div>}))
vi.mock("@/components/aprendizaje/resource-drawer",()=>({ResourceDrawer:()=>null}))
vi.mock("@/app/aprendizaje/modals/revisar-recurso-modal",()=>({RevisarRecursoModal:()=>null}))
vi.mock("@/app/aprendizaje/modals/impact-modal",()=>({SetupImpactModal:()=>null}))
vi.mock("@/app/aprendizaje/modals/link-setup-modal",()=>({LinkSetupModal:()=>null}))
vi.mock("@/app/aprendizaje/modals/add-edit-resource-modal",()=>({AddEditResourceModal:()=>null}))
vi.mock("@/app/aprendizaje/components/progreso-sections",()=>({ProgresoSections:()=>null}))
vi.mock("@/app/aprendizaje/components/hoy-tab",()=>({HoyTab:()=> <div>Today content</div>}))
vi.mock("@/app/aprendizaje/components/profile-clock",()=>({ProfileClock:()=>null}))
vi.mock("@/app/aprendizaje/components/practices-tab", () => ({
  PracticeWeekSummary: ({onOpen}: {onOpen: () => void}) => <button onClick={onOpen}>Registrar práctica</button>,
  PracticesTab: ({registerOnOpen}: {registerOnOpen: boolean}) => <div>{registerOnOpen ? "Practice form open" : "Practice list"}</div>,
}));
import Page from "@/app/aprendizaje/page"
afterEach(()=>{cleanup();state.data=undefined;state.retry.mockClear()})
it("shows retry instead of a fake empty library after initial query failure",()=>{
 render(<Page />)
 fireEvent.click(screen.getByRole("tab",{name:"Biblioteca"}))
 expect(screen.queryByText("Library content")).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole("button",{name:"Reintentar recursos"}))
 expect(state.retry).toHaveBeenCalledOnce()
})
it("keeps cached library data visible during an error",()=>{
 state.data=[]
 render(<Page />)
 fireEvent.click(screen.getByRole("tab",{name:"Biblioteca"}))
 expect(screen.getByText("Library content")).toBeInTheDocument()
 expect(screen.getByRole("button",{name:"Reintentar recursos"})).toBeInTheDocument()
})

it("retries failed statistics and hides the duplicate strip on Hoy",()=>{
 window.history.replaceState(null,"","/aprendizaje")
 render(<Page />)
 expect(screen.queryByText("Completados mes")).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole("tab",{name:"Biblioteca"}))
 expect(screen.getByText("Completados mes")).toBeInTheDocument()
 fireEvent.click(screen.getByRole("button",{name:"Reintentar estadísticas"}))
 expect(state.retry).toHaveBeenCalledOnce()
})

it("does not reopen a registration form when returning through the Practices tab", () => {
  window.history.replaceState(null, "", "/aprendizaje");
  render(<Page />);
  fireEvent.click(screen.getByRole("button", {name: "Registrar práctica"}));
  expect(screen.getByText("Practice form open")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", {name: "Hoy", exact: true}));
  fireEvent.click(screen.getByRole("tab", {name: "Prácticas", exact: true}));
  expect(screen.getByText("Practice list")).toBeInTheDocument();
});
