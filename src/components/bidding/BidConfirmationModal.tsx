import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import { X, TrendingDown, AlertTriangle, IndianRupee } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { BidRound } from '../../types/chitFund';
import SafeBlurView from '../SafeBlurView';
import { useColorScheme } from 'react-native';

interface BidConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void>;
  currentRound: BidRound | null;
  existingBid?: number;
  isLoading?: boolean;
}

export default function BidConfirmationModal({
  visible,
  onClose,
  onConfirm,
  currentRound,
  existingBid,
  isLoading = false
}: BidConfirmationModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [bidAmount, setBidAmount] = useState(existingBid?.toString() || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    const amount = parseInt(bidAmount);
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid bid amount');
      return;
    }
    
    if (currentRound?.minimumBid && amount < currentRound.minimumBid) {
      Alert.alert(
        'Bid Too Low',
        `Minimum bid is ₹${currentRound.minimumBid.toLocaleString()}`
      );
      return;
    }
    
    try {
      setIsSubmitting(true);
      await onConfirm(amount);
      setBidAmount('');
      onClose();
    } catch (error) {
      console.error('Bid confirmation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setBidAmount('');
      onClose();
    }
  };

  const amount = parseInt(bidAmount) || 0;
  const isValidAmount = amount > 0 && (!currentRound?.minimumBid || amount >= currentRound.minimumBid);
  const potentialSavings = currentRound ? currentRound.prizeAmount - amount : 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <SafeBlurView
        style={styles.container}
        tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
        intensity={100}
      >
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(248,250,252,0.5)' }]}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {existingBid ? 'Update Your Bid' : 'Place Your Bid'}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.body}>
              {/* Round Info */}
              <View style={styles.roundInfo}>
                <Text style={styles.roundTitle}>Round {currentRound?.roundNumber}</Text>
                <Text style={styles.prizeAmount}>
                  Prize: ₹{currentRound?.prizeAmount.toLocaleString()}
                </Text>
                {currentRound?.minimumBid && (
                  <Text style={styles.minimumBid}>
                    Minimum: ₹{currentRound.minimumBid.toLocaleString()}
                  </Text>
                )}
              </View>
              
              {/* Bid Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Your Bid Amount</Text>
                <View style={styles.inputContainer}>
                  <IndianRupee size={20} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={bidAmount}
                    onChangeText={setBidAmount}
                    placeholder="Enter amount"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="numeric"
                    autoFocus
                    editable={!isSubmitting}
                  />
                </View>
              </View>
              
              {/* Bid Preview */}
              {amount > 0 && (
                <View style={[
                  styles.previewSection,
                  isValidAmount ? styles.validPreview : styles.invalidPreview
                ]}>
                  <View style={styles.previewHeader}>
                    <TrendingDown size={16} color={isValidAmount ? Colors.success : Colors.error} />
                    <Text style={[
                      styles.previewTitle,
                      { color: isValidAmount ? Colors.success : Colors.error }
                    ]}>
                      {isValidAmount ? 'Bid Preview' : 'Invalid Bid'}
                    </Text>
                  </View>
                  
                  {isValidAmount ? (
                    <>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Your Bid:</Text>
                        <Text style={styles.previewValue}>₹{amount.toLocaleString()}</Text>
                      </View>
                      
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Potential Savings:</Text>
                        <Text style={[styles.previewValue, { color: Colors.success }]}>
                          ₹{potentialSavings.toLocaleString()}
                        </Text>
                      </View>
                      
                      <Text style={styles.previewNote}>
                        If you win, you'll receive ₹{currentRound?.prizeAmount.toLocaleString()} and save ₹{potentialSavings.toLocaleString()}
                      </Text>
                    </>
                  ) : (
                    <View style={styles.errorSection}>
                      <AlertTriangle size={16} color={Colors.error} />
                      <Text style={styles.errorText}>
                        {amount < (currentRound?.minimumBid || 0)
                          ? `Bid must be at least ₹${currentRound?.minimumBid?.toLocaleString()}`
                          : 'Please enter a valid amount'
                        }
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  (!isValidAmount || isSubmitting) && styles.disabledButton
                ]}
                onPress={handleConfirm}
                disabled={!isValidAmount || isSubmitting}
              >
                <Text style={[
                  styles.confirmButtonText,
                  (!isValidAmount || isSubmitting) && styles.disabledButtonText
                ]}>
                  {isSubmitting ? 'Placing Bid...' : existingBid ? 'Update Bid' : 'Place Bid'}
                </Text>
              </TouchableOpacity>
            </View>
            </View>
            </View>
            </SafeBlurView>
            </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    ...Colors.shadow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  roundInfo: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  roundTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  prizeAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.money,
    marginBottom: 4,
  },
  minimumBid: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  previewSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  validPreview: {
    backgroundColor: Colors.success + '10',
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  invalidPreview: {
    backgroundColor: Colors.error + '10',
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  previewNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  errorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.surface,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.5,
  },
  disabledButtonText: {
    color: Colors.background,
    opacity: 0.7,
  },
});