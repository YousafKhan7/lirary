-- Migration to add father_name and address fields to students table
-- Run this SQL in your Supabase SQL Editor

-- Add father_name column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS father_name TEXT;

-- Add address column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Update existing records to have empty strings instead of NULL (optional)
UPDATE students 
SET father_name = '' 
WHERE father_name IS NULL;

UPDATE students 
SET address = '' 
WHERE address IS NULL;

-- Add comments to document the new columns
COMMENT ON COLUMN students.father_name IS 'Father or guardian name of the student';
COMMENT ON COLUMN students.address IS 'Complete residential address of the student';
