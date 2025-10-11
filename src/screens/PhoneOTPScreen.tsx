import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, ArrowLeft, MessageSquare } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner-native';

interface PhoneOTPScreenProps {
  onBack: () => void;
  step?: 'phone' | 'otp';
  onStepChange?: (step: 'phone' | 'otp') => void;
}

export default function PhoneOTPScreen({ onBack, step: externalStep, onStepChange }: PhoneOTPScreenProps) {
  const { signInWithPhone, verifyPhoneOTP, isLoading, error, clearError, isAuthenticated, user } = useAuthStore();
  const [internalStep, setInternalStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const otpInputRef = useRef<TextInput>(null);
  
  // Use external step if provided, otherwise use internal step
  const step = externalStep || internalStep;
  const setStep = onStepChange || setInternalStep;

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);
  
  // Clear errors when step changes
  useEffect(() => {
    clearError();
  }, [step, clearError]);
  
  // Remove the problematic useEffect that was causing race conditions
  // Navigation will now be handled directly in handleVerifyOTP

  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters except +
    let cleaned = text.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +91
    if (!cleaned.startsWith('+91')) {
      if (cleaned.startsWith('91')) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('+')) {
        cleaned = '+91' + cleaned.substring(1);
      } else {
        cleaned = '+91' + cleaned;
      }
    }
    
    return cleaned;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Indian phone number validation: +91 followed by 10 digits
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleSendOTP = async () => {
    clearError();
    
    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid Indian phone number');
      return;
    }

    try {
      console.log('🔄 Attempting to send OTP to:', phoneNumber);
      await signInWithPhone(phoneNumber);
      
      // Always proceed to OTP step if no error was thrown
      console.log('✅ OTP sent, switching to verification step');
      setStep('otp');
      setCountdown(60); // 60 seconds countdown
      toast.success('OTP sent successfully!');
      
      // Auto-focus OTP input
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      // Don't switch to OTP step if there was an error
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOTP = async () => {
    if (isVerifying) return; // Prevent concurrent calls
    
    clearError();
    
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP');
      return;
    }

    setIsVerifying(true);
    setVerificationAttempted(true);
    
    try {
      console.log('🔄 Attempting to verify OTP:', otp, 'for phone:', phoneNumber);
      
      const result = await verifyPhoneOTP(phoneNumber, otp);
      
      if (result.success) {
        console.log('✅ OTP verification successful!');
        clearError(); // Clear any stale errors immediately
        
        // Force clear error state to prevent false error popups
        setVerificationAttempted(false);
        
        if (result.profile) {
          // Existing user - show success and navigate to dashboard
          toast.success('Login successful! Redirecting to dashboard...');
          console.log('✅ Existing user authenticated - App.tsx will handle navigation');
        } else {
          // New user - navigate to name collection
          console.log('🆕 New user - staying in auth flow for name collection');
          toast.success('OTP verified! Please complete your profile.');
        }
      } else {
        console.error('❌ OTP verification failed:', result.error);
        // Error is already set in store, UI will show it
      }
    } catch (error) {
      console.error('💥 Unexpected verification error:', error);
      // Fallback error handling
    } finally {
      setIsVerifying(false);
      setVerificationAttempted(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    try {
      await signInWithPhone(phoneNumber);
      setCountdown(60);
      toast.success('OTP resent successfully!');
    } catch (error) {
      console.error('Resend OTP error:', error);
    }
  };

  const handleOTPChange = (text: string) => {
    // Clear any existing errors when user starts typing
    if (error) {
      clearError();
    }
    
    // Only allow numeric characters and limit to 6 digits
    const cleaned = text.replace(/[^\d]/g, '').substring(0, 6);
    setOtp(cleaned);
    
    // Removed auto-verification to prevent false "invalid OTP" popups
    // Users must now click "Verify OTP" button manually
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtp('');
      setCountdown(0);
    } else {
      onBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {step === 'phone' ? 'Login with Phone' : 'Verify OTP'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'phone' 
                  ? 'Enter your phone number to receive OTP'
                  : `Enter the 6-digit code sent to ${phoneNumber}`
                }
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {step === 'phone' ? (
              // Phone Number Input
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputContainer}>
                    <Phone size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={phoneNumber}
                      onChangeText={handlePhoneChange}
                      placeholder="+91 Enter phone number"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="phone-pad"
                      maxLength={14} // +91 + 10 digits
                      autoFocus
                    />
                  </View>
                  <Text style={styles.helperText}>
                    We'll send a 6-digit verification code to this number
                  </Text>
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Send OTP Button */}
                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={handleSendOTP}
                  disabled={isLoading}
                >
                  <Text style={styles.submitButtonText}>
                    {isLoading ? 'Sending OTP...' : 'Send OTP'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              // OTP Input
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <View style={styles.otpContainer}>
                    <MessageSquare size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      ref={otpInputRef}
                      style={[styles.input, styles.otpInput]}
                      value={otp}
                      onChangeText={handleOTPChange}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                  <Text style={styles.helperText}>
                    {countdown > 0 
                      ? `Resend OTP in ${countdown}s`
                      : 'Didn\'t receive the code?'
                    }
                  </Text>
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Verify Button */}
                <TouchableOpacity
                  style={[styles.submitButton, (isLoading || otp.length !== 6) && styles.submitButtonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={isLoading || otp.length !== 6}
                >
                  <Text style={styles.submitButtonText}>
                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                  </Text>
                </TouchableOpacity>

                {/* Resend OTP */}
                <TouchableOpacity
                  style={[styles.resendButton, countdown > 0 && styles.resendButtonDisabled]}
                  onPress={handleResendOTP}
                  disabled={countdown > 0 || isLoading}
                >
                  <Text style={[styles.resendButtonText, countdown > 0 && styles.resendButtonTextDisabled]}>
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.infoText}>
              📱 Standard SMS charges may apply
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 56,
  },
  otpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    height: '100%',
  },
  otpInput: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 4,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: Colors.error + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  info: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});