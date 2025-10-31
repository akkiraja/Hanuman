import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, RefreshCw } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useTranslation } from '../../constants/translations';

interface ModernHeaderProps {
  userName?: string;
  onCreateGroup: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function ModernHeader({ 
  userName, 
  onCreateGroup, 
  onRefresh, 
  isLoading = false 
}: ModernHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.title}>{t('myCommittee')}</Text>
        <Text style={styles.subtitle}>
          👋 {t('welcome')}, {userName || 'User'}!
        </Text>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.createButton]}
          onPress={onCreateGroup}
        >
          <Plus size={20} color={Colors.background} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.refreshButton]}
          onPress={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw 
            size={20} 
            color={Colors.primary} 
            style={isLoading ? styles.spinning : undefined}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
    lineHeight: 22,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButton: {
    backgroundColor: Colors.primary,
  },
  refreshButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  spinning: {
    // Animation would be handled by the parent component
  },
});