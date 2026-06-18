import { z } from "zod"

/** Client validation for the playbook setup create/edit form. */
export const setupFormSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre al setup"),
  abbr: z.string().trim().min(1, "Indica una abreviatura"),
  market: z.string(),
  direction: z.enum(["LONG", "SHORT", "AMBAS"]),
  status: z.enum(["ACTIVO", "EN_PRUEBA", "PAUSADO", "DESCARTADO"]),
  description: z.string(),
  color: z.string(),
  images: z.array(z.string()),
  aplusChecklist: z.array(z.string()),
  standardChecklist: z.array(z.string()),
  expectedWr: z.string(),
  expectedAvgR: z.string(),
  minR: z.string(),
  maxR: z.string(),
})

export type SetupFormValues = z.infer<typeof setupFormSchema>
