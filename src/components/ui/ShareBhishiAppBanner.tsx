import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Share2, X, Copy, MessageCircle, MoreHorizontal, ArrowRight } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { toast } from 'sonner-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';

interface ShareBhishiAppBannerProps {
  userName?: string;
}

export default function ShareBhishiAppBanner({ userName = 'Aapke dost' }: ShareBhishiAppBannerProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const playStoreLink = 'https://play.google.com/store/apps/details?id=com.bhishiapp.mobile&pcampaignid=web_share';

  // Dynamic Hinglish share message
  const shareMessage = `${userName} ne tujhe Bhishi join karne bulaya hai! 💰\nBhishi ek simple app hai jahan doston ke saath milke bachat kar sakte ho.\nDownload kar aur group join kar: ${playStoreLink}`;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.03,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleShare = async (method?: 'whatsapp' | 'sms') => {
    try {
      if (method === 'whatsapp') {
        // WhatsApp sharing
        const result = await Share.share({
          message: shareMessage,
        });

        if (result.action === Share.sharedAction) {
          toast.success('App link shared successfully!');
          setShowShareModal(false);
        }
      } else if (method === 'sms') {
        // SMS sharing
        const result = await Share.share({
          message: shareMessage,
        });

        if (result.action === Share.sharedAction) {
          toast.success('App link shared successfully!');
          setShowShareModal(false);
        }
      } else {
        // General share (More option)
        const result = await Share.share({
          message: shareMessage,
          title: 'Join Bhishi App',
        });

        if (result.action === Share.sharedAction) {
          toast.success('App link shared successfully!');
          setShowShareModal(false);
        }
      }
    } catch (error) {
      console.log('Error sharing:', error);
      toast.error('Failed to share');
    }
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(playStoreLink);
      toast.success('✅ Link copied!');
    } catch (error) {
      console.log('Error copying link:', error);
      toast.error('Failed to copy link');
    }
  };

  return (
    <>
      {/* Gradient Banner */}
      <Animated.View
        style={[
          styles.bannerContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setShowShareModal(true)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <LinearGradient
            colors={['#F59E0B', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBanner}
          >
            {/* Left: Icon */}
            <View style={styles.iconContainer}>
              <Share2 size={24} color="#FFFFFF" />
            </View>

            {/* Center: Text */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>🎉 Share Bhishi App</Text>
              <Text style={styles.subtitle}>
                Invite friends to download Bhishi and start their own group.
              </Text>
            </View>

            {/* Right: Arrow */}
            <View style={styles.arrowContainer}>
              <ArrowRight size={20} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowShareModal(false)}
          />

          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Share Bhishi with friends 💰</Text>
                <Text style={styles.modalSubtitle}>Let's start saving together!</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowShareModal(false)}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Share Buttons Row */}
            <View style={styles.shareButtonsRow}>
              {/* WhatsApp Button */}
              <TouchableOpacity
                style={[styles.shareMethodButton, styles.whatsappButton]}
                onPress={() => handleShare('whatsapp')}
              >
                <View style={styles.shareMethodIconContainer}>
                  <MessageCircle size={28} color="#25D366" />
                </View>
                <Text style={styles.shareMethodLabel}>WhatsApp</Text>
              </TouchableOpacity>

              {/* SMS Button */}
              <TouchableOpacity
                style={[styles.shareMethodButton, styles.smsButton]}
                onPress={() => handleShare('sms')}
              >
                <View style={styles.shareMethodIconContainer}>
                  <MessageCircle size={28} color={Colors.primary} />
                </View>
                <Text style={styles.shareMethodLabel}>SMS</Text>
              </TouchableOpacity>

              {/* More Button */}
              <TouchableOpacity
                style={[styles.shareMethodButton, styles.moreButton]}
                onPress={() => handleShare()}
              >
                <View style={styles.shareMethodIconContainer}>
                  <MoreHorizontal size={28} color={Colors.textSecondary} />
                </View>
                <Text style={styles.shareMethodLabel}>More</Text>
              </TouchableOpacity>
            </View>

            {/* Copy Link Row */}
            <TouchableOpacity
              style={styles.copyLinkRow}
              onPress={handleCopyLink}
            >
              <View style={styles.copyLinkLeft}>
                <Copy size={20} color={Colors.primary} />
                <Text style={styles.copyLinkText} numberOfLines={1}>
                  {playStoreLink}
                </Text>
              </View>
              <View style={styles.copyButton}>
                <Text style={styles.copyButtonText}>Copy</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Banner Styles
  bannerContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  gradientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 20,
  },
  arrowContainer: {
    marginLeft: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Share Buttons
  shareButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  shareMethodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Colors.card,
  },
  whatsappButton: {
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
  },
  smsButton: {
    backgroundColor: `${Colors.primary}15`,
  },
  moreButton: {
    backgroundColor: Colors.card,
  },
  shareMethodIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareMethodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },

  // Copy Link Row
  copyLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copyLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  copyLinkText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 10,
    flex: 1,
  },
  copyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
