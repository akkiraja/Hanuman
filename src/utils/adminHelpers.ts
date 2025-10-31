import { ChitGroup } from '../types/chitFund';

/**
 * Check if a user is an admin (creator or co-admin) of a group
 * @param userId - User ID to check
 * @param group - Group to check admin status for
 * @returns true if user is creator or co-admin
 */
export function isGroupAdmin(userId: string | null | undefined, group: ChitGroup | null | undefined): boolean {
  if (!userId || !group) return false;
  return userId === group.createdBy || userId === group.co_admin_id;
}

/**
 * Check if a user is the primary creator of a group
 * @param userId - User ID to check
 * @param group - Group to check creator status for
 * @returns true if user is the original creator
 */
export function isGroupCreator(userId: string | undefined, group: ChitGroup | null | undefined): boolean {
  if (!userId || !group) return false;
  return userId === group.createdBy;
}

/**
 * Check if a user is the co-admin of a group
 * @param userId - User ID to check
 * @param group - Group to check co-admin status for
 * @returns true if user is the appointed co-admin
 */
export function isGroupCoAdmin(userId: string | undefined, group: ChitGroup | null | undefined): boolean {
  if (!userId || !group) return false;
  return group.co_admin_id !== null && userId === group.co_admin_id;
}

/**
 * Get admin role label for UI display
 * @param userId - User ID to check
 * @param group - Group to check role for
 * @returns 'Creator', 'Co-Admin', or null
 */
export function getAdminRole(userId: string | undefined, group: ChitGroup | null | undefined): 'Creator' | 'Co-Admin' | null {
  if (!userId || !group) return null;
  if (userId === group.createdBy) return 'Creator';
  if (userId === group.co_admin_id) return 'Co-Admin';
  return null;
}
