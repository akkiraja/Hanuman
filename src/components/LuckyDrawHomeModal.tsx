import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { Gift, X, Trophy } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useColorScheme } from 'react-native';

interface LuckyDrawHomeModalProps {
  visible: boolean;
  onClose: () => void;
  groupName: string;
  groupId: string;
}

export default function LuckyDrawHomeModal({ 
  visible, 
  onClose, 
  groupName,
  groupId 
}: LuckyDrawHomeModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowContent(true);
      startAnimations();
    } else {
      setShowContent(false);
      // Reset animation values when modal closes
      spinValue.setValue(0);
      scaleValue.setValue(0);
    }
  }, [visible]);

  const startAnimations = () => {
    // Reset animation values
    spinValue.setValue(0);
    scaleValue.setValue(0);

    // Scale in animation for modal content
    const scaleIn = Animated.spring(scaleValue, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    });

    // Continuous spinning animation
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Start animations
    scaleIn.start();
    spin.start();
  };

  const spinRotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <BlurView
          style={styles.blurContainer}
          tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
          intensity={80}
        >
          <View style={[
            styles.overlayBackground,
            { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(248,250,252,0.5)' }
          ]} />
        </BlurView>
        
        {showContent && (
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: scaleValue }],
                backgroundColor: isDark ? '#1C1C1E' : Colors.card,
              }
            ]}
          >
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={isDark ? '#8E8E93' : Colors.textSecondary} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : Colors.text }
              ]}>
                Lucky Draw in Progress
              </Text>
              <Text style={[
                styles.groupName,
                { color: isDark ? '#007AFF' : Colors.primary }
              ]}>
                {groupName}
              </Text>
            </View>

            {/* Spinner */}
            <View style={styles.spinnerContainer}>
              <Animated.View 
                style={[
                  styles.spinner,
                  {
                    transform: [{ rotate: spinRotation }],
                    borderColor: isDark ? '#007AFF' : Colors.primary,
                    backgroundColor: isDark ? '#1C1C1E' : Colors.card,
                  }
                ]}
              >
                <View style={styles.spinnerInner}>
                  <Gift size={50} color={isDark ? '#FF9500' : Colors.warning} />
                </View>
              </Animated.View>
            </View>

            {/* Status Text */}
            <View style={styles.statusContainer}>
              <Text style={[
                styles.statusText,
                { color: isDark ? '#8E8E93' : Colors.textSecondary }
              ]}>
                Draw in progress...
              </Text>
              <Text style={[
                styles.subText,
                { color: isDark ? '#8E8E93' : Colors.textSecondary }
              ]}>
                Winner will be announced shortly
              </Text>
            </View>

            {/* Excitement Elements */}
            <View style={styles.excitementContainer}>
              <Text style={styles.emoji}>🎉</Text>
              <Text style={styles.emoji}>🎲</Text>
              <Text style={styles.emoji}>🏆</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayBackground: {
    flex: 1,
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Colors.shadow,
    shadowOpacity: 0.3,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  spinner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...Colors.shadow,
    shadowOpacity: 0.2,
  },
  spinnerInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  excitementContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
  },
  emoji: {
    fontSize: 24,
  },
});