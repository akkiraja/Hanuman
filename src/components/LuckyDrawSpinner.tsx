import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  SafeAreaView,
  Dimensions,
  BackHandler,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Trophy, Gift } from 'lucide-react-native';

interface LuckyDrawSpinnerProps {
  visible: boolean;
  onComplete: (winner: any) => void;
  winner: any;
  prizeAmount: number;
  drawId?: string; // NEW: Draw ID for server finalization
  startTimestamp?: string; // NEW: Server timestamp for sync
  durationSeconds?: number; // NEW: Server-defined duration
  onRequestFinalize?: (drawId: string) => void; // NEW: Callback when animation completes
}

const { width, height } = Dimensions.get('window');

export default function LuckyDrawSpinner({ 
  visible, 
  onComplete, 
  winner, 
  prizeAmount,
  drawId,
  startTimestamp,
  durationSeconds = 60, // Default 60 seconds
  onRequestFinalize
}: LuckyDrawSpinnerProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const [showWinner, setShowWinner] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible && startTimestamp) {
      setShowWinner(false);
      setIsAnimating(true);
      
      // Compute remaining time from server timestamp
      const startTime = new Date(startTimestamp).getTime();
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      const remainingSeconds = Math.max(0, durationSeconds - elapsed);
      
      console.log('🎲 Spinner sync:', {
        startTime: new Date(startTimestamp).toISOString(),
        now: new Date(now).toISOString(),
        elapsed: elapsed.toFixed(2),
        remainingSeconds: remainingSeconds.toFixed(2),
        durationSeconds
      });
      
      setTimeLeft(Math.ceil(remainingSeconds));
      startSpinAnimation(remainingSeconds * 1000); // Convert to milliseconds
      startCountdown(Math.ceil(remainingSeconds));
    }
  }, [visible, startTimestamp, durationSeconds]);

  // Prevent back button during animation
  useEffect(() => {
    if (isAnimating) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Swallow back button press during animation
        return true;
      });
      
      return () => backHandler.remove();
    }
  }, [isAnimating]);

  const startCountdown = (initialTime: number) => {
    let currentTime = initialTime;
    const interval = setInterval(() => {
      currentTime -= 1;
      setTimeLeft(Math.max(0, currentTime));
      
      if (currentTime <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  };

  const startSpinAnimation = (remainingMs: number) => {
    // Reset animation values
    spinValue.setValue(0);
    scaleValue.setValue(0);

    // If less than 1.5s remaining, treat as near-end
    if (remainingMs < 1500) {
      console.log('⚡ Near-end detected, showing reveal immediately');
      setShowWinner(true);
      setIsAnimating(false);
      if (drawId && onRequestFinalize) {
        onRequestFinalize(drawId);
      }
      // Auto close after 3 seconds
      setTimeout(() => {
        onComplete(winner);
      }, 3000);
      return;
    }

    // Calculate rotations based on remaining time (1 rotation per second)
    const totalRotations = remainingMs / 1000;
    const fastRotations = Math.max(0, totalRotations - 2); // All but last 2 seconds
    const slowRotations = 2; // Last 2 seconds slow down
    
    // Start with fast spinning
    const fastSpin = Animated.timing(spinValue, {
      toValue: fastRotations,
      duration: Math.max(0, remainingMs - 2000),
      easing: Easing.linear,
      useNativeDriver: true,
    });

    // Then slow down for final 2 seconds
    const slowSpin = Animated.timing(spinValue, {
      toValue: fastRotations + slowRotations,
      duration: Math.min(2000, remainingMs),
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    // Scale in animation for spinner
    const scaleIn = Animated.spring(scaleValue, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    });

    // Start animations
    scaleIn.start();
    
    Animated.sequence([
      fastSpin,
      slowSpin
    ]).start(() => {
      // Animation complete, request server finalization
      console.log('✅ Animation complete, requesting finalization for drawId:', drawId);
      setIsAnimating(false);
      
      if (drawId && onRequestFinalize) {
        onRequestFinalize(drawId);
      }
      
      // Show winner after brief delay
      setTimeout(() => {
        setShowWinner(true);
        // Auto close after 3 seconds
        setTimeout(() => {
          onComplete(winner);
        }, 3000);
      }, 500);
    });
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Prevent closing during animation
        if (!isAnimating && showWinner) {
          onComplete(winner);
        }
      }}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {!showWinner ? (
            <>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>🎲 Lucky Draw in Progress</Text>
                <Text style={styles.subtitle}>Building suspense...</Text>
              </View>

              {/* Countdown */}
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>{timeLeft}</Text>
                <Text style={styles.countdownLabel}>seconds remaining</Text>
              </View>

              {/* Spinner */}
              <View style={styles.spinnerContainer}>
                <Animated.View 
                  style={[
                    styles.spinner,
                    {
                      transform: [
                        { rotate: spin },
                        { scale: scaleValue }
                      ]
                    }
                  ]}
                >
                  <View style={styles.spinnerInner}>
                    <Gift size={60} color={Colors.warning} />
                  </View>
                </Animated.View>
              </View>

              {/* Prize Amount */}
              <View style={styles.prizeContainer}>
                <Text style={styles.prizeLabel}>Prize Amount</Text>
                <Text style={styles.prizeAmount}>₹{prizeAmount.toLocaleString()}</Text>
              </View>
            </>
          ) : (
            /* Winner Reveal */
            <View style={styles.winnerContainer}>
              <View style={styles.winnerIcon}>
                <Trophy size={80} color={Colors.warning} />
              </View>
              <Text style={styles.congratsText}>🎉 Congratulations! 🎉</Text>
              <Text style={styles.winnerName}>{winner.memberName}</Text>
              <Text style={styles.winnerPrize}>Won ₹{prizeAmount.toLocaleString()}!</Text>
              <Text style={styles.autoCloseText}>Closing automatically...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  countdownLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  spinner: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.card,
    borderWidth: 8,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Colors.shadow,
  },
  spinnerInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeContainer: {
    alignItems: 'center',
  },
  prizeLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  prizeAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.success,
  },
  winnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  winnerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  winnerPrize: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.success,
    textAlign: 'center',
    marginBottom: 30,
  },
  autoCloseText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});