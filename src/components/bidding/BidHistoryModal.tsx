import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { X, Trophy, Calendar, Users, IndianRupee } from 'lucide-react-native';
import { format } from 'date-fns';
import { Colors } from '../../constants/colors';
import { BidRound } from '../../types/chitFund';
import SafeBlurView from '../SafeBlurView';
import { useColorScheme } from 'react-native';

interface BidHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  bidHistory: BidRound[];
}

export default function BidHistoryModal({ visible, onClose, bidHistory }: BidHistoryModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const renderRoundItem = ({ item }: { item: BidRound }) => (
    <View style={[styles.roundItem, Colors.shadow]}>
      <View style={styles.roundHeader}>
        <View style={styles.roundInfo}>
          <Text style={styles.roundNumber}>Round {item.roundNumber}</Text>
          <Text style={styles.roundDate}>{format(item.createdAt, 'MMM dd, yyyy')}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'completed' ? Colors.success : Colors.warning }
        ]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.roundStats}>
        <View style={styles.statItem}>
          <IndianRupee size={16} color={Colors.money} />
          <Text style={styles.statValue}>₹{item.prizeAmount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Prize</Text>
        </View>
        
        <View style={styles.statItem}>
          <Users size={16} color={Colors.primary} />
          <Text style={styles.statValue}>{item.totalBids}</Text>
          <Text style={styles.statLabel}>Bids</Text>
        </View>
        
        {item.winningBid && (
          <View style={styles.statItem}>
            <Trophy size={16} color={Colors.success} />
            <Text style={styles.statValue}>₹{item.winningBid.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Winning Bid</Text>
          </View>
        )}
      </View>
      
      {item.winnerName && (
        <View style={styles.winnerSection}>
          <Trophy size={16} color={Colors.success} />
          <Text style={styles.winnerText}>Winner: {item.winnerName}</Text>
        </View>
      )}
      
      {item.bids && item.bids.length > 0 && (
        <View style={styles.bidsPreview}>
          <Text style={styles.bidsTitle}>Top Bids:</Text>
          {item.bids.slice(0, 3).map((bid, index) => (
            <View key={bid.id} style={styles.bidPreviewItem}>
              <Text style={styles.bidderName}>{bid.memberName}</Text>
              <Text style={[
                styles.bidAmount,
                bid.isWinning && styles.winningBidAmount
              ]}>₹{bid.bidAmount.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Calendar size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Bid History</Text>
      <Text style={styles.emptySubtitle}>Past bidding rounds will appear here</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeBlurView
        style={styles.container}
        tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
        intensity={100}
      >
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(248,250,252,0.5)' }]}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Bid History</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            {bidHistory.length > 0 ? (
              <FlatList
                data={bidHistory.sort((a, b) => b.roundNumber - a.roundNumber)}
                renderItem={renderRoundItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              renderEmptyState()
            )}
          </View>
          </View>
          </SafeBlurView>
          </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
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
    flex: 1,
  },
  roundNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  roundDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
  roundStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  winnerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.success + '10',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  winnerText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.success,
  },
  bidsPreview: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  bidsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  bidPreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  bidderName: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  bidAmount: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  winningBidAmount: {
    color: Colors.success,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});