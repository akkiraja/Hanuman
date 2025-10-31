import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { UserPlus, X } from 'lucide-react-native';
import { Colors } from '../constants/colors';

interface BhishiSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
}

export default function BhishiSuccessModal({ visible, onClose, userName }: BhishiSuccessModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <Animated.View 
          style={[
            styles.modalCard,
            {
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          {/* Close Icon */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={20} color={Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>🎉 Your Bhishi is Ready!</Text>

            {/* Next Step Guidance */}
            <View style={styles.nextStepContainer}>
              <View style={styles.nextStepIcon}>
                <UserPlus size={20} color={Colors.primary} strokeWidth={2.5} />
              </View>
              <Text style={styles.nextStepTitle}>
                Next Step: Add Members to Your Bhishi
              </Text>
              <Text style={styles.nextStepSubtitle}>
                अपनी भिशी में सदस्य जोड़ें
              </Text>
            </View>

            {/* Skip Link */}
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '45%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  nextStepContainer: {
    backgroundColor: Colors.primary + '08',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  nextStepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  nextStepTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 24,
  },
  nextStepSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
