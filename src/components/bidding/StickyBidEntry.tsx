import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import SafeBlurView from '../SafeBlurView';
import { TrendingDown } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useColorScheme } from 'react-native';

interface StickyBidEntryProps {
  bidAmount: string;
  setBidAmount: (amount: string) => void;
  userCurrentBid: any;
  currentRound: any;
  isPlacingBid: boolean;
  onPlaceBid: () => void;
  canPlaceBid: boolean;
}

export default function StickyBidEntry({
  bidAmount,
  setBidAmount,
  userCurrentBid,
  currentRound,
  isPlacingBid,
  onPlaceBid,
  canPlaceBid
}: StickyBidEntryProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  if (!canPlaceBid) return null;
  
  return (
  <SafeBlurView
  style={styles.stickyContainer}
  tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
  intensity={100}
  >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(248,250,252,0.9)' }]}>
        <View style={styles.content}>
          {/* Current Bid Status */}
          {userCurrentBid && (
            <View style={styles.currentBidBanner}>
              <Text style={styles.currentBidText}>
                You already bid: ₹{userCurrentBid.bidAmount.toLocaleString()}
              </Text>
            </View>
          )}
          
          {/* Bid Input */}
          <View style={styles.bidInputContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.bidInput}
              value={bidAmount}
              onChangeText={setBidAmount}
              placeholder={`Min: ${currentRound.minimumBid?.toLocaleString() || '0'}`}
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
              editable={!isPlacingBid}
            />
            
            <TouchableOpacity
              style={[
                styles.placeBidButton,
                (!bidAmount || isPlacingBid) && styles.disabledButton
              ]}
              onPress={onPlaceBid}
              disabled={!bidAmount || isPlacingBid}
            >
              <TrendingDown size={18} color={Colors.background} />
              <Text style={styles.placeBidText}>
                {isPlacingBid ? 'Placing...' : userCurrentBid ? 'Update' : 'Place Bid'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeBlurView>
  );
}

const styles = StyleSheet.create({
  stickyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  overlay: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34, // Account for safe area
  },
  content: {
    gap: 12,
  },
  currentBidBanner: {
    backgroundColor: Colors.warning + '20',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  currentBidText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
    textAlign: 'center',
  },
  bidInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 56, // Ensure consistent height
  },
  rupeeSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  bidInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeBidButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 100, // Ensure consistent button width
  },
  placeBidText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.background,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.5,
  },
});