# QA Status — Trading Journal v2

> Estado actual de calidad. Última actualización: 2026-06-05.

## Gates (verificados contra código)
| Gate | Resultado |
|---|---|
| `next build` | ✅ Pasa (23 rutas) |
| `tsc --noEmit` | ✅ 0 errores, 0 `any` en código de producción |
| Tests unitarios (Vitest) | ✅ **540/540** (42 archivos) |
| Lint (ESLint) | 🟡 Aceptable — warnings preexistentes (TD-037); 0 errores nuevos |
| Render purity / a11y | ✅ Correcto (ARIA, focus rings, landmarks) |

## Bugs abiertos
- **Blocking: 0**
- **Major: 0**

## Hallazgos menores (Minor)
| ID | Hallazgo | Severidad | Fix |
|---|---|---|---|
| M-01 | Iconos PWA requieren PNG para iOS | Minor | Generar 192/512 (B-01) |
| M-02 | PDF solo incluye tablas, no charts | Minor | Captura de charts (B-06) |
| M-03 | Onboarding paso 4 depende de `profile.name` | Minor | Fallback a `email` (B-08) |
| M-04 | Service worker puede cachear HTML stale tras deploy | Minor | Bump de cache name (B-09) |

### Nitpicks
- N-01: auto-print del export puede dispararse antes de cargar fuentes → usar `document.fonts.ready`.
- N-02: diff de versión vacío no muestra mensaje "sin cambios de checklist".

## Riesgos conocidos
Ver [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) (migración en prod, claves IA, SW stale, volumen alto). Todos con mitigación.

## Cobertura funcional validada
Trade CRUD + import CSV · Account CRUD + fases + drawdown/lock · Enforcement prop-firm · Dashboard server-side · Setups (sparklines/versiones/diff) · Reviews (discipline score + resumen IA) · Learning SRS · Retiros · IA Coach (claves per-usuario, diagnóstico, health check) · Metas · Tags/markets/reglas.

## Seguridad validada
RLS en todas las tablas · `protectedProcedure` (userId de sesión) · IDOR fix en `ai-embed` · rate limiting IA · SQL parametrizado · `CRON_SECRET` · claves IA cifradas (AES-256-GCM) · cap 16KB en webhook body.

## Recomendación
Listo para producción (GO condicional al checklist de pre-lanzamiento en [RELEASE_STATUS.md](RELEASE_STATUS.md)). Recomendado: añadir `eslint` y E2E al CI (B-02, B-03).
