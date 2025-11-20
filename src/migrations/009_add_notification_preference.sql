-- Add notification_preference column to group_members table
-- This allows members to control SMS/WhatsApp notification preferences in the future
-- DEFAULT 'auto' means all members will automatically receive notifications unless they opt out

ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS notification_preference TEXT DEFAULT 'auto';

-- Add comment explaining the column
COMMENT ON COLUMN group_members.notification_preference IS 'Controls notification delivery preference: auto (default, send all), sms_only, push_only, none';

-- Create index for efficient filtering by preference
CREATE INDEX IF NOT EXISTS idx_group_members_notification_preference 
ON group_members(notification_preference) 
WHERE notification_preference != 'auto';

-- No data migration needed - existing records will automatically use DEFAULT 'auto'
