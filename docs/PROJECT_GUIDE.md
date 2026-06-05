# Project Guide — Trading Journal v2

> **Punto de entrada único para cualquier desarrollador.** Si lees solo un documento, que sea este.
> Última actualización: 2026-06-05.

---

## 1. ¿Qué es?

Una **plataforma profesional de inteligencia de trading** para traders retail — desde principiantes hasta participantes de prop firms. No es un simple registro pasivo: es un coach activo que captura cada trade, revela patrones de comportamiento que el trader no ve, hace cumplir las reglas que se comprometió a seguir, y mide el aprendizaje que cambia su edge con el tiempo.

## 2. ¿Qué problema resuelve?

La mayoría de los diarios de trading son hojas de cálculo glorificadas: registran, pero no enseñan. Este producto cierra el **bucle entre ejecución, reflexión y aprendizaje**:

```
Trade → Journal → Reflect → Learn → Improve → Trade
```

Es la **capa cognitiva** sobre cualquier broker o estrategia: ayuda al trader a verse con claridad y a mejorar deliberadamente.

## 3. Propósito / Posicionamiento

- **NO** es una integración con broker (no hay feed de P&L en vivo; los trades se registran manual o por CSV).
- **NO** es un servicio de señales ni una plataforma social.
- **NO** es un ejecutor de algos (solo analítica, sin order routing).
- **SÍ** es un vault privado de un solo trader con analítica server-side, enforcement de reglas y aprendizaje por repetición espaciada.

### Usuarios objetivo
| Persona | Perfil | Necesidad clave |
|---|---|---|
| Retail Learner | <1 año, discrecional, cuenta personal | Formación de hábito, enforcement de reglas |
| Prop Firm Candidate | 1-3 años, challenge estructurado | Cumplimiento de drawdown, consistencia |
| Funded Trader | 2+ años, gestiona capital | Refinamiento del edge, analítica de rendimiento |
| System Trader | Backtesting de setups | Correlación estudio ↔ rendimiento del setup |

### Diferenciadores
1. **Repetición espaciada** para conceptos de trading (con detección de decaimiento).
2. **Correlación setup–aprendizaje** (`resourceImpactRanking`): conecta lo que estudias con cómo rinden tus setups.
3. **Rachas de comportamiento** y alertas de inactividad.
4. **Arquitectura rule-first**: las reglas del playbook son entidades de primera clase.
5. **Soporte multi-cuenta para prop firms**: modelos de drawdown (FIXED/TRAILING), tracking de fases, aislamiento de divisa.

---

## 4. Módulos

| Módulo | Ruta | Qué hace |
|---|---|---|
| **Dashboard** | `/dashboard` | 4 pestañas (Portfolio, Operador, Disciplina, Playbook); analítica server-side |
| **Trades** | `/trades` | Ciclo de vida del trade, import CSV, filtros, psicología por trade |
| **Cuentas** | `/cuentas` | CRUD de cuentas, fases prop-firm, drawdown, audit log |
| **Playbook / Setups** | `/playbook` | Setups con checklists, versiones+diff, sparklines, salud, lifecycle |
| **Reviews** | `/reviews` | Reviews semanales y mensuales con discipline score y resumen IA |
| **Aprendizaje** | `/aprendizaje` | Recursos + repetición espaciada (SRS), decay, rachas |
| **Retiros** | `/retiros` | CRUD de retiros con transiciones de estado |
| **Reglas** | `/reglas` | CRUD de reglas de comportamiento + tracking de violaciones |
| **Mercados** | `/mercados` | Watchlist de símbolos |
| **Etiquetas** | `/etiquetas` | CRUD de tags personalizados |
| **Perfil / Settings** | `/perfil` | Perfil, configuración de IA, tema, preferencias, metas |
| **IA Coach** | drawer global | Chat en streaming con contexto del trader |

Detalle funcional completo por módulo → **[FEATURES.md](FEATURES.md)**.

---

## 5. Cómo se usa (setup de desarrollo)

> El código de la app vive en `src/`. Las migraciones de BD en `supabase/migrations/`.

```bash
cd src
pnpm install
cp .env.example .env        # rellenar variables (ver abajo)
pnpm dev                    # http://localhost:3000
```

### Scripts (en `src/package.json`)
| Comando | Acción |
|---|---|
| `pnpm dev` | Servidor de desarrollo (Next.js) |
| `pnpm build` | `prisma generate && next build` |
| `pnpm start` | Servidor de producción |
| `pnpm test` | Tests unitarios (Vitest) |
| `pnpm e2e` | Tests E2E (Playwright) |
| `pnpm lint` | ESLint |

### Variables de entorno (mínimas)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `CRON_SECRET`, `RESEND_API_KEY`, `AI_KEY_ENCRYPTION_SECRET` (64-char hex). Las claves de IA son **per-usuario y cifradas** (no requieren env vars; ver ARCHITECTURE §IA).

### Base de datos / migraciones
El sistema de migraciones es el **Supabase CLI** (`supabase/migrations/`). **Nunca** se hacen cambios manuales en la BD. Flujo: `supabase migration new` → `supabase db reset` (prueba desde cero) → `supabase db push`. Política y detalle → [ARCHITECTURE.md](ARCHITECTURE.md#base-de-datos--migraciones).

### Email
Resend para email transaccional; Edge Function `weekly-learning-summary` (resumen semanal + alertas de inactividad), agendada vía `pg_cron`. Setup: configurar `RESEND_API_KEY` y `CRON_SECRET`.

---

## 6. Cómo navegar la documentación

Esta es la **fuente de verdad única**. Solo 9 documentos:

| Documento | Responde |
|---|---|
| **PROJECT_GUIDE.md** (este) | Qué es, propósito, módulos, cómo se usa |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Cómo funciona por dentro (stack, dominios, motores, BD, IA, seguridad) |
| **[FEATURES.md](FEATURES.md)** | Catálogo de funcionalidades por módulo con estado |
| **[ROADMAP.md](ROADMAP.md)** | Completado / En progreso / Pendiente / Futuro |
| **[BACKLOG.md](BACKLOG.md)** | Trabajo pendiente accionable |
| **[TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)** | Deuda técnica y riesgos |
| **[QA_STATUS.md](QA_STATUS.md)** | Estado de calidad, bugs abiertos |
| **[CHANGELOG.md](CHANGELOG.md)** | Historial consolidado |
| **[RELEASE_STATUS.md](RELEASE_STATUS.md)** | Completitud y recomendación de producción |

Material histórico (sprints, auditorías, reportes de causa raíz) en `docs/archive/`.
