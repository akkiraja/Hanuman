import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface FooterStatusSectionProps {
  currentRound: any;
  winnerName?: string;
}

export default function FooterStatusSection({ currentRound, winnerName }: FooterStatusSectionProps) {
  const renderStatusContent = () => {
    switch (currentRound.status) {
      case 'active':
        return (
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.footerText}>Round is active • Waiting for bids...</Text>
          </View>
        );
        
      case 'completed':
        return (
          <View style={styles.completedContainer}>
            <Text style={styles.winnerText}>🏆 Winner: {winnerName || 'Member Name'}</Text>
            <Text style={styles.winnerBid}>
              Winning Bid: ₹{currentRound.currentLowestBid?.toLocaleString() || '0'}
            </Text>
            <Text style={styles.nextRoundText}>Next round starts soon...</Text>
          </View>
        );
        
      case 'open':
        return (
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: Colors.warning }]} />
            <Text style={styles.footerText}>Round is open • Waiting for admin to start</Text>
          </View>
        );
        
      default:
        return (
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: Colors.textSecondary }]} />
            <Text style={styles.footerText}>Round status unknown</Text>
          </View>
        );
    }
  };
  
  return (
    <View style={styles.footerStatus}>
      {renderStatusContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  footerStatus: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 100, // Account for sticky bid entry
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  completedContainer: {
    alignItems: 'center',
    gap: 4,
  },
  winnerText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 4,
  },
  winnerBid: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.money,
    marginBottom: 8,
  },
  nextRoundText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});