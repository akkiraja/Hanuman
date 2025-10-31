/**
 * Feature Flags Configuration
 * 
 * This file controls feature toggles for the application.
 * Use flags to enable/disable features without code changes.
 */

/**
 * ENABLE_SIMULTANEOUS_DRAW
 * 
 * Controls the old auto-modal lucky draw spinner behavior where:
 * - Members see automatic modal popups when admin starts a draw
 * - HomeScreen auto-shows LuckyDrawHomeModal for active draws
 * - GroupDetailScreen auto-shows MemberDrawSpinner for active draws
 * 
 * When FALSE (current): Users navigate to "Lucky Draws" tab for deterministic draw experience
 * When TRUE: Old behavior with automatic modal popups (can be inconsistent)
 * 
 * ROLLBACK PROCEDURE:
 * 1. Set this flag to TRUE
 * 2. Test that modals appear automatically on HomeScreen
 * 3. Deploy and monitor for consistency issues
 * 
 * Default: false (new deterministic tab-based approach)
 */
export const ENABLE_SIMULTANEOUS_DRAW = false;
