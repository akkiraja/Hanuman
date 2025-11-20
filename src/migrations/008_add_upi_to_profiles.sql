-- Add UPI ID field to profiles table
ALTER TABLE profiles ADD COLUMN upi_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.upi_id IS 'User UPI ID for payments (e.g., user@paytm, user@gpay)';
