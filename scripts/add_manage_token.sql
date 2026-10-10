-- Add manage_token column to bookings
-- Permite ao cliente remarcar/cancelar a partir do link do email, sem telefonar.
-- Correr uma vez na base de dados existente (Neon).

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS manage_token VARCHAR(64);

-- Gerar token para as marcações que já existem, para que os emails de lembrete
-- também passem a ter o link. gen_random_uuid() existe no PostgreSQL 13+.
UPDATE bookings
SET manage_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE manage_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_manage_token ON bookings(manage_token);

COMMENT ON COLUMN bookings.manage_token IS 'Token secreto para o cliente remarcar/cancelar via link do email';
