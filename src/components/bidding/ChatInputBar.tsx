import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import SafeBlurView from '../SafeBlurView';
import { Send, TrendingDown } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useColorScheme } from 'react-native';

interface ChatInputBarProps {
  bidAmount: string;
  setBidAmount: (amount: string) => void;
  userCurrentBid: any;
  currentRound: any;
  isPlacingBid: boolean;
  onPlaceBid: () => void;
  canPlaceBid: boolean;
  isDisabledForWinner?: boolean;
}

export default function ChatInputBar({
  bidAmount,
  setBidAmount,
  userCurrentBid,
  currentRound,
  isPlacingBid,
  onPlaceBid,
  canPlaceBid,
  isDisabledForWinner = false
}: ChatInputBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  if (!canPlaceBid) {
    return (
      <SafeBlurView
        style={styles.inputContainer}
        tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
        intensity={100}
      >
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(248,250,252,0.9)' }]}>
          <View style={styles.disabledContainer}>
            <Text style={styles.disabledText}>
              {isDisabledForWinner 
                ? "You've already won a round. You cannot bid again." 
                : currentRound?.status === 'completed' 
                  ? 'Round Completed' 
                  : 'Bidding Not Active'
              }
            </Text>
          </View>
        </View>
      </SafeBlurView>
    );
  }
  
  const isValidBid = bidAmount && !isNaN(parseInt(bidAmount)) && parseInt(bidAmount) > 0;
  const canSend = isValidBid && !isPlacingBid;

  return (
    <SafeBlurView
      style={styles.inputContainer}
      tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
      intensity={100}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(248,250,252,0.9)' }]}>
        {/* Current bid status banner */}
        {userCurrentBid && (
          <View style={styles.currentBidBanner}>
            <TrendingDown size={14} color={Colors.warning} />
            <Text style={styles.currentBidText}>
              Your current bid: ₹{userCurrentBid.bidAmount.toLocaleString()}
            </Text>
          </View>
        )}
        
        {/* Chat-style input */}
        <View style={styles.bidInputContainer}>
          <View style={styles.inputWrapper}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.textInput}
              value={bidAmount}
              onChangeText={setBidAmount}
              placeholder={`Min: ${currentRound.minimumBid?.toLocaleString() || '0'}`}
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
              editable={!isPlacingBid}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={canSend ? onPlaceBid : undefined}
            />
          </View>
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              canSend ? styles.sendButtonActive : styles.sendButtonDisabled
            ]}
            onPress={onPlaceBid}
            disabled={!canSend}
          >
            {isPlacingBid ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <Send size={20} color={canSend ? Colors.background : Colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Helper text */}
        <Text style={styles.helperText}>
          {userCurrentBid 
            ? 'Enter a lower amount to update your bid' 
            : 'Enter your bid amount and tap send'
          }
        </Text>
      </View>
    </SafeBlurView>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    // Remove absolute positioning - now handled by KeyboardAvoidingView
    backgroundColor: 'transparent',
  },
  overlay: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16, // Reduced padding since SafeAreaView handles safe area
  },
  disabledContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabledText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  currentBidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 6,
  },
  currentBidText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
    flex: 1,
  },
  bidInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  rupeeSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    paddingVertical: 0, // Remove default padding
    minHeight: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  helperText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    opacity: 0.8,
  },
});