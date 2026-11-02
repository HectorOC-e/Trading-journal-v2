// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { ResourceGrid } from "@/components/aprendizaje/resource-grid"
import { ResourceCard } from "@/components/aprendizaje/resource-card"
import type { LearningResource } from "@/types"

afterEach(cleanup)
const base = {
  type: "LIBRO", status: "IN_PROGRESS", author: "", source: "", notes: "", tags: [],
  date: "2026-11-01", createdAt: "2026-11-01T12:00:00Z", updatedAt: "2026-11-01T12:00:00Z",
  linkedSetups: [], markedForReview: false, nextReviewAt: null,
} as unknown as LearningResource

it("uses the same due queue for the library filter and card action", () => {
  const resources = [
    { ...base, id: "due", title: "Due resource", nextReviewAt: "2026-11-01" },
    { ...base, id: "marked", title: "Marked mastered", status: "MASTERED", markedForReview: true },
    { ...base, id: "mastered", title: "Mastered clear", status: "MASTERED", nextReviewAt: "2026-10-01" },
  ] as LearningResource[]
  render(<ResourceGrid resources={resources} todayISO="2026-11-01" />)
  fireEvent.click(screen.getByRole("button", { name: "Solo review" }))
  expect(screen.getByText("Due resource")).toBeInTheDocument()
  expect(screen.getByText("Marked mastered")).toBeInTheDocument()
  expect(screen.queryByText("Mastered clear")).not.toBeInTheDocument()
})

it("offers a review for an explicitly marked mastered resource", () => {
  render(<ResourceCard resource={{ ...base, id: "marked", title: "Marked mastered", status: "MASTERED", markedForReview: true }} todayISO="2026-11-01" />)
  expect(screen.getByRole("button", { name: /Repasar hoy/ })).toBeInTheDocument()
})

it("explains why a card needs review", () => {
 render(<ResourceCard resource={{...base,id:"due",title:"Due",nextReviewAt:"2026-10-31"}} todayISO="2026-11-02" />)
 expect(screen.getByText("Vencido hace 2 días")).toBeInTheDocument()
})
it("offers first resource creation only for a truly empty library", () => {
 const create = vi.fn()
 render(<ResourceGrid resources={[]} onCreateResource={create} />)
 fireEvent.click(screen.getByRole("button", {name:"Crear primer recurso"}))
 expect(create).toHaveBeenCalledOnce()
})
it("clears filters and restores resources", () => {
 render(<ResourceGrid resources={[{...base,id:"a",title:"Libro disponible"}]} />)
 fireEvent.change(screen.getByPlaceholderText(/Buscar por título/), {target:{value:"missing"}})
 fireEvent.click(screen.getByRole("button", {name:"Solo review"}))
 fireEvent.click(screen.getByRole("button", {name:"Limpiar filtros"}))
 expect(screen.getByText("Libro disponible")).toBeInTheDocument()
 expect(screen.getByPlaceholderText(/Buscar por título/)).toHaveValue("")
})
it("distinguishes an archived-only library from a first visit", () => {
 render(<ResourceGrid resources={[{...base,id:"a",title:"Libro archivado",status:"ABANDONED"}]} onCreateResource={vi.fn()} />)
 expect(screen.queryByRole("button", {name:"Crear primer recurso"})).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole("button",{name:"Archivados"}))
 expect(screen.getByText("Libro archivado")).toBeInTheDocument()
})

it("orders a review queue by real due date before a future manual mark", () => {
 render(<ResourceGrid reviewQueue todayISO="2026-11-02" resources={[
 {...base,id:"manual",title:"Manual future",markedForReview:true,nextReviewAt:"2026-12-01"},
 {...base,id:"today",title:"Due today",nextReviewAt:"2026-11-02"},
 {...base,id:"past",title:"Old overdue",nextReviewAt:"2026-10-31"},
 ]} />)
 expect(screen.getByText("Old overdue").compareDocumentPosition(screen.getByText("Due today")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 expect(screen.getByText("Due today").compareDocumentPosition(screen.getByText("Manual future")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it("resets advanced status, tags, favorites, archives and sort together", () => {
 render(<ResourceGrid resources={[{...base,id:"available",title:"Visible again",tags:["risk"]}]} />)
 fireEvent.click(screen.getByRole("button",{name:/Más filtros/}))
 fireEvent.click(screen.getByRole("button",{name:"Completado"}))
 fireEvent.click(screen.getByRole("button",{name:"Favoritos"}))
 fireEvent.click(screen.getByRole("button",{name:"#risk"}))
 fireEvent.change(screen.getByRole("combobox"),{target:{value:"progress"}})
 fireEvent.click(screen.getByRole("button",{name:"Archivados"}))
 fireEvent.click(screen.getByRole("button",{name:"Limpiar filtros"}))
 expect(screen.getByText("Visible again")).toBeInTheDocument()
 expect(screen.getByRole("combobox")).toHaveValue("recent")
 expect(screen.queryByRole("button",{name:"Favoritos"})).not.toBeInTheDocument()
})
