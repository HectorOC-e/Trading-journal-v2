"use client"

import { useMemo, useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { cn } from "@/lib/utils"
import { isReviewDue } from "./utils/mastery"
import { ResourceGrid } from "@/components/aprendizaje/resource-grid"
import { ResourceDrawer } from "@/components/aprendizaje/resource-drawer"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import type { LearningResource } from "@/types"
import type { RouterOutputs } from "@/server/trpc/root"
import { RevisarRecursoModal } from "./modals/revisar-recurso-modal"
import { SessionReviewModal } from "./modals/session-review-modal"
import { SetupImpactModal } from "./modals/impact-modal"
import { LinkSetupModal } from "./modals/link-setup-modal"
import { AddEditResourceModal } from "./modals/add-edit-resource-modal"
import { ResourceRightRail } from "./components/resource-right-rail"
import { HoyTab } from "./components/hoy-tab"
import { useResourceActions } from "./hooks/use-resource-actions"

type ResourceFromDB = RouterOutputs["learningResources"]["list"][number]

export default function AprendizajePage() {
  const {
    modalOpen, setModalOpen,
    editTarget, setEditTarget,
    revisarResource, setRevisarResource,
    linkSetupTarget, setLinkSetupTarget,
    impactTarget, setImpactTarget,
    drawerResource, setDrawerResource,
    sessionOpen, setSessionOpen,
    handleOpen, handleEditOpen,
  } = useResourceActions()

  type Tab = "hoy" | "biblioteca" | "repaso" | "progreso"
  const [tab, setTab] = useState<Tab>("hoy")
  // Deep-link via ?tab= (client-only — avoids useSearchParams Suspense requirement)
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab")
    if (t === "repaso" || t === "progreso" || t === "biblioteca") setTab(t)
  }, [])
  function selectTab(t: Tab) {
    setTab(t)
    const url = new URL(window.location.href)
    if (t === "hoy") url.searchParams.delete("tab")
    else url.searchParams.set("tab", t)
    window.history.replaceState(null, "", url.toString())
  }

  const { data: rawResources = [], isLoading } = trpc.learningResources.list.useQuery()
  const { data: reviews = [] }                 = trpc.weeklyReviews.list.useQuery()
  const { data: stats }                        = trpc.learningResources.stats.useQuery()
  const utils = trpc.useUtils()

  const processDecay = trpc.learningResources.processDecayTransitions.useMutation({
    onSuccess: ({ transitioned }) => {
      if (transitioned > 0) {
        utils.learningResources.list.invalidate()
        utils.learningResources.stats.invalidate()
      }
    },
    onError: (err) => console.error("Decay transition failed:", err.message),
  })

  // Fire decay transition check on page load (CQRS fix: moved from stats query)
  useEffect(() => {
    processDecay.mutate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resources = rawResources as unknown as LearningResource[]

  const deleteResource = trpc.learningResources.delete.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })

  const updateStatus = trpc.learningResources.updateStatus.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })

  const toggleFavorite = trpc.learningResources.toggleFavorite.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })

  const unlinkSetup = trpc.learningResources.unlinkSetup.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })

  const updateProgress = trpc.learningResources.updateProgress.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })

  const reviewPending = useMemo(() => resources.filter((r) => r.markedForReview), [resources])
  const completed     = useMemo(() => resources.filter((r) => (r.progressPct ?? 0) >= 100), [resources])
  // Repaso queue: due (SRS) or manually marked, excluding archived. Due first.
  const dueResources  = useMemo(
    () => resources
      .filter((r) => r.status !== "ABANDONED" && (isReviewDue(r.nextReviewAt) || r.markedForReview))
      .sort((a, b) => (a.nextReviewAt ?? "9999").localeCompare(b.nextReviewAt ?? "9999")),
    [resources],
  )

  const gridProps = {
    onReview:       (r: LearningResource) => setRevisarResource(r as unknown as ResourceFromDB),
    onEdit:         (r: LearningResource) => handleEditOpen(r as unknown as ResourceFromDB),
    onDelete:       (id: string) => deleteResource.mutate(id),
    onUpdateStatus: (id: string, status: string, archiveReason?: string) =>
      updateStatus.mutate({ id, status: status as never, ...(archiveReason ? { archiveReason: archiveReason as "irrelevant" | "mastered" | "no_time" } : {}) }),
    onToggleFavorite: (id: string) => toggleFavorite.mutate(id),
    onUpdateProgress: (id: string, currentUnits: number) => updateProgress.mutate({ id, currentUnits }),
    onLinkSetup:    (r: LearningResource) => setLinkSetupTarget(r as unknown as ResourceFromDB),
    onUnlinkSetup:  (resourceId: string, setupId: string) => unlinkSetup.mutate({ resourceId, setupId }),
    onViewImpact:   (r: LearningResource) => setImpactTarget(r as unknown as ResourceFromDB),
    onViewDetail:   (r: LearningResource) => setDrawerResource(r as unknown as ResourceFromDB),
  }

  const strip = [
    { label: "Recursos",        value: stats?.totalResources ?? resources.length },
    { label: "Completados mes", value: stats?.completedThisMonth ?? completed.length },
    { label: "Horas semana",    value: stats ? `${stats.estimatedHoursThisWeek}h` : "—" },
    { label: "Reviews urgentes",value: stats?.pendingReviewsCount ?? 0, alert: (stats?.pendingReviewsCount ?? 0) > 0 },
    { label: "Racha",           value: `${stats?.currentStreak ?? 0}d` },
  ]

  return (
    <div>
      <TopBar
        title="Aprendizaje"
        subtitle={`${resources.length} recursos · ${reviewPending.length} marcados para review`}
        actions={[
          { label: "Añadir recurso", variant: "primary", icon: <Plus size={14} />, onClick: handleOpen },
        ]}
      />

      {/* Stats strip — quick glance, always visible, responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-4">
        {strip.map((s) => (
          <div key={s.label} className="rounded-[var(--radius-sm)] bg-[var(--panel)] border border-[var(--line)] px-3 py-2.5">
            <p className="num text-[18px] font-bold leading-none" style={{ color: s.alert ? "var(--loss)" : "var(--ink)" }}>{s.value}</p>
            <p className="text-[10px] text-[var(--ink-3)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Secciones de aprendizaje" className="flex gap-1 mb-4 border-b border-[var(--line)]">
        {([
          { id: "hoy",        label: "Hoy" },
          { id: "biblioteca", label: "Biblioteca" },
          { id: "repaso",     label: "Repaso", count: dueResources.length },
          { id: "progreso",   label: "Progreso" },
        ] as const).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => selectTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-[var(--accent)] text-[var(--ink)]"
                : "border-transparent text-[var(--ink-3)] hover:text-[var(--ink-2)]",
            )}
          >
            {t.label}
            {"count" in t && t.count > 0 && (
              <span className="text-[10px] font-semibold px-1.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[var(--ink-3)]">Cargando recursos…</p>
        </div>
      ) : tab === "hoy" ? (
        <HoyTab onGoRepaso={() => selectTab("repaso")} />
      ) : tab === "progreso" ? (
        <ResourceRightRail
          resources={resources}
          rawResources={rawResources}
          reviewPending={reviewPending}
          completed={completed}
          onStartSession={() => setSessionOpen(true)}
          onRevisarResource={(r) => setRevisarResource(r)}
        />
      ) : tab === "repaso" ? (
        dueResources.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--ink-3)]">
            Nada que repasar por ahora. El repaso espaciado te avisará cuando toque.
          </div>
        ) : (
          <ResourceGrid {...gridProps} resources={dueResources} />
        )
      ) : (
        <ResourceGrid {...gridProps} resources={resources} />
      )}

      <AddEditResourceModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditTarget(null) }}
        editTarget={editTarget}
      />

      <RevisarRecursoModal
        resource={revisarResource}
        reviews={reviews}
        open={revisarResource !== null}
        onOpenChange={(v) => { if (!v) setRevisarResource(null) }}
      />

      <LinkSetupModal
        resource={linkSetupTarget}
        open={linkSetupTarget !== null}
        onOpenChange={(v) => { if (!v) setLinkSetupTarget(null) }}
      />

      <SetupImpactModal
        resource={impactTarget}
        open={impactTarget !== null}
        onOpenChange={(v) => { if (!v) setImpactTarget(null) }}
      />

      <SessionReviewModal
        queue={(stats?.urgentReviews ?? []).map(r => {
          const match = rawResources.find(x => x.id === r.id)
          return { id: r.id, title: r.title, type: r.type, reviewInterval: match?.reviewInterval ?? null }
        })}
        open={sessionOpen}
        onClose={() => setSessionOpen(false)}
      />

      <ResourceDrawer
        resource={drawerResource as unknown as LearningResource | null}
        open={drawerResource !== null}
        onClose={() => setDrawerResource(null)}
        onReview={(r) => {
          setDrawerResource(null)
          setRevisarResource(r as unknown as ResourceFromDB)
        }}
        onEdit={(r) => {
          setDrawerResource(null)
          handleEditOpen(r as unknown as ResourceFromDB)
        }}
      />
    </div>
  )
}
