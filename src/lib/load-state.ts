export type LoadState = "loading" | "error" | "empty" | "content"

interface QueryLike<T> {
  status: "pending" | "error" | "success"
  data?: T | null
}

/**
 * Derive a render state from a TanStack Query result.
 * Prevents skeleton/empty-state collision by establishing
 * a strict priority: loading > error > empty > content.
 */
export function getLoadState<T>(
  query: QueryLike<T[]>,
): LoadState {
  if (query.status === "pending") return "loading"
  if (query.status === "error") return "error"
  if (!query.data || query.data.length === 0) return "empty"
  return "content"
}

/**
 * Variant for queries that return a single object (not an array).
 * "empty" is mapped when data is null/undefined.
 */
export function getObjectLoadState<T>(
  query: QueryLike<T>,
): LoadState {
  if (query.status === "pending") return "loading"
  if (query.status === "error") return "error"
  if (query.data == null) return "empty"
  return "content"
}
