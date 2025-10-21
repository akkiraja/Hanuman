import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Users, Clock, Zap, ArrowRight, TrendingDown, IndianRupee, Calendar, Gavel } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { ChitGroup, BidRound } from '../../types/chitFund';
import { useTranslation } from '../../constants/translations';

interface BiddingGroupCardProps {
  group: ChitGroup;
  currentRound?: BidRound;
  onPress: () => void;
  isAdmin: boolean;
  userHasBid?: boolean;
  userBidAmount?: number;
}

export default function BiddingGroupCard({ 
  group, 
  currentRound, 
  onPress, 
  isAdmin, 
  userHasBid = false,
  userBidAmount 
}: BiddingGroupCardProps) {
  const { t } = useTranslation();
  const totalPool = group.monthlyAmount * group.currentMembers;
  
  const getStatusInfo = () => {
    if (!currentRound) {
      return {
        status: 'ACTIVE',
        statusColor: Colors.success,
        backgroundColor: Colors.success
      };
    }
    
    switch (currentRound.status) {
      case 'open':
      case 'active':
        return {
          status: 'ACTIVE',
          statusColor: Colors.success,
          backgroundColor: Colors.success
        };
      case 'closed':
      case 'completed':
        return {
          status: 'COMPLETED',
          statusColor: Colors.primary,
          backgroundColor: Colors.primary
        };
      default:
        return {
          status: 'UNKNOWN',
          statusColor: Colors.textSecondary,
          backgroundColor: Colors.textSecondary
        };
    }
  };
  
  const statusInfo = getStatusInfo();
  
  const getNextDrawInfo = () => {
    if (!currentRound) {
      return 'No active round';
    }
    
    if (currentRound.status === 'active' && currentRound.endTime) {
      const now = new Date();
      const endTime = new Date(currentRound.endTime);
      const timeDiff = endTime.getTime() - now.getTime();
      
      if (timeDiff <= 0) return 'Bidding ended';
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m left`;
      }
      return `${minutes}m left`;
    }
    
    return currentRound.status === 'completed' ? 'Round completed' : 'Round starting soon';
  };
  
  return (
    <View style={[styles.card, Colors.shadow]}>
      <TouchableOpacity style={styles.cardContent} onPress={onPress}>
        {/* Header with gradient background */}
        <View style={[styles.cardHeader, { backgroundColor: statusInfo.backgroundColor + '10' }]}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Text style={styles.groupName}>{group.name}</Text>
              <View style={styles.biddingTag}>
                <Gavel size={10} color={Colors.primary} />
                <Text style={styles.biddingTagText}>Bidding</Text>
              </View>
            </View>
            <Text style={styles.groupDescription}>{group.description}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.backgroundColor }]}>
            <Text style={styles.statusText}>{statusInfo.status}</Text>
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
            
            <View style={styles.detailItem}>
              <View style={[styles.iconWrapper, { backgroundColor: Colors.warning + '20' }]}>
                <Calendar size={16} color={Colors.warning} />
              </View>
              <View>
                <Text style={styles.detailValue}>{getNextDrawInfo()}</Text>
                <Text style={styles.detailLabel}>status</Text>
              </View>
            </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 24,
  },
  biddingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  biddingTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'uppercase',
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
});