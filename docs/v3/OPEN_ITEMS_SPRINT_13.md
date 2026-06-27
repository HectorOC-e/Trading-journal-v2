# OPEN_ITEMS_SPRINT_13.md
### Sprint 13 · Open items

| # | Item | Se resuelve en |
|---|---|---|
| OI-13.1 | Telemetría de **ignorado por ítem** (clicks/descartes → `ignored`); hoy el decay usa la edad como proxy | follow-up (necesita persistir interacciones del feed) |
| OI-13.2 | Digest proactivo por email del feed HOY (#28) — el digest de aprendizaje ya existe, extenderlo | follow-up / cron |
| OI-13.3 | Absorber la pantalla **Notificaciones** dentro del feed (hoy conviven) | S12c (migración real de rutas) / follow-up |
| OI-13.4 | Señales tempranas en vivo (#44) vía outbox (rachas/drift en el momento) en lugar de poll | con realtime (POST-1) |
| OI-13.5 | Refuerzos productor real a `today` (hoy se leen si existen; el productor de Reinforcement visible=today es del Behavior Engine) | con uso del loop |
| OI-13.6 | Verificación live end-to-end en prod (feed reaccionando a un trade nuevo) | siguiente sesión |
