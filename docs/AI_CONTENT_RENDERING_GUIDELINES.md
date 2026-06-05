# AI Content Rendering Guidelines

> Cómo deben emitir markdown los servicios IA y cómo se renderiza. Fecha: 2026-06-05.

## 1. Regla de oro

Todo texto **generado libremente por un LLM** se renderiza con `<Markdown content={…} />` (`components/ui/markdown.tsx`).
Nunca mostrar markdown crudo con `whitespace-pre-wrap`. El contenido escrito por el **usuario** (notas, journal) se deja como texto plano.

## 2. Cómo usarlo

```tsx
import { Markdown } from "@/components/ui/markdown"
// ...
<Markdown content={aiText} />
```

Para paneles de inteligencia (Analytics/Psychology) usa el contenedor reutilizable:

```tsx
import { IntelligencePanel } from "@/components/ui/intelligence-panel"
<IntelligencePanel insights={insights} isLoading={loading}
  endpoint="/api/psychology-ai" period={period}
  title="…" subtitle="…" />
```

## 3. Sintaxis soportada

| Elemento | Sintaxis |
|---|---|
| Encabezados | `# … ###### …` |
| Énfasis | `**negrita**` · `*itálica*` · `~~tachado~~` · `` `código` `` |
| Enlaces | `[texto](https://…)` (solo http/https/mailto/`/relativo`) |
| Listas | `- item` · `1. item` |
| Checklists | `- [ ] pendiente` · `- [x] hecho` |
| Cita | `> texto` |
| Código | ```` ```lang … ``` ```` |
| Tabla | `\| A \| B \|` + `\|---\|---\|` |
| Regla | `---` |

## 4. Callouts (bloques avanzados)

Dos sintaxis equivalentes:

```
> [!INSIGHT] Título opcional
> contenido

:::recommendation
contenido
:::
```

Tipos y alias:
| Tipo | Alias | Uso |
|---|---|---|
| `insight` | — | Hallazgo clave |
| `warning` | `caution` | Riesgo / alerta |
| `danger` | `error` | Riesgo crítico |
| `recommendation` | `action`, `rec` | Acción concreta |
| `note` | `info` | Contexto |
| `tip` | `success` | Buen hábito |
| `metric` | `kpi` | Referencia a una métrica |

## 5. Reglas para los prompts de los servicios IA

Al escribir el `system` de un servicio IA:
1. Pide **markdown** explícitamente.
2. Pide usar callouts cuando aporten: `> [!INSIGHT]`, `> [!WARNING]`, `> [!RECOMMENDATION]`.
3. Estructura en secciones con `**negrita**` o encabezados.
4. Para datos comparativos, pide **tablas**.
5. Para acciones, pide **checklists** o listas numeradas.

Ejemplo (extracto real, Psychology):
```
Responde en español, en markdown, usando callouts:
> [!INSIGHT] hallazgos · > [!WARNING] riesgos · > [!RECOMMENDATION] acciones
```

## 6. Checklist para nuevas funcionalidades IA

- [ ] El servicio pide markdown + callouts en el system prompt.
- [ ] La UI renderiza con `<Markdown>` (no `whitespace-pre-wrap`).
- [ ] El estado de streaming muestra spinner hasta el primer chunk.
- [ ] Errores (`NO_API_KEY`, etc.) se muestran como aviso, no como JSON crudo.
- [ ] El feature está en `AI_FEATURES` y resuelto por `resolveAiCall(prisma, userId, feature)`.
