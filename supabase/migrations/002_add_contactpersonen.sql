-- Add contactpersonen JSON column to klanten
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS contactpersonen JSONB;
