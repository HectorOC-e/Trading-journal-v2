# Learning reminder time Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Elegir hora HH:mm del resumen de aprendizaje en Perfil, usando su zona horaria.
**Architecture:** Columna aditiva en users, whitelist/validación del perfil, componente pequeño de guardado independiente y filtro puro por hora/minuto en el cron existente.
**Tech Stack:** React, Next.js, Prisma, Supabase pg_cron, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-11-03-learning-reminder-time-design.md

## Global Constraints
Valor por defecto 19:00, formato 24 horas HH:mm. No activar canales ni enviar correos de QA reales. Conservar silencio, deduplicación, comando y credenciales del cron.

## Review Focus
- Media hora/cuartos y cambio DST: pruebas del filtro puro.
- Medianoche y otro día UTC: pruebas del filtro y runner.
- Formato inválido o campo vacío: router y componente.
- Entrega retrasada y medianoche: ventana de cinco minutos y clave idempotente por día previsto.
- Perfil/canales deshabilitados: configuración guardable, sin activar envío.
- Despliegue escalonado: aplicar columna primero, frecuencia del cron solo tras producción READY.

## Task 1: Modelo y programación
- [x] Pruebas RED de perfil y filtro/runner.
- [x] Migración aditiva, Prisma y whitelist/validación del perfil; generar cliente y GREEN.
- [x] Runner usa hora personal y zona del perfil; migración separada del cron conserva comando.

## Task 2: Perfil
- [x] Pruebas RED del componente: formato, guardado y zona.
- [x] Componente con Field/Input/Button compartidos junto a Email Aprendizaje.
- [x] Suite completa, tipos, lint, revisión y graphify.

## Task 3: Entrega
- [ ] PR/preview y QA de perfil con restauración, capturas.
- [ ] Merge, eliminar rama, READY exacto y activar cron; producción QA, CI y limpieza.
