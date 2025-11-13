import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Zap, Plus } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import EmptyBiddingState from './EmptyBiddingState';

interface LiveBiddingSectionProps {
  currentRound: any;
  isAdmin: boolean;
  onEnterLiveBidding: () => void;
  onCreateRound: () => void;
}

export default function LiveBiddingSection({
  currentRound,
  isAdmin,
  onEnterLiveBidding,
  onCreateRound
}: LiveBiddingSectionProps) {
  
  // If no round exists, show different UI for admin vs members
  if (!currentRound) {
    if (isAdmin) {
      return (
        <View style={styles.liveBiddingCard}>
          <View style={styles.liveBiddingHeader}>
            <Text style={styles.liveBiddingTitle}>Live Bidding Available</Text>
            <Text style={styles.liveBiddingSubtitle}>Create a round to start bidding</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.createRoundButton, Colors.shadow]}
            onPress={onCreateRound}
          >
            <Plus size={20} color={Colors.background} />
            <Text style={styles.createRoundText}>Create New Round</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      // For members, show disabled live bidding section
      return (
        <View style={styles.liveBiddingCard}>
          <View style={styles.liveBiddingHeader}>
            <Text style={styles.liveBiddingTitle}>Live Bidding Available</Text>
            <Text style={styles.liveBiddingSubtitle}>Waiting for admin to create a round</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.disabledButton, Colors.shadow]}
            disabled={true}
          >
            <Zap size={20} color={Colors.textSecondary} />
            <Text style={styles.disabledButtonText}>Enter Live Bidding</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }
  
  // If round exists, show enter live bidding
  return (
    <View style={styles.liveBiddingCard}>
      <View style={styles.liveBiddingHeader}>
        <Text style={styles.liveBiddingTitle}>Live Bidding Available</Text>
        <Text style={styles.liveBiddingSubtitle}>
          Round {currentRound.roundNumber} • {currentRound.status.toUpperCase()}
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.enterBiddingButton, Colors.shadow]}
        onPress={onEnterLiveBidding}
      >
        <Zap size={24} color={Colors.background} />
        <Text style={styles.enterBiddingText}>Enter Live Bidding</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  liveBiddingCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    margin: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  liveBiddingHeader: {
    marginBottom: 16,
  },
  liveBiddingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  liveBiddingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  enterBiddingButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  enterBiddingText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.background,
  },
  createRoundButton: {
    backgroundColor: Colors.success,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createRoundText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary + '20',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.textSecondary + '30',
  },
  disabledButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});