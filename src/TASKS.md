# Tasks & Specs

*Updated: 2025-10-20T20:09:16.863Z*

## 📋 Pending

### Database Schema for WhatsApp (technical)
ID: whatsapp-database

**User Story:** As a developer, I need database tables to store WhatsApp opt-in status and message logs

**Specs:**
- [ ] 1. Add profiles.whatsapp_opt_in boolean column (default false)
- [ ] 2. Create whatsapp_messages table with id, group_id, user_id, phone, template_name, template_params, provider_msg_id, status, attempts, error_message, created_at, processed_at
- [ ] 3. Add indexes on whatsapp_messages for group_id, user_id, status, created_at
- [ ] 4. Add RLS policies for whatsapp_messages table

### WhatsApp Edge Function (send-whatsapp) (feature)
ID: whatsapp-edge-function

**User Story:** As the system, I can send WhatsApp messages via Twilio to users who opted in

**Specs:**
- [ ] 1. Create send-whatsapp edge function with Twilio integration
- [ ] 2. Support type: single_whatsapp for immediate sends
- [ ] 3. Support type: group_whatsapp for enqueueing jobs
- [ ] 4. Use TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM env vars
- [ ] 5. Format phone numbers to E.164 (whatsapp:+91XXXXXXXXXX)
- [ ] 6. Support templates for lucky_draw_start, bidding_start, winner_declared
- [ ] 7. Log all sends to whatsapp_messages table

### WhatsApp Queue Worker (technical)
ID: whatsapp-worker

**User Story:** As the system, I can reliably process WhatsApp messages from queue with retries

**Specs:**
- [ ] 1. Create process-whatsapp-queue edge function
- [ ] 2. Process messages with status='pending' from whatsapp_messages
- [ ] 3. Implement concurrency limit (batch of 5 messages)
- [ ] 4. Retry logic: max 3 attempts with exponential backoff
- [ ] 5. Update status to 'sent', 'failed', or 'pending' with error logging
- [ ] 6. Store Twilio message SID in provider_msg_id field

### Update send-notifications for WhatsApp (feature)
ID: update-send-notifications

**User Story:** As the system, I automatically enqueue WhatsApp messages when events occur

**Specs:**
- [ ] 1. Add WhatsApp enqueueing for lucky_draw_start event
- [ ] 2. Add WhatsApp enqueueing for bidding_start event
- [ ] 3. Add WhatsApp enqueueing for winner_declared event
- [ ] 4. Only enqueue for users with whatsapp_opt_in=true AND phone number
- [ ] 5. Include template parameters (groupName, winnerName, amount, etc.)

### WhatsApp Opt-in UI (screen)
ID: frontend-opt-in

**User Story:** As a user, I can opt-in to receive WhatsApp notifications from my profile

**Specs:**
- [ ] 1. Add WhatsApp opt-in toggle in ProfileScreen
- [ ] 2. Save opt-in status to profiles.whatsapp_opt_in
- [ ] 3. Show explanation text about WhatsApp notifications
- [ ] 4. Validate phone number exists before allowing opt-in

### Admin View for Failed Messages (screen)
ID: admin-view

**User Story:** As an admin, I can view failed WhatsApp messages and retry them

**Specs:**
- [ ] 1. Create AdminMessagesScreen to list failed whatsapp_messages
- [ ] 2. Show member name, phone, error message, attempts
- [ ] 3. Add retry button for failed messages
- [ ] 4. Show list of members without phone or opt-in

## ✅ Completed

### Backend Infrastructure for Linking Invited Members (technical)
ID: task-invite-linking-backend

**User Story:** As a system, I need to automatically link non-registered members to their groups after they register

**Specs:**
- [x] 1. Create last_10_digits() SQL helper function to normalize phone comparison
- [x] 2. Create claim_group_invites_for_user() RPC function in Supabase
- [x] 3. Grant execute permission to authenticated users on RPC function
- [x] 4. Create utils/phone.ts with normalizePhone() helper function
- [ ] 5. Call RPC function during user registration flow (Task 2)

### Feature Flag Setup (technical)
ID: feature-flag

**User Story:** As a developer, I can toggle the old simultaneous draw behavior via feature flag

**Specs:**
- [ ] 1. Create config/featureFlags.ts with ENABLE_SIMULTANEOUS_DRAW = false
- [ ] 2. Document rollback procedure in flag file

### Lucky Draws List Screen (screen)
ID: screen-lucky-draws-list

**User Story:** As a user, I can see all active draws for my groups in one place

**Specs:**
- [ ] 1. Create LuckyDrawsListScreen.tsx with active draws list
- [ ] 2. Fetch active draws from draws table where revealed=false
- [ ] 3. Show empty state with 'No live draws' message + Browse Groups CTA
- [ ] 4. Display draw cards with group name, time remaining, prize amount
- [ ] 5. Tap card navigates to LuckyDrawScreen with drawId
- [ ] 6. Auto-refresh on screen focus, no continuous polling

### Lucky Draw Screen (Full-screen Spinner) (screen)
ID: screen-lucky-draw

**User Story:** As a user, I can experience the full-screen draw spinner with precise server timing

**Specs:**
- [ ] 1. Create LuckyDrawScreen.tsx accepting drawId param
- [ ] 2. Fetch draw data on mount from draws table
- [ ] 3. Calculate remainingMs from start_timestamp + duration_seconds
- [ ] 4. Reuse LuckyDrawSpinner component logic for animation
- [ ] 5. Block back button during animation (remainingMs > 1500)
- [ ] 6. Subscribe to realtime update for revealed=true
- [ ] 7. Show winner reveal with Close + View Group CTAs
- [ ] 8. Handle late-joiner case (remainingMs <= 1500) with immediate reveal

### Navigation Updates (technical)
ID: navigation-update

**User Story:** As a user, I can navigate to Lucky Draws via bottom tab

**Specs:**
- [ ] 1. Add 'Lucky Draws' tab to bottom navigation
- [ ] 2. Update MainTabsParamList type with LuckyDraws
- [ ] 3. Update RootStackParamList with LuckyDraw screen
- [ ] 4. Add deep linking config for app://lucky-draw/:drawId

### Gate Old Auto-Modal Behavior (technical)
ID: gate-old-behavior

**User Story:** As a developer, the old modal behavior is disabled but preserved for rollback

**Specs:**
- [ ] 1. Gate HomeScreen checkActiveDraws modal display with feature flag
- [ ] 2. Gate HomeScreen LuckyDrawHomeModal with feature flag
- [ ] 3. Gate GroupDetailScreen member spinner with feature flag
- [ ] 4. Gate HomeScreen activeDraws MemberDrawSpinner with feature flag

### Client Realtime Spinner Sync (feature)
ID: client-realtime-spinner

**User Story:** As a group member, I see the spinner modal appear instantly when admin starts draw

**Specs:**
- [ ] 1. Subscribe to draws table INSERT events for current group
- [ ] 2. Show spinner modal immediately on INSERT event (revealed=false)
- [ ] 3. Run spinner for duration_seconds from start_timestamp
- [ ] 4. On UPDATE event (revealed=true), show winner and allow close
- [ ] 5. Prevent modal from closing accidentally (only close after winner revealed)
- [ ] 6. Add minimize button to move modal to corner (optional)

### Server-Authoritative Draw - Database (technical)
ID: server-authoritative-draw-db

**User Story:** As a system, I need a draws table to track draw state and broadcast realtime events instantly

**Specs:**
- [ ] 1. Create migration for draws table with id, group_id, created_by, status, revealed, start_timestamp, duration_seconds, winner_user_id, winner_name
- [ ] 2. Add index on group_id for fast lookups
- [ ] 3. Add RLS policies for draws table (users can view draws for their groups)
- [ ] 4. Enable realtime for draws table in Supabase

### Server-Authoritative Draw - Logic (feature)
ID: server-authoritative-draw-logic

**User Story:** As an admin, when I start a draw, all members see the spinner instantly via realtime events

**Specs:**
- [ ] 1. Update conductLuckyDraw to INSERT draw record with revealed=false FIRST
- [ ] 2. Return draw metadata (drawId, startTimestamp, durationSeconds) to caller
- [ ] 3. Keep existing winner selection and notifications (but don't block on them)
- [ ] 4. Create finalizeDraw(drawId) function to set revealed=true (idempotent)
- [ ] 5. Call finalizeDraw after admin spinner completes

### Admin Business Logic (feature)
ID: dual-admin-logic

**User Story:** As a co-admin, I have full admin powers like the creator

**Specs:**
- [ ] 3.1. Replace all hardcoded admin checks with isGroupAdmin()
- [ ] 3.2. Add appointCoAdmin() function to chitStore
- [ ] 3.3. Add removeCoAdmin() function to chitStore
- [ ] 3.4. Auto-clear co_admin_id when co-admin leaves group
- [ ] 3.5. Add toast notifications for admin changes

### Dual Admin Infrastructure (technical)
ID: dual-admin-infrastructure

**User Story:** As a developer, I need core infrastructure for dual admin support

**Specs:**
- [ ] 1.1. Update ChitGroup interface with co_admin_id field
- [ ] 1.2. Create isGroupAdmin() utility helper function
- [ ] 1.3. Create AdminBadge component for showing admin roles

### Admin Management UI (feature)
ID: dual-admin-ui

**User Story:** As a group creator, I can appoint and manage a co-admin

**Specs:**
- [ ] 2.1. Create AdminManagementModal for appointing/removing co-admin
- [ ] 2.2. Add admin management section to GroupDetailScreen
- [ ] 2.3. Add admin management section to BiddingGroupDetailScreen
- [ ] 2.4. Show admin badges in member lists

### SMS Notifications for Pending Members (feature)
ID: task-4-sms-pending

**User Story:** As a pending (unregistered/iPhone) member, I can win lucky draws and receive SMS notifications about group activity

**Specs:**
- [x] 4.1. Update lucky draw eligibility in chitStore.ts to include status IN ('active', 'pending')
- [x] 4.2. Add notification_preference column to group_members for future SMS opt-in/opt-out
- [x] 4.3. Add SMS deduplication logic with 1-minute window in send-sms edge function
- [x] 4.4. Update GroupDetailScreen UI to show pending members as eligible
- [x] 4.5. Verify SMS sends to ALL members (active + pending) with phone numbers

### Fix Lucky Draw for Unregistered Members (DB + Store) (technical)
ID: fix-unregistered-winners-db

**User Story:** As a system, I can record lucky draw wins for both registered and unregistered members without failing

**Specs:**
- [x] 1.1. Add winner_member_id column to draw_history (references group_members.id)
- [x] 1.2. Make winner_id (user_id) nullable in draw_history
- [x] 1.3. Update conductLuckyDrawWithWinner to include winner_member_id
- [x] 1.4. Update conductLuckyDraw to include winner_member_id
- [x] 1.5. Update selectManualWinner to include winner_member_id
- [x] 1.6. Backfill existing records with winner_member_id

### SMS Cost Optimization & English-Only Messages (technical)
ID: sms-optimization

**User Story:** As a business owner, I want to reduce SMS costs by sending English-only messages to unregistered members only

**Specs:**
- [x] 1. Whitelist only 4 SMS events: OTP, lucky_draw_winner, group_joined, bidding_start
- [x] 2. Add user_id IS NULL filtering for group SMS to only target unregistered members
- [x] 3. Replace all Hindi/Devanagari templates with English GSM-7 messages under 160 chars
- [x] 4. Add adminName personalization for group_joined and bidding_start events
- [x] 5. Update notificationUtils to fetch and pass adminName to SMS function
- [x] 6. Add comprehensive logging for cost tracking and debugging

