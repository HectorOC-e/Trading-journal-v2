"use client"

// Client tag catalog. Looks up Tag metadata by name (the join key with
// Trade.tags[]). Falls back to a neutral grey style for names not yet catalogued.

import { useMemo } from "react"
import { trpc } from "@/lib/trpc/client"

export interface TagMeta {
  name: string
  color: string
  icon: string | null
  description: string
  category: string
  displayMode: string
  sortOrder: number
  isSystem: boolean
  semantic: string | null
}

const DEFAULT: Omit<TagMeta, "name"> = {
  color: "#6b7280", icon: null, description: "", category: "",
  displayMode: "icon_color", sortOrder: 999, isSystem: false, semantic: null,
}

export function resolveTagMeta(name: string, catalog: Map<string, TagMeta>): TagMeta {
  return catalog.get(name) ?? { name, ...DEFAULT }
}

/** Map<name, TagMeta> from the catalog (cached). Cast keeps TS instantiation shallow. */
export function useTagCatalog(): Map<string, TagMeta> {
  const { data } = trpc.tags.list.useQuery(undefined, { staleTime: 60_000, refetchOnWindowFocus: false })
  return useMemo(() => {
    const m = new Map<string, TagMeta>()
    for (const t of (data ?? []) as TagMeta[]) m.set(t.name, t)
    return m
  }, [data])
}
