import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Linking, Platform } from 'react-native';
import { X, PartyPopper, Share2 } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

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

  const handleWhatsAppShare = async () => {
    const senderName = userName || 'Aapke dost';
    const shareMessage = `${senderName} ne tujhe Bhishi join karne bulaya hai! 💰\n\nBhishi ek simple app hai jahan doston ke saath milke bachat kar sakte ho.\n\nDownload kar aur group join kar: https://play.google.com/store/apps/details?id=com.bhishiapp.mobile&pcampaignid=web_share`;
    
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        onClose();
      } else {
        // Fallback to web WhatsApp or show error
        const webWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        await Linking.openURL(webWhatsappUrl);
        onClose();
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      // Still close modal even if sharing fails
      onClose();
    }
  };

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
          {/* Confetti/Celebration Header */}
          <View style={styles.celebrationHeader}>
            <View style={styles.confettiContainer}>
              <PartyPopper size={64} color={Colors.primary} strokeWidth={1.5} />
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>🎉 Your Bhishi is Ready!</Text>
            <Text style={styles.subtitle}>
              Now add your friends to start saving together 💰
            </Text>

            {/* Primary CTA - Share on WhatsApp */}
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleWhatsAppShare}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#25D366', '#128C7E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shareButtonGradient}
              >
                <Share2 size={20} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.shareButtonText}>📤 Share on WhatsApp</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Skip Option */}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  celebrationHeader: {
    paddingTop: 32,
    paddingBottom: 16,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  confettiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
