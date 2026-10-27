-- Adiciona valor 'Cotando' ao enum status_item_compra (faltava na VPS inicial).
-- Idempotente.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'status_item_compra'
      AND e.enumlabel = 'Cotando'
  ) THEN
    ALTER TYPE public.status_item_compra ADD VALUE 'Cotando' AFTER 'Pendente';
  END IF;
END
$$;
