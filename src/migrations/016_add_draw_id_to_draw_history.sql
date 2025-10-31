-- Migration: Add draw_id column to draw_history table
-- Purpose: Link draw_history records with draws table for server-authoritative draw system
-- Date: 2025-01-19

-- Add draw_id column to draw_history table
-- Nullable because existing records won't have draw_id
-- References draws(id) with SET NULL on delete (preserve history even if draw record is deleted)
ALTER TABLE draw_history 
ADD COLUMN IF NOT EXISTS draw_id uuid REFERENCES draws(id) ON DELETE SET NULL;

-- Add index for faster lookups when querying draw history by draw_id
CREATE INDEX IF NOT EXISTS idx_draw_history_draw_id ON draw_history(draw_id);

-- Add comment for documentation
COMMENT ON COLUMN draw_history.draw_id IS 'Foreign key to draws table - links draw history to server-authoritative draw record';
