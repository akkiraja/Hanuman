import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Crown, Calendar, TrendingDown, Users } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { BidRound } from '../../types/chitFund';

interface PastRoundsHistoryProps {
  rounds: BidRound[];
  isLoading?: boolean;
  onRoundPress?: (round: BidRound) => void;
}

export default function PastRoundsHistory({ 
  rounds, 
  isLoading = false, 
  onRoundPress 
}: PastRoundsHistoryProps) {
  const renderRoundItem = ({ item }: { item: BidRound }) => {
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(date));
    };

    const getStatusColor = () => {
      switch (item.status) {
        case 'completed': return Colors.success;
        case 'active': return Colors.warning;
        case 'open': return Colors.primary;
        default: return Colors.textSecondary;
      }
    };

    const getStatusText = () => {
      switch (item.status) {
        case 'completed': return 'Completed';
        case 'active': return 'Active';
        case 'open': return 'Open';
        default: return 'Unknown';
      }
    };

    return (
      <TouchableOpacity
        style={[styles.roundItem, Colors.shadow]}
        onPress={() => onRoundPress?.(item)}
        activeOpacity={0.7}
      >
        <View style={styles.roundHeader}>
          <View style={styles.roundInfo}>
            <Text style={styles.roundNumber}>Round {item.roundNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
          </View>
          <Text style={styles.roundDate}>
            {formatDate(item.startTime)}
          </Text>
        </View>
        
        <View style={styles.roundDetails}>
          <View style={styles.detailItem}>
            <TrendingDown size={16} color={Colors.money} />
            <Text style={styles.detailLabel}>Prize:</Text>
            <Text style={styles.detailValue}>
              ₹{item.prizeAmount.toLocaleString()}
            </Text>
          </View>
          
          {item.status === 'completed' && item.winningBid && (
            <View style={styles.detailItem}>
              <Crown size={16} color={Colors.warning} />
              <Text style={styles.detailLabel}>Winning Bid:</Text>
              <Text style={[styles.detailValue, { color: Colors.warning }]}>
                ₹{item.winningBid.toLocaleString()}
              </Text>
            </View>
          )}
          
          <View style={styles.detailItem}>
            <Users size={16} color={Colors.primary} />
            <Text style={styles.detailLabel}>Total Bids:</Text>
            <Text style={styles.detailValue}>
              {item.totalBids || 0}
            </Text>
          </View>
        </View>
        
        {item.status === 'completed' && item.winnerId && (
          <View style={styles.winnerSection}>
            <Crown size={14} color={Colors.warning} />
            <Text style={styles.winnerText}>
              Winner: {item.winnerName || 'Member'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Calendar size={48} color={Colors.textSecondary} />
      <Text style={styles.emptyStateText}>No past rounds yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Round history will appear here once rounds are completed
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.loadingItem}>
          <View style={styles.loadingHeader}>
            <View style={styles.loadingTitle} />
            <View style={styles.loadingBadge} />
          </View>
          <View style={styles.loadingDetails}>
            <View style={styles.loadingDetail} />
            <View style={styles.loadingDetail} />
            <View style={styles.loadingDetail} />
          </View>
        </View>
      ))}
    </View>
  );

  if (isLoading) {
    return renderLoadingState();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rounds.filter(round => round.status === 'completed')}
        renderItem={renderRoundItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={rounds.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  roundItem: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.background,
  },
  roundDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  roundDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  winnerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  winnerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingState: {
    gap: 12,
  },
  loadingItem: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
  },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingTitle: {
    width: 80,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  loadingBadge: {
    width: 60,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.border,
  },
  loadingDetails: {
    gap: 8,
  },
  loadingDetail: {
    width: '100%',
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.border,
  },
});