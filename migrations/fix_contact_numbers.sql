-- Migration: Fix contact numbers that contain :XX@lid metadata
-- Date: 2025-11-19
-- Description: Removes metadata from contact_number field (e.g. "254635809968349:20" -> "254635809968349")

-- Update conversations table to remove :XX metadata from contact numbers
UPDATE conversations
SET contact_number = split_part(contact_number, ':', 1)
WHERE contact_number LIKE '%:%';

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % conversation(s) with incorrect contact numbers', updated_count;
END $$;
