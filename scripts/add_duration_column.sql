-- Add duration column to existing bookings table
-- Run this if you already have a bookings table

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS duration VARCHAR(10) DEFAULT '30min';

-- Update existing bookings to have 30min duration
UPDATE bookings 
SET duration = '30min' 
WHERE duration IS NULL;

