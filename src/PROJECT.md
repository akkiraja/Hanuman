# PROJECT CONTEXT

<!-- METADATA_START -->
Last-Summarized-Message: none
Last-Updated: 2025-10-20T20:09:55.082Z
Summarization-Version: 1.0
<!-- METADATA_END -->

## DECISION TREE
<!-- DECISION_TREE_START -->
Bhishi App
├── [2025-06-21] Product is an app for managing Bhishi (committee) groups in India
├── [2025-06-21] Users can form groups (bhishi), decide monthly amount, lucky draw date, and transfer money
├── [2025-06-21] Lucky draw winner is selected randomly from group members
├── [2025-06-21] Admin can create groups, add members from contacts or platform users
├── [2025-06-21] Dashboard shows groups and allows navigation to group page for lucky draw
├── [2025-06-21] Group page shows members, winners, pending members, and allows admin to conduct lucky draw anytime
├── [2025-06-21] Integration with Supabase for backend data storage
├── [2025-07-04] Push notifications to remind users about payments and events
├── [2025-07-05] Login with OTP using Supabase and Twilio integration
├── [2025-07-13] After OTP verification, new users must enter their name to complete profile
├── [2025-07-18] Dashboard UI includes sections educating users about Bhishi names across India and benefits
├── [2025-07-19] Notifications content updated for better engagement and multiple reminders
├── [2025-08-06] Integration of Cashfree payment gateway for payments (test mode)
├── [2025-08-09] Lucky draw broadcasting feature with spinner animation for all group members on dashboard
├── [2025-08-22] Addition of bidding system as second type of Bhishi group
├── [2025-08-30] Bidding system includes creating rounds, placing bids, closing rounds, and declaring winners
├── [2025-09-01] Admin and members can place bids; live bidding feed and real-time updates
└── [2025-09-01] Various UI/UX improvements and bug fixes throughout the app
├── [2025-09-01T18:37:21.098Z] Enhanced Place Bid functionality with proper error handling, bid validation for updates (lower amount only), and improved Supabase query formatting
├── [2025-09-01T18:57:08.470Z] Fixed member_bids RLS policies to allow group members to place bids by adding user_id field and creating proper security policies
├── [2025-09-01T19:21:28.883Z] Fixed React hooks order violation by ensuring all hooks are called before any conditional logic or early returns
├── [2025-09-01T20:39:13.890Z] Fixed member bidding by using direct database lookup instead of currentGroup.members to avoid RLS policy restrictions
├── [2025-09-01T20:41:52.730Z] Fixed Update Bid functionality by implementing proper conditional logic to call updateBid() for existing bids and placeBid() for new bids
├── [2025-09-01T21:27:49.720Z] Restructured BiddingRoundScreen layout with sticky bid entry at bottom, modular components, and improved visual hierarchy for better user experience
├── [2025-09-02T15:56:37.610Z] Restructured BiddingGroupDetailScreen with modular components, clean hierarchy, admin-only round creation, and removed unnecessary sections for better performance and UX
├── [2025-09-03T14:09:25.458Z] Refactored BiddingGroupDetailScreen to use preview-only sections for scalability, creating dedicated GroupMembersScreen and PastRoundsScreen for full data display
├── [2025-09-03T20:02:19.692Z] Fixed authentication issue causing HTTP 406 errors for non-admin users accessing group data
├── [2025-09-03T20:12:21.108Z] Added authentication checks to all functions querying RLS-protected tables to prevent 406 errors for non-admin users.
├── [2025-09-04T04:07:31.334Z] Implemented progressive loading strategy for BiddingGroupDetailScreen to match GroupDetailScreen performance
├── [2025-09-04T18:21:59.384Z] Streamlined round creation: use group pool amount as prize, ask for bidding duration instead, auto-start live bidding immediately
├── [2025-09-04T18:21:59.384Z] Streamlined round creation: use group pool amount as prize, ask for bidding duration instead, auto-start live bidding immediately
├── [2025-09-04T19:00:00.000Z] Redesign BiddingRoundScreen to focus on Live Bidding Feed with minimal timer, compact lowest bid banner, unobtrusive admin controls, and fixed bid entry alignment.
├── [2025-09-07T05:49:37.961Z] Adopt real-time bidding feed with live subscription to member_bids table for instant INSERT and UPDATE event handling to provide seamless live bidding updates.
├── [2025-09-07T08:00:00.000Z] Added manual refresh button to Live Bidding Feed to allow users to manually update bids when real-time updates fail.
├── [2025-09-07T13:22:58.206Z] Updated bhishi_groups.current_round field after creating new rounds to fix round numbering bug so that round cards display correct sequential round numbers.
├── [2025-09-07T13:22:58.206Z] Updated bhishi_groups.current_round field after creating new rounds to fix round numbering bug so that round cards display correct sequential round numbers.
├── [2025-09-07T14:25:14.120Z] Fixed date handling in RoundsPreviewSection by properly converting string dates to Date objects before calling toLocaleDateString()
├── [2025-09-07T14:30:00.000Z] Redesigned bidding group cards to have consistent layout and styling with lucky draw cards, adding a 'Bidding' tag with gavel icon for clear visual differentiation
├── [2025-09-07T14:35:00.000Z] Fixed Overview section card text overflow by reducing font sizes, adding ellipsis handling, and improving text centering to ensure proper fit within card boundaries
├── [2025-09-07T14:40:00.000Z] Optimized Overview section cards with 8px uniform padding, 120px fixed height, 4px vertical gaps, improved vertical centering, and better ellipsis handling for consistent and compact layout
├── [2025-09-10T13:33:09.488Z] Implemented a business rule that previous round winners cannot place bids in future rounds unless admin allows multiple wins.
├── [2025-09-21T05:47:38.243Z] Added push notifications for bidding events including round start, bid placed, bid updated, and winner declared with Hinglish message templates and smart recipient filtering.
├── [2025-01-10T00:00:00Z] Implemented dual admin system allowing group creators to appoint one co-admin with full admin powers for both lucky draw and bidding groups
├── [2025-01-10T00:00:00Z] Implemented hybrid realtime approach: use bhishi_groups table (realtime already enabled) as instant trigger via draw_started_at field changes, then fetch full draw details from draws table with retry logic to handle race conditions
├── [2025-01-10T00:00:00Z] Updated lucky draw spinner duration from 12 seconds to 60 seconds globally: client components (LuckyDrawSpinner, MemberDrawSpinner), server draw creation (chitStore), and database default (draws.duration_seconds). Also increased max constraint to 120 seconds.
├── [2025-01-10T00:00:00Z] Implemented SMS notifications for 7 events (lucky_draw_started, winner_declared, draw_completed, group_joined, payment_reminder, live_bidding_started, bid_placed) using user's exact Hinglish templates with placeholders. All SMS sends are non-blocking with try-catch, use E.164 phone format, skip invalid numbers, and include app_link https://bhishi.app. SMS failures log warnings but don't break push notifications.
├── [2025-01-10T00:00:00Z] Updated all push notification title/body templates with high-energy Hinglish copy distinct from SMS templates. Covers 9 events: lucky_draw_started, live_bidding_started, bid_placed, bid_updated, winner_declared, draw_completed, group_joined, payment_reminder (3 variants: 3-day, 1-day, day-of), payment_marked_done. All data payloads, routing, SMS templates, and error handling remain unchanged. Push notifications now use exciting Hinglish language optimized for user engagement.
├── [2025-01-10T00:00:00Z] Implemented Android heads-up notifications by creating high-importance notification channel (channelId: 'default', importance: MAX) in notificationService.ts initialize() method, and updating all push notification payloads in send-notifications/index.ts to include priority, sound, and android.channelId fields. High-attention events (lucky_draw_started, live_bidding_started, winner_declared, payment_reminder day-of/1-day) use priority:'high' and android.priority:'max' for heads-up banner display.
├── [2025-01-12T00:00:00Z] Implemented deterministic lucky draw system with dedicated tab-based navigation instead of auto-modal popups
├── [2025-01-16T00:00:00Z] Removed UPI ID step from Create Bhishi flow to reduce user drop-off during group creation. Draw Date is now the final step.
├── [2025-10-16T15:33:31.796Z] Pending (unregistered/iPhone) members can now win lucky draws and receive SMS notifications with deduplication and future opt-in/out control via notification_preference column.
├── [2025-10-20T15:00:00.000Z] Implemented automatic invite linking: When contacts are added to groups before registering, the system now automatically links them to their groups after registration by matching phone numbers (last 10 digits) via Supabase RPC function
<!-- DECISION_TREE_END -->

## PROJECT SPECIFICATIONS
<!-- PROJECT_SPECS_START -->
1. CORE FEATURES
- Create Bhishi groups with name, monthly amount, draw date, and members
- Add group members from phone contacts and platform users
- Conduct lucky draw selecting random winner; admin can trigger anytime
- Show members list with status (winner or pending)
- Store data in Supabase tables: bhishi_groups, group_members, profiles
- Login with OTP via Supabase and Twilio
- Push notifications for payment reminders, lucky draw start, winner announcement, and payment received
- Payment integration using Cashfree payment gateway (test mode)
- Lucky draw spinner animation broadcasted to all group members on dashboard
- Bidding system implementation with rounds, bids, winners

2. USER FLOWS
- User creates group via multi-step form: group name, monthly amount, add members (contacts/platform users), draw date
- Admin can view group details, conduct lucky draw, add members later
- Members can mark payment done; admin and members see payment status
- OTP login flow: enter phone, send OTP, verify OTP, new users enter name, then dashboard
- Admin and members participate in bidding rounds; place and update bids
- Notifications sent automatically based on events
- Payment flow via Cashfree from dashboard testing screen

3. BUSINESS RULES
- Minimum 2 members to create group initially, later removed to allow group creation without members
- Group members limit increased to 40 (later 25 for some requests)
- Payment buttons and toggles appear 5 days before draw date and disappear after draw
- Payment reminder notifications start 3 days before draw date and stop after payment marked done
- Lucky draw winner removed from pending list after winning
- Admin can move members from pending to winners manually
- Group deletion removes all related data
- Push tokens stored per user and device type; notifications sent to all eligible members
- Bidding rounds auto-close on timer; lowest unique bid wins
- Admin can participate in bidding

4. UI/UX REQUIREMENTS
- Multi-step form for group creation with good UI
- Dashboard with plus icon for creating groups
- Group page with clear alignment showing winners and pending members with trophy icons
- Profile page with logout and editable name and UPI ID
- Tutorials page embedding YouTube videos
- Notifications with engaging content and proper formatting
- Dashboard sections: "Known by many names across India", "Vissi App ke Fayde" with proper spacing and font sizes
- Compact, modern overview cards with icons on dashboard
- View Details button as full-width footer bar on group cards
- Spinner animation for lucky draw with 30-second suspense
- Bidding screens separated into overview and live bidding with real-time updates
- Proper error handling and loading states
- Deep linking for payment success
- Share app section on profile and add members screens
- Refresh contacts list with loading spinner
- Consistent font sizes, colors, and spacing across app

All points are explicitly stated in user messages and reflect the current state and requirements of the Bhishi app project.
- Preview-only BiddingGroupDetailScreen optimized for performance with large datasets
- Progressive loading strategy for BiddingGroupDetailScreen: critical group details load first, followed by current round data and background loading of user bids and history
- CreateRoundModal now asks for bidding duration (hours) instead of prize amount
- CreateRoundModal now asks for bidding duration (hours) instead of prize amount
- BiddingRoundScreen redesigned with Live Bidding Feed as primary focus
- Minimal timer display with small font and subtle styling
- Compact lowest bid banner as floating badge above feed
- Small, unobtrusive admin controls in horizontal layout
- Fixed bid entry button alignment with consistent sizing
- Clean, focused UI with reduced padding and removed large cards
- Real-time bidding feed with instant updates on new bid placement
- Manual refresh button in Live Bidding Feed header next to LIVE indicator
- Round cards now display correct sequential round numbers (Round 1, Round 2, Round 3, etc.) instead of always showing 'Round 1'.
- Round cards now display correct sequential round numbers (Round 1, Round 2, Round 3, etc.) instead of always showing 'Round 1'.
- Push notifications for bidding events with Hinglish messages
- Dual admin system allowing group creators to appoint a co-admin with full admin powers for both lucky draw and bidding groups
- Hybrid realtime approach for lucky draw synchronization using bhishi_groups table as trigger and draws table for full details
- SMS notification system for 7 key events with Hinglish templates and robust error handling
- Push notifications updated with distinct high-energy Hinglish copy for 9 key events to improve user engagement.
- Android heads-up notifications with high-importance channel and high-priority push payloads for urgent events
- Deterministic Lucky Draw system with dedicated Lucky Draws tab for consistent user experience
- Pending (unregistered/iPhone) members can win lucky draws and receive SMS notifications with deduplication and opt-in/out control
- Automatic linking of pre-invited contacts to their groups upon user registration by matching phone numbers.
<!-- PROJECT_SPECS_END -->
