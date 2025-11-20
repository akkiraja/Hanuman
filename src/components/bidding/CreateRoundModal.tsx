import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import { X, Plus, IndianRupee, Calendar, AlertCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import SafeBlurView from '../SafeBlurView';
import { useColorScheme } from 'react-native';

interface CreateRoundModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateRound: (prizeAmount: number) => Promise<void> | void;
  groupPoolAmount: number;
  isLoading?: boolean;
}

export default function CreateRoundModal({
  visible,
  onClose,
  onCreateRound,
  groupPoolAmount,
  isLoading = false
}: CreateRoundModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prizeAmount, setPrizeAmount] = useState(groupPoolAmount.toString());
  
  // Fixed 1 hour duration
  const FIXED_HOURS = 1;

  const handleCreate = async () => {
    const amount = parseFloat(prizeAmount);
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid prize amount');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await onCreateRound(amount);
      setPrizeAmount(groupPoolAmount.toString());
      onClose();
    } catch (error) {
      console.error('Create round error:', error);
      Alert.alert('Error', 'Failed to start live bidding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setPrizeAmount(groupPoolAmount.toString());
      onClose();
    }
  };

  const endTime = new Date(Date.now() + FIXED_HOURS * 60 * 60 * 1000);
  const parsedPrize = parseFloat(prizeAmount) || 0;
  const minimumBid = Math.floor(parsedPrize * 0.1); // 10% of prize amount as minimum bid

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
              <Text style={styles.title}>Create New Round</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.body}>
              {/* Prize Amount Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Prize Amount</Text>
                <View style={styles.inputContainer}>
                  <IndianRupee size={20} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={prizeAmount}
                    onChangeText={setPrizeAmount}
                    placeholder="Enter prize amount"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                </View>
                <Text style={styles.inputNote}>
                  Default: ₹{groupPoolAmount.toLocaleString()} (You can modify this)
                </Text>
              </View>

            </View>
            
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.fullWidthButton,
                  styles.confirmButton,
                  isSubmitting && styles.disabledButton
                ]}
                onPress={handleCreate}
                disabled={isSubmitting}
              >
                <Plus size={16} color={Colors.background} />
                <Text style={[
                  styles.confirmButtonText,
                  isSubmitting && styles.disabledButtonText
                ]}>
                  {isSubmitting ? 'Starting...' : 'Start Live Bidding'}
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
  groupInfo: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  groupInfoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  poolAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.money,
    marginBottom: 4,
  },
  groupInfoNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
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
  hoursLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  inputNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  fullWidthButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
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