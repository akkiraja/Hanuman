-- Create payment_audit table for tracking payment mappings and webhook payloads
CREATE TABLE IF NOT EXISTS payment_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT NOT NULL UNIQUE, -- Cashfree order_id for mapping
    group_id UUID NOT NULL REFERENCES bhishi_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Payment amount in paisa
    status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, expired
    payment_link TEXT, -- Cashfree payment link URL
    webhook_payload JSONB, -- Raw webhook payload for audit
    webhook_received_at TIMESTAMPTZ, -- When webhook was received
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_payment_audit_order_id ON payment_audit(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_group_user ON payment_audit(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_status ON payment_audit(status);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created_at ON payment_audit(created_at);

-- Enable RLS
ALTER TABLE payment_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own payment audit records
CREATE POLICY "Users can view own payment audit" ON payment_audit
    FOR SELECT USING (user_id = auth.uid());

-- Group creators can view all payment audit records for their groups
CREATE POLICY "Group creators can view group payment audit" ON payment_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bhishi_groups 
            WHERE bhishi_groups.id = payment_audit.group_id 
            AND bhishi_groups.created_by = auth.uid()
        )
    );

-- Only backend functions can insert/update payment audit records
CREATE POLICY "Backend can manage payment audit" ON payment_audit
    FOR ALL USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_audit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_audit_updated_at
    BEFORE UPDATE ON payment_audit
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_audit_updated_at();