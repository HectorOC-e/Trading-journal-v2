# Roadmap — Trading Journal v2

> Última actualización: 2026-06-05. Solo estado: Completado / En progreso / Pendiente / Futuro.

## ✅ Completado
- 12 sprints entregados (núcleo de trading, analítica server-side, prop-firm enforcement, SRS, reviews semanales/mensuales, IA Coach).
- Refactor a dominios (`domains/`) + Formula Engine centralizado (`lib/formulas/`).
- Dashboard multi-cuenta con comparación de equity; PWA instalable; export PDF; onboarding.
- Tabla `user_ai_configs` creada + **sistema de migraciones reconciliado a Supabase CLI** (esquema reproducible desde cero).
- Fix raíz de guardado de claves OpenRouter.
- **Consistencia de configuración IA**: motor `resolve-provider` (claves per-usuario honradas en todos los call-sites), diagnóstico y health check.

## 🔄 En progreso
- Endurecimiento responsive en dispositivos físicos (breakpoints presentes; falta device-farm).
- Superficie de detección de patrones en la UI.
- Captura de charts en export PDF (hoy solo tablas).

## ⏳ Pendiente (corto plazo — v2.1)
- Iconos PWA finales + verificación HTTPS en deploy.
- E2E (Playwright) en CI; añadir `eslint` como gate de CI.
- Test de carga a 1000+ trades.
- Cerrar deuda TD-018 y TD-019 ([TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).
- Wire de error tracker (Sentry) para runtime.

## 🔮 Futuro (v3+)
- Features IA adicionales realmente consumidas (trade/psychology/learning analysis) + tracking de uso/costo (`AiUsageLog`).
- Soporte multi-divisa.
- Integraciones con API de brokers (import automático).
- App móvil (React Native o profundización PWA).
- Features sociales (compartir setups, leaderboards).
