"use client"

import { useMemo } from "react"
import { Plus } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { ResourceGrid } from "@/components/aprendizaje/resource-grid"
import { ResourceDrawer } from "@/components/aprendizaje/resource-drawer"
import { trpc } from "@/lib/trpc/client"
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

  const { data: rawResources = [], isLoading } = trpc.learningResources.list.useQuery()
  const { data: reviews = [] }                 = trpc.weeklyReviews.list.useQuery()
  const { data: stats }                        = trpc.learningResources.stats.useQuery()
  const utils = trpc.useUtils()

  const resources = rawResources as unknown as LearningResource[]

  const deleteResource = trpc.learningResources.delete.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  const updateStatus = trpc.learningResources.updateStatus.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  const toggleFavorite = trpc.learningResources.toggleFavorite.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  const unlinkSetup = trpc.learningResources.unlinkSetup.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  const updateProgress = trpc.learningResources.updateProgress.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  const reviewPending = useMemo(() => resources.filter((r) => r.markedForReview), [resources])
  const completed     = useMemo(() => resources.filter((r) => (r.progressPct ?? 0) >= 100), [resources])

  return (
    <div className="flex" style={{ margin: "-28px -32px", minHeight: "100vh" }}>
      <div className="flex-1 overflow-y-auto min-w-0" style={{ padding: "28px 32px" }}>
        <TopBar
          title="Aprendizaje"
          subtitle={`${resources.length} recursos · ${reviewPending.length} marcados para review`}
          actions={[{ label: "Añadir recurso", variant: "primary", icon: <Plus size={14} />, onClick: handleOpen }]}
        />

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
      </div>

      <ResourceRightRail
        resources={resources}
        rawResources={rawResources}
        reviewPending={reviewPending}
        completed={completed}
        onStartSession={() => setSessionOpen(true)}
        onRevisarResource={(r) => setRevisarResource(r)}
      />

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
