import { StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export const createStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Colors.shadow,
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  memberCount: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  
  // Content Styles
  content: {
    // Gap replaced with marginBottom on child elements
  },
  membersList: {
    // Gap replaced with marginBottom on member items
  },
  
  // Member Preview Item
  memberPreviewItem: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  winnerMemberItem: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '05',
  },
  creatorMemberItem: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warning + '05',
  },
  memberInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  memberBadges: {
    flexDirection: 'row',
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.warning,
  },
  winnerBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.success,
  },
  memberContact: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  
  // View All Button
  viewAllButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});