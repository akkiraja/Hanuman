-- Migration: Make email optional in group_members table for OTP-only users
-- Date: 2025-07-26
-- Purpose: Support users who sign up with phone/OTP only (no email required)

-- Make email column nullable in group_members table
ALTER TABLE group_members 
ALTER COLUMN email DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN group_members.email IS 'Email address (optional) - nullable to support OTP-only users';

-- Update existing records with empty emails to NULL for consistency
UPDATE group_members 
SET email = NULL 
WHERE email = '' OR email IS NULL;

COMMIT;