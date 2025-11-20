-- Migration 014: Add Bidding System to Bhishi App
-- This migration adds bidding support alongside existing lucky draw system

-- Step 1: Add group_type field to existing bhishi_groups table
ALTER TABLE bhishi_groups 
ADD COLUMN group_type VARCHAR(20) DEFAULT 'lucky_draw';

-- Add constraint to ensure valid group types
ALTER TABLE bhishi_groups 
ADD CONSTRAINT group_type_check 
CHECK (group_type IN ('lucky_draw', 'bidding'));

-- Add comment for documentation
COMMENT ON COLUMN bhishi_groups.group_type IS 'Type of bhishi group: lucky_draw (traditional random selection) or bidding (lowest bid wins)';

-- Step 2: Create bid_rounds table for managing bidding rounds
CREATE TABLE bid_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES bhishi_groups(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  minimum_bid INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES group_members(id),
  winning_bid INTEGER,
  prize_amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint for valid bid round statuses
ALTER TABLE bid_rounds 
ADD CONSTRAINT bid_round_status_check 
CHECK (status IN ('open', 'active', 'closed', 'completed'));

-- Step 3: Create member_bids table for tracking individual bids
CREATE TABLE member_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES bid_rounds(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
  bid_amount INTEGER NOT NULL,
  bid_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes for better performance
CREATE INDEX idx_bhishi_groups_group_type ON bhishi_groups(group_type);
CREATE INDEX idx_bid_rounds_group_id ON bid_rounds(group_id);
CREATE INDEX idx_bid_rounds_status ON bid_rounds(status);
CREATE INDEX idx_bid_rounds_round_number ON bid_rounds(group_id, round_number);
CREATE INDEX idx_member_bids_round_id ON member_bids(round_id);
CREATE INDEX idx_member_bids_member_id ON member_bids(member_id);
CREATE INDEX idx_member_bids_bid_time ON member_bids(bid_time);

-- Step 5: Create updated_at trigger for bid_rounds
CREATE TRIGGER update_bid_rounds_updated_at
  BEFORE UPDATE ON bid_rounds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Create function to automatically close expired bidding rounds
CREATE OR REPLACE FUNCTION close_expired_bid_rounds()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Close rounds where end_time has passed and status is still 'active'
  UPDATE bid_rounds 
  SET status = 'closed', updated_at = NOW()
  WHERE status = 'active' 
    AND end_time IS NOT NULL 
    AND end_time <= NOW();
END;
$$;

-- Step 7: Create function to get current lowest bid for a round
CREATE OR REPLACE FUNCTION get_current_lowest_bid(round_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  lowest_bid INTEGER;
BEGIN
  SELECT MIN(bid_amount)
  INTO lowest_bid
  FROM member_bids 
  WHERE round_id = round_uuid 
    AND is_active = true;
    
  RETURN COALESCE(lowest_bid, 999999999); -- Return very high number if no bids
END;
$$;

-- Step 8: Create function to determine round winner (lowest bid wins)
CREATE OR REPLACE FUNCTION determine_round_winner(round_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  winner_member_id UUID;
  lowest_amount INTEGER;
BEGIN
  -- Find the lowest bid amount
  SELECT MIN(bid_amount)
  INTO lowest_amount
  FROM member_bids
  WHERE round_id = round_uuid 
    AND is_active = true;
  
  -- If no bids, return NULL
  IF lowest_amount IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get the member with the lowest bid (first one if tied)
  SELECT member_id
  INTO winner_member_id
  FROM member_bids
  WHERE round_id = round_uuid 
    AND bid_amount = lowest_amount 
    AND is_active = true
  ORDER BY bid_time ASC -- First bid wins in case of tie
  LIMIT 1;
  
  RETURN winner_member_id;
END;
$$;

-- Step 9: Create RLS policies for bidding tables

-- Policies for bid_rounds
ALTER TABLE bid_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group creators and members can view bid rounds"
  ON bid_rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bhishi_groups bg
      WHERE bg.id = bid_rounds.group_id
      AND (bg.created_by = auth.uid() OR bg.id IN (
        SELECT group_id FROM group_members 
        WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Only group creators can manage bid rounds"
  ON bid_rounds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bhishi_groups bg
      WHERE bg.id = bid_rounds.group_id
      AND bg.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bhishi_groups bg
      WHERE bg.id = bid_rounds.group_id
      AND bg.created_by = auth.uid()
    )
  );

-- Policies for member_bids
ALTER TABLE member_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view all bids in their rounds"
  ON member_bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bid_rounds br
      JOIN bhishi_groups bg ON bg.id = br.group_id
      WHERE br.id = member_bids.round_id
      AND (bg.created_by = auth.uid() OR bg.id IN (
        SELECT group_id FROM group_members 
        WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Group members can only insert their own bids"
  ON member_bids FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN bid_rounds br ON br.group_id = gm.group_id
      WHERE br.id = member_bids.round_id
      AND gm.user_id = auth.uid()
      AND gm.id = member_bids.member_id
    )
  );

CREATE POLICY "Users can update their own bids"
  ON member_bids FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.id = member_bids.member_id
      AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.id = member_bids.member_id
      AND gm.user_id = auth.uid()
    )
  );

-- Step 10: Add helpful comments
COMMENT ON TABLE bid_rounds IS 'Stores bidding rounds for bhishi groups with bidding type';
COMMENT ON TABLE member_bids IS 'Stores individual member bids within bidding rounds';
COMMENT ON FUNCTION get_current_lowest_bid(UUID) IS 'Returns the current lowest bid amount for a given round';
COMMENT ON FUNCTION determine_round_winner(UUID) IS 'Determines the winner of a bidding round (lowest bid wins)';
COMMENT ON FUNCTION close_expired_bid_rounds() IS 'Automatically closes bidding rounds that have passed their end time';

-- Migration complete