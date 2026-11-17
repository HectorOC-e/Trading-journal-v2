# Manual de uso: Real, Demo y Backtesting

Este manual explica cómo usar las tres modalidades operativas de TjournalX sin mezclar resultados. La cuenta, las operaciones, el riesgo, el P&L, las estadísticas, las reviews y la evidencia de aprendizaje conservan siempre su modalidad.

## 1. Qué representa cada modalidad

| Modalidad | Uso | Tipos de cuenta |
|---|---|---|
| Real | Operativa con consecuencias reales, incluidas cuentas propias y de firmas de fondeo | Personal y Prop Firm |
| Demo | Entrenamiento en una cuenta simulada | Demo personal y Demo Prop |
| Backtesting | Ejecuciones históricas de una estrategia | Backtest |

Las definiciones de estrategias, recursos de aprendizaje y preferencias del perfil son compartidas. Sus resultados operativos no lo son. TjournalX nunca suma Real, Demo y Backtesting en un P&L o saldo general.

## 2. Cambiar de modalidad

1. Abre **Dashboard**, **Trades**, **Analytics**, **Playbook**, **Reviews** o **Aprendizaje**.
2. Elige **Real**, **Demo** o **Backtesting** en el selector de modalidad.
3. Comprueba la modalidad indicada junto a las métricas antes de registrar o interpretar datos.

La selección se conserva al navegar. Si una modalidad no tiene operaciones, TjournalX muestra un estado vacío; no reutiliza cifras de otra modalidad. **Comparar modalidades** presenta muestras separadas y nunca un total combinado.

## 3. Crear y usar cuentas

En **Cuentas**, el tipo elegido determina la modalidad de la cuenta. Una cuenta con operaciones no cambia de modalidad mediante la edición ordinaria: si necesitas pasar de Demo a Real, crea una cuenta Real distinta. Esto mantiene intacto el historial.

Al abrir **Nuevo trade**, sólo aparecen cuentas compatibles con la modalidad activa. El servidor vuelve a validar propietario y modalidad al guardar; cambiar parámetros del navegador no permite vincular una operación a una cuenta incompatible.

## 4. Registrar una operación actual

1. Selecciona la modalidad correcta.
2. Pulsa **Nuevo trade**.
3. En **Registro**, elige **Operación actual**.
4. Selecciona la cuenta, mercado, dirección, fecha, hora y niveles.
5. Completa el checklist y guarda.

Los controles preventivos de riesgo y los bloqueos de la cuenta se aplican a este flujo. Una operación Demo o Backtesting no puede modificar el riesgo, saldo, retiros ni fiscalidad de Real.

## 5. Registrar una operación histórica

Usa este flujo para una operación que ya terminó, no para abrir exposición antigua.

1. En **Nuevo trade**, cambia **Registro** a **Histórico cerrado**.
2. Elige la cuenta de la modalidad correspondiente.
3. Indica la zona horaria del mercado.
4. Registra fecha y hora de apertura, fecha y hora de cierre, tamaño ejecutado y resultado neto total.
5. Guarda y revisa la operación en la cronología de su modalidad.

La fecha de mercado puede ser antigua; `createdAt` sigue representando cuándo se incorporó el registro a TjournalX. El flujo histórico valida el orden temporal y la coherencia, pero no finge que la operación se abrió hoy. Tampoco crea minutos de práctica automáticamente.

## 6. Incorporar operaciones a Aprendizaje

Abre **Aprendizaje → Prácticas → Registrar práctica** y elige uno de estos tipos:

- **Conceptual:** registra el ejercicio y la reflexión sin operaciones.
- **Ejecución Demo / Backtesting:** vincula operaciones simuladas ejecutadas durante la práctica. Una misma operación sólo puede contar una vez como ejecución.
- **Revisión de operaciones:** analiza operaciones existentes de Real, Demo o Backtesting sin contarlas como una ejecución nueva.

Después:

1. Indica la **fecha efectiva de práctica** y los minutos reales dedicados.
2. Elige la **modalidad de la evidencia**.
3. Vincula únicamente operaciones de esa modalidad.
4. Añade objetivo, actividad, reflexión, autoevaluación y capturas si corresponden.
5. Guarda y, opcionalmente, solicita retroalimentación del asistente.

La fecha de práctica mide el esfuerzo educativo. La fecha de cada trade conserva cuándo ocurrió el mercado. Vincular o eliminar un vínculo no duplica, mueve ni borra la operación original.

## 7. Interpretar Dashboard, reviews e IA

- Dashboard, disciplina, psicología, Analytics y Playbook trabajan con una modalidad a la vez.
- Las reviews conservan un único periodo, pero sus resultados automáticos se separan por modalidad.
- El asistente recibe la modalidad y sólo la evidencia pertinente; una mejora en Backtesting no se presenta como mejora demostrada en Real.
- Los recursos y repasos pueden ser compartidos, pero las señales de ejecución muestran su procedencia.
- Retiros y Fiscalidad sólo consultan movimientos reales elegibles; una ganancia simulada no crea dinero retirable ni ingreso fiscal.

## 8. Uso en móvil

El selector y las páginas principales mantienen la misma separación. La barra inferior da acceso rápido a Dashboard, Trades y Analytics; **Más secciones** abre Cuentas, Aprendizaje, Reviews, Retiros, Fiscalidad y Perfil.

Antes de registrar un trade desde móvil, confirma siempre la modalidad activa y la cuenta elegida.

## 9. Comprobación rápida

Antes de dar por terminado un registro, verifica:

- modalidad y cuenta correctas;
- operación actual o histórico cerrado;
- zona horaria y fechas de mercado;
- P&L y tamaño ejecutados, no estimados;
- fecha y minutos reales de práctica;
- rol correcto del vínculo: ejecución o revisión.

Si una pantalla queda sin datos tras cambiar de modalidad, ese estado es intencional: significa que no existen operaciones compatibles en ese periodo, no que se hayan perdido registros.
