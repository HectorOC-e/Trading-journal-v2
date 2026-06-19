"use client"

import { useState } from "react"
import type { RouterOutputs } from "@/server/trpc/root"

type ResourceFromDB = RouterOutputs["learningResources"]["list"][number]

export function useResourceActions() {
  const [modalOpen,       setModalOpen]       = useState(false)
  const [editTarget,      setEditTarget]      = useState<ResourceFromDB | null>(null)
  const [revisarResource, setRevisarResource] = useState<ResourceFromDB | null>(null)
  const [linkSetupTarget, setLinkSetupTarget] = useState<ResourceFromDB | null>(null)
  const [impactTarget,    setImpactTarget]    = useState<ResourceFromDB | null>(null)
  const [drawerResource,  setDrawerResource]  = useState<ResourceFromDB | null>(null)

  function handleOpen() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function handleEditOpen(resource: ResourceFromDB) {
    setEditTarget(resource)
    setModalOpen(true)
  }

  return {
    modalOpen,       setModalOpen,
    editTarget,      setEditTarget,
    revisarResource, setRevisarResource,
    linkSetupTarget, setLinkSetupTarget,
    impactTarget,    setImpactTarget,
    drawerResource,  setDrawerResource,
    handleOpen,
    handleEditOpen,
  }
}
