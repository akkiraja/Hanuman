import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Zap, Clock, RotateCcw } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

interface AdminControlsSectionProps {
  isAdmin: boolean;
  canStartRound: boolean;
  canCloseRound: boolean;
  onStartRound: () => void;
  onCloseRound: () => void;
  onResetRound?: () => void;
}

export default function AdminControlsSection({
  isAdmin,
  canStartRound,
  canCloseRound,
  onStartRound,
  onCloseRound,
  onResetRound
}: AdminControlsSectionProps) {
  if (!isAdmin) return null;
  
  return (
    <View style={styles.adminControlsCard}>
      <View style={styles.adminButtons}>
        {canStartRound && (
          <TouchableOpacity
            style={[styles.adminButton, styles.startButton]}
            onPress={onStartRound}
          >
            <Zap size={20} color={Colors.background} />
            <Text style={styles.startButtonText}>🟢 Start Round</Text>
          </TouchableOpacity>
        )}
        
        {canCloseRound && (
          <TouchableOpacity
            style={[styles.adminButton, styles.closeButton]}
            onPress={onCloseRound}
          >
            <Clock size={20} color={Colors.background} />
            <Text style={styles.closeButtonText}>🟠 Close Round</Text>
          </TouchableOpacity>
        )}
        
        {onResetRound && (
          <TouchableOpacity
            style={[styles.adminButton, styles.resetButton]}
            onPress={onResetRound}
          >
            <RotateCcw size={20} color={Colors.background} />
            <Text style={styles.resetButtonText}>🔵 Reset Round</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  adminControlsCard: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  adminButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  adminButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 80,
  },
  startButton: {
    backgroundColor: '#22c55e', // Green
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
  closeButton: {
    backgroundColor: '#f97316', // Orange
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
  resetButton: {
    backgroundColor: '#3b82f6', // Blue
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
});