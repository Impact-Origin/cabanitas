-- Remove unique index to allow double bookings (2 people per time slot)
-- Each booking occupies 1 hour (current slot + next 30min slot)

DROP INDEX IF EXISTS idx_unique_booking;

