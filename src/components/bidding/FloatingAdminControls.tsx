import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import SafeBlurView from '../SafeBlurView';
import { Settings, Play, Square, MoreVertical, X } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useColorScheme } from 'react-native';

interface FloatingAdminControlsProps {
  isAdmin: boolean;
  canStartRound: boolean;
  canCloseRound: boolean;
  onStartRound: () => void;
  onCloseRound: () => void;
}

export default function FloatingAdminControls({
  isAdmin,
  canStartRound,
  canCloseRound,
  onStartRound,
  onCloseRound
}: FloatingAdminControlsProps) {
  const [showControls, setShowControls] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  if (!isAdmin) return null;

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleStartRound = () => {
    onStartRound();
    setShowControls(false);
  };

  const handleCloseRound = () => {
    onCloseRound();
    setShowControls(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={toggleControls}
        activeOpacity={0.8}
      >
        <SafeBlurView
          style={styles.fabBlur}
          tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
          intensity={100}
        >
          <View style={[styles.fabContent, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)' }]}>
            <Settings size={20} color={Colors.primary} />
          </View>
        </SafeBlurView>
      </TouchableOpacity>

      {/* Controls Modal */}
      <Modal
        visible={showControls}
        transparent
        animationType="fade"
        onRequestClose={toggleControls}
      >
        <SafeBlurView
          style={styles.container}
          tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
          intensity={100}
        >
          <View style={[styles.controlsContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(248,250,252,0.9)' }]}>
            {/* Header */}
            <View style={styles.controlsHeader}>
              <Text style={styles.controlsTitle}>Admin Controls</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowControls(false)}
              >
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {/* Control Buttons */}
            <View style={styles.controlButtons}>
              {canStartRound && (
                <TouchableOpacity
                  style={[styles.controlButton, styles.startButton]}
                  onPress={handleStartRound}
                >
                  <Play size={18} color={Colors.background} />
                  <Text style={styles.startButtonText}>Start Round</Text>
                </TouchableOpacity>
              )}
              
              {canCloseRound && (
                <TouchableOpacity
                  style={[styles.controlButton, styles.closeRoundButton]}
                  onPress={handleCloseRound}
                >
                  <Square size={18} color={Colors.background} />
                  <Text style={styles.closeRoundButtonText}>Close Round</Text>
                </TouchableOpacity>
              )}
              
              {!canStartRound && !canCloseRound && (
                <View style={styles.noActionsContainer}>
                  <Text style={styles.noActionsText}>No actions available</Text>
                  <Text style={styles.noActionsSubtext}>
                    Round controls will appear when applicable
                  </Text>
                </View>
              )}
            </View>
          </View>
        </SafeBlurView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    top: 120, // Below compact room info, easily accessible
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabBlur: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
  },
  fabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border + '50',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlsContainer: {
    padding: 20,
    borderRadius: 16,
  },
  controlsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  controlButtons: {
    gap: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  startButton: {
    backgroundColor: Colors.success,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  closeRoundButton: {
    backgroundColor: Colors.error,
  },
  closeRoundButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  noActionsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noActionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  noActionsSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    opacity: 0.8,
  },
});