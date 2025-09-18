-- Migration 013: Add draw_started_at column to bhishi_groups table
-- This enables real-time lucky draw spinner synchronization across all group members

-- Add draw_started_at timestamp column
ALTER TABLE bhishi_groups 
ADD COLUMN draw_started_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN bhishi_groups.draw_started_at IS 'Timestamp when admin starts lucky draw - used for real-time spinner synchronization across all group members';

-- Create index for efficient queries on draw_started_at
CREATE INDEX idx_bhishi_groups_draw_started_at ON bhishi_groups(draw_started_at) WHERE draw_started_at IS NOT NULL;

COMMIT;