-- Migration: Create draws table for server-authoritative lucky draw timing
-- Purpose: Decouple "draw started" from "winner revealed" for instant realtime broadcasting
-- This enables all members to see the spinner instantly (< 500ms) via Postgres realtime events

-- Create draws table
CREATE TABLE IF NOT EXISTS draws (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES bhishi_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Draw timing and status
  status TEXT DEFAULT 'pending_reveal' CHECK (status IN ('pending_reveal', 'revealed', 'finalized', 'cancelled')),
  revealed BOOLEAN DEFAULT false,
  start_timestamp TIMESTAMPTZ DEFAULT now(),
  duration_seconds INTEGER DEFAULT 12,
  
  -- Prize and winner information
  prize_amount BIGINT,
  winner_user_id UUID REFERENCES profiles(id),
  winner_name TEXT,
  round_number INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ NULL,
  
  -- Constraints
  CONSTRAINT valid_duration CHECK (duration_seconds > 0 AND duration_seconds <= 60),
  CONSTRAINT winner_set_when_revealed CHECK (
    (revealed = false) OR (revealed = true AND winner_user_id IS NOT NULL)
  )
);

-- Create indexes for fast lookups
CREATE INDEX idx_draws_group_id ON draws(group_id);
CREATE INDEX idx_draws_revealed ON draws(revealed);
CREATE INDEX idx_draws_created_at ON draws(created_at DESC);
CREATE INDEX idx_draws_status ON draws(status);

-- Composite index for active draws lookup
CREATE INDEX idx_draws_active ON draws(group_id, revealed, created_at DESC) 
  WHERE revealed = false;

-- Enable Row Level Security
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view draws for groups they're members of
CREATE POLICY "Users can view draws for their groups"
  ON draws
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = draws.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Policy: Group admins (creator or co-admin) can insert draws
CREATE POLICY "Group admins can create draws"
  ON draws
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bhishi_groups
      WHERE bhishi_groups.id = draws.group_id
      AND (bhishi_groups.created_by = auth.uid() OR bhishi_groups.co_admin_id = auth.uid())
    )
  );

-- Policy: Group admins can update draws (for finalization)
CREATE POLICY "Group admins can update draws"
  ON draws
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bhishi_groups
      WHERE bhishi_groups.id = draws.group_id
      AND (bhishi_groups.created_by = auth.uid() OR bhishi_groups.co_admin_id = auth.uid())
    )
  );

-- Enable realtime for instant broadcasting
-- Note: Realtime is controlled in Supabase dashboard, but this table structure supports it

-- Add comment for documentation
COMMENT ON TABLE draws IS 'Server-authoritative lucky draw events for instant realtime synchronization';
COMMENT ON COLUMN draws.revealed IS 'False during spinner animation, true after winner is revealed';
COMMENT ON COLUMN draws.start_timestamp IS 'When the draw started (for calculating spinner duration)';
COMMENT ON COLUMN draws.duration_seconds IS 'How long the spinner should run (default 12s)';
