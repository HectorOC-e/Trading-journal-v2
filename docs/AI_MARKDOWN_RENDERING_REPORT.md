# AI Markdown Rendering — Audit & Implementation Report

> Fecha: 2026-06-05.

## 1. Auditoría — estado previo

| Salida IA | ¿Genera markdown? | Render previo | Problema |
|---|---|---|---|
| Coach (`/api/ai-coach`) | Sí (el modelo emite markdown) | `whitespace-pre-wrap` | Markdown como texto plano (`**`, `#`, `-` literales) |
| Analytics Insights (`/api/analytics-ai`) | Sí | `whitespace-pre-wrap` | Idem |
| Psychology Insights | (nuevo) | — | — |
| Weekly Reviews | Texto/secciones | Listas propias (no markdown libre) | OK (no markdown libre) |
| Learning Insights (`resource-drawer`) | No (notas del usuario + insights de review) | texto | No es IA libre → correcto dejar plano |
| Trade Analysis | Calculado analíticamente (sin LLM libre) | — | Sin texto markdown |

**Conclusión:** las salidas LLM libres (Coach, Analytics, Psychology) emitían markdown que se mostraba como texto plano. El resto no es markdown libre.

## 2. Implementación

**Renderer único, sin dependencias** — `components/ui/markdown.tsx` (`<Markdown content={…} />`).
No se añadió ninguna librería (el entorno bloquea `npm install` por cert self-signed). Parser block-level + inline propio.

**Soporta:**
- Headings `#`–`######`, párrafos, **negrita**, *itálica*, ~~tachado~~, `código inline`, enlaces (con saneo de URL).
- Listas desordenadas y ordenadas, **checklists** `- [ ]` / `- [x]`.
- Blockquotes, **bloques de código** con fence ```` ``` ````, **tablas** `| … |`, reglas horizontales.
- **Callouts** (avanzado): estilo GitHub `> [!TYPE]` y fence `:::type`:
  `note/info · tip/success · insight · warning/caution · danger/error · recommendation/action · metric/kpi`.

**Aplicado en:**
- `components/ai-coach/ai-coach-drawer.tsx` → burbujas del **asistente** (las del usuario siguen en texto plano).
- `app/analytics/components/ai-insights-panel.tsx` (vía `IntelligencePanel`) → narrativa Analytics.
- `components/ui/intelligence-panel.tsx` → narrativa Analytics **y** Psychology.

**Prompts actualizados** (Analytics + Psychology) para usar callouts `[!INSIGHT]/[!WARNING]/[!RECOMMENDATION]`, de modo que el render muestre bloques visuales.

**Tests:** `__tests__/lib/markdown.test.ts` (headings, listas, checklists, callouts GitHub y `:::`, code, tablas, quotes).

## 3. UX

Las respuestas IA ahora se ven como Notion/Linear/ChatGPT: jerarquía de títulos, listas con viñetas/numeración, checklists con casillas, tablas con cabecera, código en bloque monoespaciado y callouts de color por tipo (insight/aviso/recomendación) usando los tokens del tema. No más "textarea gigante".

## 4. Pantallas que consumen IA — verificación

- [x] Coach drawer → markdown.
- [x] Analytics Insights → markdown.
- [x] Psychology Insights → markdown.
- [x] Learning/`resource-drawer` → contenido de usuario, se deja en texto (correcto).
- [x] Weekly reviews → estructura propia, sin markdown libre (sin cambios).

## 5. Notas
- El renderer es deliberadamente tolerante: contenido en streaming parcial se re-parsea en cada chunk (markdown incompleto degrada a texto sin romper).
- Saneo de enlaces: solo `http(s)`, `mailto:` y rutas relativas `/…`.
