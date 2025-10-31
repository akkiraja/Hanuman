import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Zap, Plus, Users, HelpCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

interface EmptyBiddingStateProps {
  isAdmin: boolean;
  onCreateRound?: () => void;
  onShowHelp?: () => void;
}

export default function EmptyBiddingState({ isAdmin, onCreateRound, onShowHelp }: EmptyBiddingStateProps) {
  return (
    <View style={[styles.container, Colors.shadow]}>
      <View style={styles.illustration}>
        <View style={styles.iconContainer}>
          <Zap size={48} color={Colors.primary} />
        </View>
        <View style={styles.sparkles}>
          <View style={[styles.sparkle, styles.sparkle1]} />
          <View style={[styles.sparkle, styles.sparkle2]} />
          <View style={[styles.sparkle, styles.sparkle3]} />
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.emptyTitle}>No Active Round</Text>
        <Text style={styles.emptySubtitle}>
          {isAdmin 
            ? 'Create a new bidding round to get started' 
            : 'Waiting for admin to create a new round'}
        </Text>
        
        <View style={styles.features}>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Users size={16} color={Colors.primary} />
            </View>
            <Text style={styles.featureText}>Lowest bid wins</Text>
          </View>
          
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Zap size={16} color={Colors.success} />
            </View>
            <Text style={styles.featureText}>Real-time updates</Text>
          </View>
          
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Plus size={16} color={Colors.warning} />
            </View>
            <Text style={styles.featureText}>Update bids anytime</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.actions}>
        {isAdmin && onCreateRound && (
          <TouchableOpacity style={styles.primaryButton} onPress={onCreateRound}>
            <Plus size={20} color={Colors.background} />
            <Text style={styles.primaryButtonText}>Create First Round</Text>
          </TouchableOpacity>
        )}
        
        {onShowHelp && (
          <TouchableOpacity style={styles.helpButton} onPress={onShowHelp}>
            <HelpCircle size={16} color={Colors.primary} />
            <Text style={styles.helpButtonText}>How Bidding Works</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    margin: 16,
    padding: 24,
    alignItems: 'center',
  },
  illustration: {
    position: 'relative',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
  },
  sparkle1: {
    top: 10,
    right: 5,
  },
  sparkle2: {
    bottom: 15,
    left: 8,
  },
  sparkle3: {
    top: 25,
    left: -5,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  features: {
    alignItems: 'flex-start',
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
});