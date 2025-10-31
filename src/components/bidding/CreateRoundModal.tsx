import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import { X, Plus, IndianRupee, Calendar, AlertCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import SafeBlurView from '../SafeBlurView';
import { useColorScheme } from 'react-native';

interface CreateRoundModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateRound: (biddingHours: number) => Promise<void>;
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
  const [biddingHours, setBiddingHours] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    const hours = parseInt(biddingHours);
    
    if (isNaN(hours) || hours <= 0) {
      Alert.alert('Invalid Time', 'Please enter a valid bidding duration');
      return;
    }
    
    if (hours > 72) {
      Alert.alert(
        'Duration Too Long',
        'Bidding duration cannot exceed 72 hours (3 days)'
      );
      return;
    }
    
    try {
      setIsSubmitting(true);
      await onCreateRound(hours);
      setBiddingHours('');
      onClose();
    } catch (error) {
      console.error('Create round error:', error);
      Alert.alert('Error', 'Failed to create round. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setBiddingHours('');
      onClose();
    }
  };

  const hours = parseInt(biddingHours) || 0;
  const isValidHours = hours > 0 && hours <= 72;
  const endTime = hours > 0 ? new Date(Date.now() + hours * 60 * 60 * 1000) : null;
  const minimumBid = Math.floor(groupPoolAmount * 0.1); // 10% of group pool as minimum bid

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
              {/* Group Info */}
              <View style={styles.groupInfo}>
                <Text style={styles.groupInfoTitle}>Prize Amount (Fixed)</Text>
                <Text style={styles.poolAmount}>
                  ₹{groupPoolAmount.toLocaleString()}
                </Text>
                <Text style={styles.groupInfoNote}>
                  This is the total prize amount for this round
                </Text>
              </View>
              
              {/* Bidding Duration Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Bidding Duration (Hours)</Text>
                <View style={styles.inputContainer}>
                  <Calendar size={20} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={biddingHours}
                    onChangeText={setBiddingHours}
                    placeholder="Enter hours (e.g., 24)"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="numeric"
                    autoFocus
                    editable={!isSubmitting}
                  />
                  <Text style={styles.hoursLabel}>hours</Text>
                </View>
              </View>
              
              {/* Round Preview */}
              {hours > 0 && (
                <View style={[
                  styles.previewSection,
                  isValidHours ? styles.validPreview : styles.invalidPreview
                ]}>
                  <View style={styles.previewHeader}>
                    <Calendar size={16} color={isValidHours ? Colors.success : Colors.error} />
                    <Text style={[
                      styles.previewTitle,
                      { color: isValidHours ? Colors.success : Colors.error }
                    ]}>
                      {isValidHours ? 'Round Preview' : 'Invalid Duration'}
                    </Text>
                  </View>
                  
                  {isValidHours ? (
                    <>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Prize Amount:</Text>
                        <Text style={styles.previewValue}>₹{groupPoolAmount.toLocaleString()}</Text>
                      </View>
                      
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Duration:</Text>
                        <Text style={[styles.previewValue, { color: Colors.primary }]}>
                          {hours} hour{hours !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Ends At:</Text>
                        <Text style={styles.previewValue}>
                          {endTime?.toLocaleDateString()} {endTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Minimum Bid:</Text>
                        <Text style={[styles.previewValue, { color: Colors.primary }]}>
                          ₹{minimumBid.toLocaleString()}
                        </Text>
                      </View>
                      
                      <Text style={styles.previewNote}>
                        Live bidding will start immediately after creation
                      </Text>
                    </>
                  ) : (
                    <View style={styles.errorSection}>
                      <AlertCircle size={16} color={Colors.error} />
                      <Text style={styles.errorText}>
                        {hours > 72
                          ? 'Duration cannot exceed 72 hours (3 days)'
                          : 'Please enter a valid duration (1-72 hours)'
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
                  (!isValidHours || isSubmitting) && styles.disabledButton
                ]}
                onPress={handleCreate}
                disabled={!isValidHours || isSubmitting}
              >
                <Plus size={16} color={Colors.background} />
                <Text style={[
                  styles.confirmButtonText,
                  (!isValidHours || isSubmitting) && styles.disabledButtonText
                ]}>
                  {isSubmitting ? 'Creating...' : 'Create Round'}
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