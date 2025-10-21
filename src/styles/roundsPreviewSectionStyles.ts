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
  roundCount: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roundCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  
  // Content Styles
  content: {
    // Gap replaced with marginBottom on child elements
  },
  roundsList: {
    // Gap replaced with marginBottom on round items
  },
  
  // Round Preview Item
  roundPreviewItem: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  roundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.white,
  },
  roundDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  
  // Round Details
  roundDetails: {
    // Gap replaced with marginBottom on detail items
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  
  // Winner Section
  winnerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: Colors.warning + '10',
    padding: 6,
    borderRadius: 6,
  },
  winnerText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '500',
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
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});