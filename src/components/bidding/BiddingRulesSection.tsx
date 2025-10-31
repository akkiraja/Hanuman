import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface BiddingRulesSectionProps {
  // No props needed for static rules
}

export default function BiddingRulesSection({}: BiddingRulesSectionProps) {
  return (
    <View style={styles.rulesSection}>
      <Text style={styles.rulesTitle}>Bidding Rules</Text>
      <View style={styles.rulesList}>
        <Text style={styles.ruleItem}>• Lowest bid wins the round</Text>
        <Text style={styles.ruleItem}>• Minimum bid is 10% of prize amount</Text>
        <Text style={styles.ruleItem}>• You can update your bid to a lower amount</Text>
        <Text style={styles.ruleItem}>• Round closes when admin decides</Text>
        <Text style={styles.ruleItem}>• Winner receives the full prize amount</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rulesSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  rulesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  rulesList: {
    gap: 8,
  },
  ruleItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});