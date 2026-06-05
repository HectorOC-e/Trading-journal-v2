"use client"

import { useMemo, useEffect, useState } from "react"
import { Plus, LayoutPanelLeft } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { DrawerPanel } from "@/components/ui/drawer-panel"
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

  const [panelOpen, setPanelOpen] = useState(false)

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
          { label: "Panel de progreso", variant: "ghost", icon: <LayoutPanelLeft size={14} />, onClick: () => setPanelOpen(true) },
          { label: "Añadir recurso", variant: "primary", icon: <Plus size={14} />, onClick: handleOpen },
        ]}
      />

      {/* Stats strip — glance rápido sin robar ancho al grid (M5) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
        {strip.map((s) => (
          <div key={s.label} className="rounded-[var(--radius-sm)] bg-[var(--panel)] border border-[var(--line)] px-3 py-2.5">
            <p className="num text-[18px] font-bold leading-none" style={{ color: s.alert ? "var(--loss)" : "var(--ink)" }}>{s.value}</p>
            <p className="text-[10px] text-[var(--ink-3)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[var(--ink-3)]">Cargando recursos…</p>
        </div>
      ) : (
        <ResourceGrid
          resources={resources}
          onReview={(r) => setRevisarResource(r as unknown as ResourceFromDB)}
          onEdit={(r) => handleEditOpen(r as unknown as ResourceFromDB)}
          onDelete={(id) => deleteResource.mutate(id)}
          onUpdateStatus={(id, status, archiveReason) =>
            updateStatus.mutate({ id, status, ...(archiveReason ? { archiveReason: archiveReason as "irrelevant" | "mastered" | "no_time" } : {}) })
          }
          onToggleFavorite={(id) => toggleFavorite.mutate(id)}
          onUpdateProgress={(id, currentUnits) => updateProgress.mutate({ id, currentUnits })}
          onLinkSetup={(r) => setLinkSetupTarget(r as unknown as ResourceFromDB)}
          onUnlinkSetup={(resourceId, setupId) => unlinkSetup.mutate({ resourceId, setupId })}
          onViewImpact={(r) => setImpactTarget(r as unknown as ResourceFromDB)}
          onViewDetail={(r) => setDrawerResource(r as unknown as ResourceFromDB)}
        />
      )}

      <DrawerPanel open={panelOpen} onClose={() => setPanelOpen(false)} width={360} ariaLabel="Panel de progreso de aprendizaje">
        <ResourceRightRail
          resources={resources}
          rawResources={rawResources}
          reviewPending={reviewPending}
          completed={completed}
          onStartSession={() => setSessionOpen(true)}
          onRevisarResource={(r) => setRevisarResource(r)}
        />
      </DrawerPanel>

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
