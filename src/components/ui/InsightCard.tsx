import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - 32 - 16) / 3;

interface InsightCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  backgroundColor?: string;
  isUrgent?: boolean;
}

export default function InsightCard({ 
  icon: Icon, 
  title,
  value, 
  subtitle,
  color,
  backgroundColor = '#FFFFFF',
  isUrgent = false 
}: InsightCardProps) {
  return (
    <View style={[
      styles.card, 
      { backgroundColor },
      Colors.shadow, 
      isUrgent && styles.urgentCard
    ]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Icon size={14} color={color} />
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
        </View>
        
        <Text 
          style={[styles.value, isUrgent && styles.urgentValue]} 
          numberOfLines={1} 
          ellipsizeMode="middle"
        >
          {value}
        </Text>
        
        {subtitle && (
          <Text 
            style={[styles.subtitle, isUrgent && styles.urgentSubtitle]}
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    padding: 8,
    borderRadius: 12,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  urgentCard: {
    backgroundColor: '#FEF3F2',
    borderWidth: 0.5,
    borderColor: '#FECACA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    width: '100%',
  },
  title: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
    marginLeft: 4,
    textAlign: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.1,
    lineHeight: 18,
    textAlign: 'center',
  },
  urgentValue: {
    color: '#DC2626',
  },
  subtitle: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '400',
    lineHeight: 11,
    textAlign: 'center',
  },
  urgentSubtitle: {
    color: '#DC2626',
    opacity: 0.8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});