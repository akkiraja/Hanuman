import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, Crown, Users, Zap } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import CountdownTimer from './CountdownTimer';

interface CompactRoomInfoProps {
  currentRound: any;
  currentLowestBid?: number;
  totalMembers: number;
  activeBidders: number;
  onTimeUp?: () => void;
}

export default function CompactRoomInfo({
  currentRound,
  currentLowestBid,
  totalMembers,
  activeBidders,
  onTimeUp
}: CompactRoomInfoProps) {
  
  const getStatusColor = () => {
    switch (currentRound.status) {
      case 'open': return Colors.warning;
      case 'active': return Colors.success;
      case 'completed': return Colors.textSecondary;
      default: return Colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (currentRound.status) {
      case 'open': return 'Waiting to Start';
      case 'active': return 'Live Bidding';
      case 'completed': return 'Round Ended';
      default: return 'Unknown';
    }
  };

  return (
    <View style={styles.container}>
      {/* Status and Timer Row */}
      <View style={styles.topRow}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        
        {currentRound.status === 'active' && currentRound.endTime && (
          <CountdownTimer
            endTime={currentRound.endTime}
            size="small"
            showIcon={false}
            onTimeUp={onTimeUp}
          />
        )}
      </View>
      
      {/* Stats Row */}
      <View style={styles.statsRow}>
        {/* Lowest Bid */}
        {currentLowestBid && (
          <View style={styles.statItem}>
            <Crown size={14} color={Colors.warning} />
            <Text style={styles.statLabel}>Lowest:</Text>
            <Text style={styles.statValue}>₹{currentLowestBid.toLocaleString()}</Text>
          </View>
        )}
        
        {/* Active Bidders */}
        <View style={styles.statItem}>
          <Zap size={14} color={Colors.primary} />
          <Text style={styles.statLabel}>Active:</Text>
          <Text style={styles.statValue}>{activeBidders}</Text>
        </View>
        
        {/* Total Members */}
        <View style={styles.statItem}>
          <Users size={14} color={Colors.textSecondary} />
          <Text style={styles.statLabel}>Total:</Text>
          <Text style={styles.statValue}>{totalMembers}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '700',
  },
});