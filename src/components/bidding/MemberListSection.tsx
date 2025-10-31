import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Users, Crown, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Member } from '../../types/chitFund';

interface MemberListSectionProps {
  members: Member[];
  isAdmin: boolean;
  onMemberPress?: (member: Member) => void;
}

export default function MemberListSection({ members, isAdmin, onMemberPress }: MemberListSectionProps) {
  const renderMemberItem = ({ item }: { item: Member }) => {
    const getStatusIcon = () => {
      if (item.hasWon) {
        return <Crown size={16} color={Colors.warning} />;
      }
      
      switch (item.contributionStatus) {
        case 'paid':
          return <CheckCircle size={16} color={Colors.success} />;
        case 'pending':
          return <Clock size={16} color={Colors.warning} />;
        case 'overdue':
          return <AlertCircle size={16} color={Colors.error} />;
        default:
          return <Clock size={16} color={Colors.textSecondary} />;
      }
    };
    
    const getStatusColor = () => {
      if (item.hasWon) return Colors.warning;
      
      switch (item.contributionStatus) {
        case 'paid': return Colors.success;
        case 'pending': return Colors.warning;
        case 'overdue': return Colors.error;
        default: return Colors.textSecondary;
      }
    };
    
    const getStatusText = () => {
      if (item.hasWon) return 'Winner';
      
      switch (item.contributionStatus) {
        case 'paid': return 'Paid';
        case 'pending': return 'Pending';
        case 'overdue': return 'Overdue';
        default: return 'Unknown';
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.memberItem,
          item.hasWon && styles.winnerMemberItem
        ]}
        onPress={() => onMemberPress?.(item)}
        disabled={!onMemberPress}
      >
        <View style={styles.memberInfo}>
          <View style={styles.memberHeader}>
            <Text style={styles.memberName}>{item.name}</Text>
            {item.isCreator && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
          </View>
          
          {item.phone && (
            <Text style={styles.memberPhone}>{item.phone}</Text>
          )}
          
          {item.lastPaymentDate && (
            <Text style={styles.lastPayment}>
              Last payment: {new Date(item.lastPaymentDate).toLocaleDateString()}
            </Text>
          )}
        </View>
        
        <View style={styles.memberStatus}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor() + '15' }
          ]}>
            {getStatusIcon()}
            <Text style={[
              styles.statusText,
              { color: getStatusColor() }
            ]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Users size={48} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Members Yet</Text>
      <Text style={styles.emptySubtitle}>Add members to start bidding</Text>
    </View>
  );

  const activeMembersCount = members.filter(m => !m.hasWon).length;
  const winnersCount = members.filter(m => m.hasWon).length;
  const paidMembersCount = members.filter(m => m.contributionStatus === 'paid').length;

  return (
    <View style={[styles.container, Colors.shadow]}>
      <View style={styles.header}>
        <Text style={styles.title}>Members ({members.length})</Text>
        <View style={styles.memberStats}>
          <View style={styles.statChip}>
            <CheckCircle size={12} color={Colors.success} />
            <Text style={styles.statText}>{paidMembersCount} Paid</Text>
          </View>
          {winnersCount > 0 && (
            <View style={styles.statChip}>
              <Crown size={12} color={Colors.warning} />
              <Text style={styles.statText}>{winnersCount} Won</Text>
            </View>
          )}
        </View>
      </View>
      
      {members.length > 0 ? (
        <FlatList
          data={members.sort((a, b) => {
            // Sort: Admin first, then winners, then by status
            if (a.isCreator && !b.isCreator) return -1;
            if (!a.isCreator && b.isCreator) return 1;
            if (a.hasWon && !b.hasWon) return -1;
            if (!a.hasWon && b.hasWon) return 1;
            return a.name.localeCompare(b.name);
          })}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      ) : (
        renderEmptyState()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  memberStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  winnerMemberItem: {
    backgroundColor: Colors.warning + '08',
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  adminBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.background,
  },
  memberPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  lastPayment: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  memberStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});