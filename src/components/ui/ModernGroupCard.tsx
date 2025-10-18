import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Users, IndianRupee, Calendar, CreditCard, CheckCircle, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';
import { useTranslation } from '../../constants/translations';
import { Colors } from '../../constants/colors';
import { ChitGroup, BidRound } from '../../types/chitFund';
import BiddingGroupCard from './BiddingGroupCard';

interface ModernGroupCardProps {
  group: ChitGroup;
  paymentStatus: string;
  isAdmin: boolean;
  isInPaymentWindow: boolean;
  onPress: () => void;
  onPayment: () => void;
  onTogglePaymentStatus: () => void;
  currentRound?: BidRound;
  userHasBid?: boolean;
  userBidAmount?: number;
}

export default function ModernGroupCard({
  group,
  paymentStatus,
  isAdmin,
  isInPaymentWindow,
  onPress,
  onPayment,
  onTogglePaymentStatus,
  currentRound,
  userHasBid,
  userBidAmount
}: ModernGroupCardProps) {
  const { t } = useTranslation();
  
  // For bidding groups, use the specialized BiddingGroupCard
  if (group.groupType === 'bidding') {
    return (
      <BiddingGroupCard
        group={group}
        currentRound={currentRound}
        onPress={onPress}
        isAdmin={isAdmin}
        userHasBid={userHasBid}
        userBidAmount={userBidAmount}
      />
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'forming': return Colors.warning;
      case 'active': return Colors.success;
      case 'completed': return Colors.textSecondary;
      default: return Colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'forming': return t('forming');
      case 'active': return t('active');
      case 'completed': return t('completed');
      default: return status;
    }
  };

  return (
    <View style={[styles.card, Colors.shadow]}>
      <TouchableOpacity style={styles.cardContent} onPress={onPress}>
        {/* Header with gradient background */}
        <View style={[styles.cardHeader, { backgroundColor: getStatusColor(group.status) + '10' }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupDescription}>{group.description}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(group.status) }]}>
            <Text style={styles.statusText}>{getStatusText(group.status)}</Text>
          </View>
        </View>
        
        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <View style={[styles.iconWrapper, { backgroundColor: Colors.money + '20' }]}>
                <IndianRupee size={16} color={Colors.money} />
              </View>
              <View>
                <Text style={styles.detailValue}>₹{group.monthlyAmount.toLocaleString()}</Text>
                <Text style={styles.detailLabel}>per {t('month')}</Text>
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <View style={[styles.iconWrapper, { backgroundColor: Colors.primary + '20' }]}>
                <Users size={16} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.detailValue}>{group.currentMembers}/40</Text>
                <Text style={styles.detailLabel}>{t('members')}</Text>
              </View>
            </View>
            
            {group.status === 'active' && (
              <View style={styles.detailItem}>
                <View style={[styles.iconWrapper, { backgroundColor: Colors.warning + '20' }]}>
                  <Calendar size={16} color={Colors.warning} />
                </View>
                <View>
                  <Text style={styles.detailValue}>{format(new Date(group.nextDrawDate), 'MMM dd')}</Text>
                  <Text style={styles.detailLabel}>{t('next')} draw</Text>
                </View>
              </View>
            )}
          </View>
          
        </View>
      </TouchableOpacity>
      
      {/* View Details Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.viewDetailsButton} 
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.viewDetailsButtonText}>{t('viewDetails')}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Payment Section */}
      {group.status === 'active' && isInPaymentWindow && (
        <View style={styles.paymentSection}>
          {/* Payment Status Toggle */}
          <TouchableOpacity
            style={[
              styles.paymentToggle,
              paymentStatus === 'paid' && styles.paymentTogglePaid
            ]}
            onPress={onTogglePaymentStatus}
          >
            {paymentStatus === 'paid' ? (
              <CheckCircle size={18} color={Colors.success} />
            ) : (
              <View style={styles.uncheckedCircle} />
            )}
            <Text style={[
              styles.paymentToggleText,
              paymentStatus === 'paid' && styles.paymentToggleTextPaid
            ]}>
              {paymentStatus === 'paid' ? t('paymentCompleted') : t('markAsPaid')}
            </Text>
          </TouchableOpacity>
          
          {/* Payment Button - Only for non-admin members */}
          {!isAdmin && paymentStatus !== 'paid' && (
            <TouchableOpacity style={styles.paymentButton} onPress={onPayment}>
              <CreditCard size={16} color={Colors.background} />
              <Text style={styles.paymentButtonText}>{t('payToAdmin')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Payment Window Info */}
      {group.status === 'active' && !isInPaymentWindow && (
        <View style={styles.paymentInfo}>
          <Calendar size={14} color={Colors.textSecondary} />
          <Text style={styles.paymentInfoText}>{t('paymentWindow')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardContent: {
    // No padding here, handled by sections
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    lineHeight: 24,
  },
  groupDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewDetailsButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  viewDetailsButtonText: {
    fontSize: 16,
    color: Colors.background,
    fontWeight: '600',
    textAlign: 'center',
  },
  paymentSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
    backgroundColor: Colors.background + '80',
  },
  paymentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    marginBottom: 12,
    gap: 12,
  },
  paymentTogglePaid: {
    backgroundColor: Colors.success + '20',
  },
  paymentToggleText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  paymentToggleTextPaid: {
    color: Colors.success,
    fontWeight: '600',
  },
  uncheckedCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
    backgroundColor: 'transparent',
  },
  paymentButton: {
    backgroundColor: Colors.money,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  paymentButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  paymentInfoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
});