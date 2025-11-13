import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Share,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Share2, X, Copy, MessageCircle, MoreHorizontal } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { toast } from 'sonner-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';

interface GrowYourGroupBannerProps {
  groupId: string;
  groupName: string;
  currentMembers: number;
  totalMembers: number;
  userName: string;
}

export default function GrowYourGroupBanner({
  groupId,
  groupName,
  currentMembers,
  totalMembers,
  userName,
}: GrowYourGroupBannerProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Generate invite link dynamically
  const inviteLink = `https://bhishi.app/join/${groupId}`;

  // Share message
  const shareMessage = `${userName} invited you to join "${groupName}" on Bhishi.\nLet's save together 💰\n${inviteLink}`;

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
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
        await Share.share({
          message: shareMessage,
          url: whatsappUrl,
        });
      } else if (method === 'sms') {
        // SMS sharing
        await Share.share({
          message: shareMessage,
        });
      } else {
        // General share
        await Share.share({
          message: shareMessage,
          title: `Join ${groupName} on Bhishi`,
        });
      }
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(inviteLink);
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
              <Text style={styles.bannerTitle}>Invite Friends Now</Text>
              <Text style={styles.bannerSubtitle}>
                Share link via WhatsApp, SMS, or copy link
              </Text>
            </View>

            {/* Right: Member Count */}
            <View style={styles.countContainer}>
              <Text style={styles.countText}>
                {currentMembers} of {totalMembers}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <SafeAreaView edges={['bottom']}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderContent}>
                  <Text style={styles.modalTitle}>Share your Bhishi group</Text>
                  <Text style={styles.modalSubtitle}>
                    Invite your friends to join and start saving together 💰
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowShareModal(false)}
                >
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              {/* Share Buttons */}
              <View style={styles.shareButtonsContainer}>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => handleShare('whatsapp')}
                >
                  <View style={[styles.shareIconContainer, { backgroundColor: '#25D366' }]}>
                    <MessageCircle size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.shareButtonText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => handleShare('sms')}
                >
                  <View style={[styles.shareIconContainer, { backgroundColor: Colors.primary }]}>
                    <MessageCircle size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.shareButtonText}>SMS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => handleShare()}
                >
                  <View style={[styles.shareIconContainer, { backgroundColor: Colors.textSecondary }]}>
                    <MoreHorizontal size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.shareButtonText}>More</Text>
                </TouchableOpacity>
              </View>

              {/* Copy Link Section */}
              <View style={styles.copyLinkSection}>
                <Text style={styles.copyLinkLabel}>Invite Link</Text>
                <View style={styles.copyLinkContainer}>
                  <TextInput
                    style={styles.linkInput}
                    value={inviteLink}
                    editable={false}
                    numberOfLines={1}
                  />
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={handleCopyLink}
                  >
                    <Copy size={18} color={Colors.primary} />
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Message Preview */}
              <View style={styles.messagePreviewSection}>
                <Text style={styles.messagePreviewLabel}>Message Preview</Text>
                <View style={styles.messagePreviewBox}>
                  <Text style={styles.messagePreviewText}>{shareMessage}</Text>
                </View>
              </View>
            </SafeAreaView>
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#EA580C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
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
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 18,
  },
  countContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalHeaderContent: {
    flex: 1,
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Share Buttons
  shareButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  shareButton: {
    alignItems: 'center',
    gap: 8,
  },
  shareIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },

  // Copy Link Section
  copyLinkSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  copyLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  copyLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.border + '20',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Message Preview
  messagePreviewSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  messagePreviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  messagePreviewBox: {
    backgroundColor: Colors.border + '20',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messagePreviewText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
