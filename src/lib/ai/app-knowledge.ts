// Curated knowledge of the Trading Journal app, injected into the AI coach's
// system prompt so it can guide the user on HOW to do things and explain the
// WHY behind the metrics. Keep this in sync with the product. Pure static text.

export const APP_KNOWLEDGE = `## Cómo funciona la app (mapa de pantallas)
- **Dashboard**: visión global del portfolio. KPIs (Net P&L, win rate, profit factor, avg R, expectancy), curva de equity por cuenta, reglas prop-firm y comparación de cuentas. Todo se normaliza a la moneda base del usuario.
- **Trades**: registrar y listar operaciones. Cada trade tiene entrada/stop/target, tamaño, setup, sesión, tags y notas de psicología. Importación CSV (MT4/cTrader) disponible.
- **Cuentas**: crear/gestionar cuentas (personal o prop-firm). Define límites de drawdown (diario/total), objetivo, fases (Phase 1/2/Funded) y registra el historial (audit log). Una cuenta puede bloquearse automáticamente al romper un límite de pérdida.
- **Playbook**: catálogo de setups. Cada setup puede definir su "edge" esperado (win rate y avg R esperados) y se compara contra el desempeño real (health: healthy/warning/critical).
- **Reglas**: reglas de disciplina propias.
- **Notificaciones**: centro de notificaciones (campana + página /notificaciones). Los eventos importantes (cuenta bloqueada, regla disparada, review vencida, importación terminada, reporte semanal listo) se guardan con prioridad P0–P3, estado leído/no leído, y se pueden archivar. Las preferencias por categoría (silenciar, prioridad mínima, horas de silencio, canales) se configuran por usuario. Los **toasts** son avisos efímeros de acciones (p.ej. "Trade guardado"); solo los eventos significativos quedan en el centro. Las reglas ya NO aparecen como notificaciones por sí mismas: solo su *disparo* genera una.
- **Etiquetas**: catálogo de tags de los trades, cada una con color, icono, categoría y orden, gestionado en /etiquetas. Las tags se siguen guardando por *nombre* en cada trade (puedes referirte a ellas por nombre). Las tags de sistema (Off-plan, Impulsivo, Revanche = violación; A+ = calidad) tienen nombre bloqueado porque la analítica las interpreta.
- **Mercados**: catálogo de símbolos y watchlist.
- **Retiros**: registrar payouts por cuenta y divisa, con estados Solicitado → En proceso → Pagado / Rechazado.
- **Aprendizaje**: biblioteca de recursos (libros, cursos, videos) con repaso espaciado (SRS). El "dominio" de un recurso se gana repasándolo en intervalos crecientes.
- **Reviews**: reviews semanales y mensuales con discipline score y resumen.
- **Psicología**: registro de mood/energía por sesión y correlaciones con resultados.
- **Analytics**: análisis profundo (por setup, sesión, hora, símbolo).
- **Perfil**: moneda base, tasas de cambio FX, metas, tema, y proveedor de IA.

## Cómo hacer tareas clave
- **Registrar un trade**: Trades → "Registrar trade" → llenar entrada/stop/target, tamaño, setup y sesión → al cerrar, ingresar precio de salida (calcula P&L y R).
- **Crear un setup**: Playbook → "Nuevo setup" → nombre/abreviatura, mercado, dirección y (opcional) el edge esperado (win rate y avg R).
- **Hacer una review**: Reviews → "Nueva review" (semanal o mensual). El discipline score lo calcula el servidor.
- **Registrar un retiro**: Retiros → "Nuevo retiro" → elegir cuenta, monto y divisa. Luego cambiar el estado (En proceso/Pagado/Rechazado).
- **Sincronizar balance**: en Cuentas, "Sincronizar balance" registra el balance del broker; el equity sigue siendo derivado (inicial + P&L + ajuste).
- **Promover fase prop-firm**: en Cuentas, cuando se cumple el objetivo, promover de Phase 1 → 2 → Funded (queda en el audit log).

## El porqué de las métricas
- **R-multiple (R)**: cuántas veces tu riesgo inicial ganaste/perdiste. +2R = ganaste el doble de lo que arriesgabas. Mide calidad independiente del tamaño.
- **Win rate**: % de trades ganadores. Por sí solo no basta: un win rate bajo con R alto puede ser muy rentable.
- **Profit factor**: ganancia bruta / pérdida bruta. >1 es rentable; >1.5 es sólido.
- **Expectancy**: valor esperado por trade. Combina win rate y tamaño medio de ganancia/pérdida.
- **Drawdown**: caída desde un pico. Las prop-firms lo limitan (modelo fijo = desde el balance inicial; trailing = desde el pico). Romper el límite bloquea la cuenta.
- **Discipline score**: qué tanto seguiste tu plan (setups asignados, sin trades off-plan/impulsivos/revenge).
- **SRS / repaso espaciado**: repasar en intervalos crecientes consolida el aprendizaje; "Dominado" se alcanza tras varios repasos exitosos.
- **Prioridad de notificación (P0–P3)**: P0 = crítico (persistente, requiere acción, no silenciable, p.ej. cuenta bloqueada); P1 = alto; P2 = medio; P3 = bajo (efímero, auto-desaparece).`
