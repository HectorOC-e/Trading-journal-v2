import { z } from "zod"
import { parseEdgeNumber } from "../services/playbook-reliability"

const edgeNumber = z.string().refine(value => { try { parseEdgeNumber(value); return true } catch { return false } }, "Introduce un número válido")

/** Client validation for the playbook setup create/edit form. */
export const setupFormSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre al setup"),
  abbr: z.string().trim().min(1, "Indica una abreviatura").max(4, "Máximo 4 caracteres"),
  market: z.string(),
  direction: z.enum(["LONG", "SHORT", "AMBAS"]),
  status: z.enum(["ACTIVO", "EN_PRUEBA", "PAUSADO", "DESCARTADO"]),
  description: z.string(),
  color: z.string(),
  images: z.array(z.string()),
  aplusChecklist: z.array(z.string()),
  standardChecklist: z.array(z.string()),
  expectedWr: edgeNumber.refine(value => { try { const n = parseEdgeNumber(value); return n === null || (n >= 0 && n <= 100) } catch { return false } }, "Usa un porcentaje entre 0 y 100"),
  expectedAvgR: edgeNumber,
  minR: edgeNumber,
  maxR: edgeNumber,
}).refine(value => { try { const min = parseEdgeNumber(value.minR), max = parseEdgeNumber(value.maxR); return min === null || max === null || min <= max } catch { return true } }, { path: ["maxR"], message: "El máximo debe ser mayor o igual al mínimo" })

export type SetupFormValues = z.infer<typeof setupFormSchema>
