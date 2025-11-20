import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IndianRupee, Users, TrendingDown } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

interface OverviewCardsSectionProps {
  totalPool: number;
  currentMembers: number;
  currentRoundNumber: number;
}

export default function OverviewCardsSection({ 
  totalPool, 
  currentMembers, 
  currentRoundNumber 
}: OverviewCardsSectionProps) {
  return (
    <View style={styles.statsContainer}>
      <View style={[styles.statCard, Colors.shadow]}>
        <IndianRupee size={24} color={Colors.money} />
        <Text style={styles.statNumber}>₹{totalPool.toLocaleString()}</Text>
        <Text style={styles.statLabel}>Pool Amount</Text>
      </View>
      
      <View style={[styles.statCard, Colors.shadow]}>
        <Users size={24} color={Colors.primary} />
        <Text style={styles.statNumber}>{currentMembers}/40</Text>
        <Text style={styles.statLabel}>Members</Text>
      </View>
      
      <View style={[styles.statCard, Colors.shadow]}>
        <TrendingDown size={24} color={Colors.success} />
        <Text style={styles.statNumber}>{currentRoundNumber}</Text>
        <Text style={styles.statLabel}>Current Round</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});