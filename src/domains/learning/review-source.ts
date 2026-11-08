import { z } from "zod"
export const reviewSourceSchema = z.object({
  kind: z.literal("weekly"),
  weekStart: z.string().date(),
  conclusion: z.string().trim().min(1).max(1000),
})
export type ReviewSource = z.infer<typeof reviewSourceSchema>
export function readReviewSource(value: unknown): ReviewSource | null {
  const result = reviewSourceSchema.safeParse(value)
  return result.success ? result.data : null
}
