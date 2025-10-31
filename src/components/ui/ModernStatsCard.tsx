import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

interface ModernStatsCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  color: string;
  gradient?: boolean;
}

export default function ModernStatsCard({ 
  icon: Icon, 
  value, 
  label, 
  color,
  gradient = false 
}: ModernStatsCardProps) {
  return (
    <View style={[styles.card, Colors.shadow, gradient && styles.gradientCard]}>
      <View style={[styles.iconWrapper, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: 24,
    borderRadius: 18,
    alignItems: 'center',
    marginHorizontal: 6,
    minHeight: 130,
    justifyContent: 'center',
  },
  gradientCard: {
    backgroundColor: Colors.primary + '12',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  value: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});