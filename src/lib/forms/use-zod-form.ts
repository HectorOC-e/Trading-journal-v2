import { useForm, type UseFormProps, type FieldValues, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"

/**
 * Thin wrapper over react-hook-form wired to a zod schema. Centralises the
 * resolver + the project default of `mode: "onTouched"` (validate a field once
 * the user has left it, then keep it live) so every form across the app behaves
 * the same. The form value type `T` is inferred from the schema's output; pass
 * any UseFormProps to override (e.g. `defaultValues`).
 *
 * Our form schemas don't transform values (input === output), so a single type
 * param is enough and keeps call sites clean.
 */
export function useZodForm<T extends FieldValues>(
  schema: z.ZodType<T>,
  options?: Omit<UseFormProps<T>, "resolver">,
) {
  return useForm<T>({
    mode: "onTouched",
    // zod v4 + resolvers v5 generic friction — the runtime contract is correct.
    resolver: zodResolver(schema as never) as unknown as Resolver<T>,
    ...options,
  })
}
