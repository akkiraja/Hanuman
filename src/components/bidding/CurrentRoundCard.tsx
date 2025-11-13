import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface CurrentRoundCardProps {
  currentRound: any;
}

export default function CurrentRoundCard({ currentRound }: CurrentRoundCardProps) {
  if (!currentRound) return null;
  
  return (
    <View style={[styles.currentRoundCard, Colors.shadow]}>
      <View style={styles.roundHeader}>
        <View>
          <Text style={styles.roundTitle}>Round {currentRound.roundNumber}</Text>
          <Text style={[styles.roundStatus, { color: getStatusColor(currentRound.status) }]}>
            {currentRound.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.roundStats}>
        <View style={styles.roundStat}>
          <Text style={styles.roundStatLabel}>Prize</Text>
          <Text style={styles.roundStatValue}>₹{currentRound.prizeAmount.toLocaleString()}</Text>
        </View>
        
        <View style={styles.roundStat}>
          <Text style={styles.roundStatLabel}>Bids</Text>
          <Text style={styles.roundStatValue}>{currentRound.totalBids || 0}</Text>
        </View>
        
        {currentRound.currentLowestBid && (
          <View style={styles.roundStat}>
            <Text style={styles.roundStatLabel}>Lowest Bid</Text>
            <Text style={[styles.roundStatValue, { color: Colors.success }]}>
              ₹{currentRound.currentLowestBid.toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return Colors.success;
    case 'open': return Colors.warning;
    case 'completed': return Colors.textSecondary;
    default: return Colors.textSecondary;
  }
}

const styles = StyleSheet.create({
  currentRoundCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    margin: 20,
    padding: 20,
  },
  roundHeader: {
    marginBottom: 16,
  },
  roundTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  roundStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  roundStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundStat: {
    alignItems: 'center',
    flex: 1,
  },
  roundStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  roundStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
});