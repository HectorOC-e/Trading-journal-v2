-- Procedencia de la emoción del trade (2026-07-27).
--
-- `emotion_before` no distinguía entre una emoción registrada EN EL MOMENTO
-- (alta o cierre, con el trade vivo y el trader delante) y una reconstruida
-- después. Los detectores de category "correlation" afirman causalidad sobre
-- ese campo; construir esa afirmación sobre recuerdo reconstruido —y revisado
-- a la luz del resultado— es exactamente lo que FREEZE-P2/P3/P6 impiden.
--
-- Valores: 'captured' | 'reconstructed'. NULL cuando no hay emoción.
-- La escribe SIEMPRE el servidor, derivada de la posición del camino de
-- escritura; el cliente no la envía nunca.
--
-- RLS: `trades` ya tiene políticas per-usuario y esta columna las hereda.
-- No es una columna `vector`, así que SÍ se declara en schema.prisma.

ALTER TABLE trades ADD COLUMN IF NOT EXISTS emotion_source TEXT;

ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_emotion_source_check;
ALTER TABLE trades ADD CONSTRAINT trades_emotion_source_check
  CHECK (emotion_source IS NULL OR emotion_source IN ('captured', 'reconstructed'));

-- Backfill honesto: las únicas filas con emoción en prod entraron por
-- register-trade-modal en el momento del alta (simulación del 2026-07-22).
-- Son 15 — no 16: uno de los trades sintéticos no tiene emoción.
UPDATE trades SET emotion_source = 'captured' WHERE emotion_before IS NOT NULL;
