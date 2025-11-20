import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User, Phone, Eye, EyeOff, MessageSquare, ArrowLeft } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner-native';

export default function AuthScreen() {
  console.log('🏠 AuthScreen component mounted/re-rendered');
  const { signIn, signUp, resetPassword, signInWithPhone, verifyPhoneOTP, isLoading, error, clearError, isAuthenticated, user, authStep, setAuthStep, phoneNumber: storedPhoneNumber, createUserProfile } = useAuthStore();
  const step = authStep;
  const setStep = setAuthStep;
  
  // Step state is now persistent in authStore - survives component re-mounts!
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(storedPhoneNumber || '+91');
  const [userName, setUserName] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const otpInputRef = useRef<TextInput>(null);

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
  
  // Monitor auth state changes after OTP verification
  useEffect(() => {
    if (verificationAttempted && isAuthenticated && user) {
      console.log('🎉 Auth state updated after OTP - user is now authenticated!');
      toast.success('Login successful! Redirecting to dashboard...');
      setVerificationAttempted(false);
    }
  }, [verificationAttempted, isAuthenticated, user]);

  const formatPhoneNumber = (text: string) => {
    let cleaned = text.replace(/[^\d+]/g, '');
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
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleSendOTP = async () => {
    clearError();
    
    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid Indian phone number');
      return;
    }

    // FIRST: Navigate to OTP screen immediately
    console.log('🔄 Step 1: Navigating to OTP screen first...');
    setStep('otp');
    setCountdown(60);
    setSendingOTP(true);
    
    // Focus OTP input
    setTimeout(() => {
      otpInputRef.current?.focus();
    }, 100);

    // THEN: Send OTP in background
    try {
      console.log('🔄 Step 2: Now sending OTP to:', phoneNumber);
      await signInWithPhone(phoneNumber);
      
      console.log('✅ OTP sent successfully in background!');
      setSendingOTP(false);
      toast.success('OTP sent successfully!');
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      // If OTP sending fails, go back to phone screen
      setSendingOTP(false);
      setStep('phone');
      setCountdown(0);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOTP = async () => {
    clearError();
    
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP');
      return;
    }

    setVerificationAttempted(true);
    
    try {
      console.log('🔄 Attempting to verify OTP:', otp, 'for phone:', storedPhoneNumber || phoneNumber);
      
      const result = await verifyPhoneOTP(storedPhoneNumber || phoneNumber, otp);
      
      if (result.success) {
        console.log('✅ OTP verification successful!');
        clearError(); // Clear any stale errors immediately
        
        if (result.profile) {
          toast.success('Login successful! Redirecting to dashboard...');
        } else {
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
    
    const cleaned = text.replace(/[^\d]/g, '').substring(0, 6);
    setOtp(cleaned);
    
    // Removed auto-verification to prevent false "invalid OTP" popups
    // Users must now click "Verify OTP" button manually
  };

  const handleEmailSubmit = async () => {
    clearError();
    
    if (!formData.email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!formData.password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    try {
      await signIn(formData.email, formData.password);
    } catch (error) {
      console.error('Email auth error:', error);
    }
  };
  
  const handleNameSubmit = async () => {
    clearError();
    
    if (!userName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      console.log('👤 Creating profile with name:', userName);
      await createUserProfile(userName.trim());
      console.log('✅ Profile created, should redirect to dashboard');
      toast.success('Welcome! Your account has been created.');
    } catch (error) {
      console.error('❌ Name submit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create your profile. Please try again.';
      
      if (errorMessage.includes('session')) {
        Alert.alert('Session Expired', 'Your login session has expired. Please start the login process again.');
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'phone': return 'Welcome to Bhishi';
      case 'otp': return 'Verify OTP';
      case 'email': return 'Email Login';
      case 'name': return 'Complete Your Profile';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'phone': return 'Enter your phone number to get started';
      case 'otp': return `Enter the 6-digit code sent to ${storedPhoneNumber || phoneNumber}`;
      case 'email': return 'Sign in with your email and password';
      case 'name': return 'Please enter your name to complete registration';
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
            {step !== 'phone' && (
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => {
                  if (step === 'otp') {
                    setStep('phone');
                    setOtp('');
                    setCountdown(0);
                  } else if (step === 'email') {
                    setStep('phone');
                  } else if (step === 'name') {
                    setStep('otp');
                    setUserName('');
                  }
                }}
              >
                <ArrowLeft size={24} color={Colors.text} />
              </TouchableOpacity>
            )}
            
            <View style={styles.headerContent}>
              <Text style={styles.title}>{getTitle()}</Text>
              <Text style={styles.subtitle}>{getSubtitle()}</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {step === 'phone' && (
              // Phone Number Input (Primary)
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
                      maxLength={14}
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

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Email Login Button (Secondary) */}
                <TouchableOpacity
                  style={styles.emailLoginButton}
                  onPress={() => setStep('email')}
                >
                  <Mail size={20} color={Colors.primary} />
                  <Text style={styles.emailLoginText}>Login with Email</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'otp' && (
              // OTP Input
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <View style={styles.inputContainer}>
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
                    {sendingOTP 
                      ? 'Sending OTP...' 
                      : countdown > 0 
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

            {step === 'email' && (
              // Email Login (Secondary)
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputContainer}>
                    <Mail size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.email}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                      placeholder="Enter your email"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoFocus
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.password}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                      placeholder="Enter your password"
                      placeholderTextColor={Colors.textSecondary}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color={Colors.textSecondary} />
                      ) : (
                        <Eye size={20} color={Colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={handleEmailSubmit}
                  disabled={isLoading}
                >
                  <Text style={styles.submitButtonText}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'name' && (
              // Name Collection (New User)
              <>
                <View style={styles.welcomeContainer}>
                  <Text style={styles.welcomeText}>🎉 Welcome!</Text>
                  <Text style={styles.welcomeSubtext}>Your phone number has been verified successfully</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputContainer}>
                    <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={userName}
                      onChangeText={setUserName}
                      placeholder="Enter your full name"
                      placeholderTextColor={Colors.textSecondary}
                      autoCapitalize="words"
                      autoComplete="name"
                      maxLength={50}
                      autoFocus
                    />
                  </View>
                  <Text style={styles.helperText}>
                    This will be your display name in the app
                  </Text>
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Complete Registration Button */}
                <TouchableOpacity
                  style={[styles.submitButton, (isLoading || !userName.trim()) && styles.submitButtonDisabled]}
                  onPress={handleNameSubmit}
                  disabled={isLoading || !userName.trim()}
                >
                  <Text style={styles.submitButtonText}>
                    {isLoading ? 'Creating Account...' : 'Complete Registration'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.infoText}>
              📱 By continuing, you agree to our Terms of Service
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
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
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    height: 52,
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
  eyeIcon: {
    padding: 4,
  },
  errorContainer: {
    backgroundColor: Colors.error + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    ...Colors.shadow,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
  },
  helperText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 4,
  },
  emailLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  emailLoginText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 16,
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
    alignItems: 'center',
    marginTop: 20,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginHorizontal: 16,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

});