import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  BackHandler,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Gift } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface MemberDrawSpinnerProps {
  groupName: string;
  visible: boolean;
  onComplete: () => void;
  startTimestamp?: string; // NEW: Server timestamp for sync
  durationSeconds?: number; // NEW: Server-defined duration
  prizeAmount?: number; // NEW: Show prize amount
}

export default function MemberDrawSpinner({ 
  groupName, 
  visible, 
  onComplete,
  startTimestamp,
  durationSeconds = 60, // Default 60 seconds
  prizeAmount
}: MemberDrawSpinnerProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible && startTimestamp) {
      setIsAnimating(true);
      
      // Compute remaining time from server timestamp
      const startTime = new Date(startTimestamp).getTime();
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      const remainingSeconds = Math.max(0, durationSeconds - elapsed);
      
      console.log('🎲 Member spinner sync:', {
        groupName,
        startTime: new Date(startTimestamp).toISOString(),
        now: new Date(now).toISOString(),
        elapsed: elapsed.toFixed(2),
        remainingSeconds: remainingSeconds.toFixed(2),
        durationSeconds
      });
      
      setTimeLeft(Math.ceil(remainingSeconds));
      startSpinAnimation(remainingSeconds * 1000);
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
    spinValue.setValue(0);
    scaleValue.setValue(0);
    fadeValue.setValue(0);

    // If less than 1.5s remaining, keep visible but show minimal animation
    if (remainingMs < 1500) {
      console.log('⚡ Member near-end detected');
      fadeValue.setValue(1);
      scaleValue.setValue(1);
      setIsAnimating(false);
      return;
    }

    // Calculate rotations based on remaining time
    const totalRotations = remainingMs / 1000;
    const fastRotations = Math.max(0, totalRotations - 2);
    const slowRotations = 2;

    const fadeIn = Animated.timing(fadeValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    });

    const scaleIn = Animated.spring(scaleValue, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    });

    const fastSpin = Animated.timing(spinValue, {
      toValue: fastRotations,
      duration: Math.max(0, remainingMs - 2000),
      easing: Easing.linear,
      useNativeDriver: true,
    });

    const slowSpin = Animated.timing(spinValue, {
      toValue: fastRotations + slowRotations,
      duration: Math.min(2000, remainingMs),
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    fadeIn.start();
    scaleIn.start();
    
    Animated.sequence([
      fastSpin,
      slowSpin
    ]).start(() => {
      console.log('✅ Member animation complete, waiting for server reveal');
      setIsAnimating(false);
      // Don't auto-complete - wait for server UPDATE event
    });
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Animated.View 
      style={[styles.overlay, { opacity: fadeValue }]}
      pointerEvents={isAnimating ? 'auto' : 'box-none'} // Block touches during animation
    >
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.95)', 'rgba(59, 130, 246, 0.95)']}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🎲 Lucky Draw in Progress</Text>
            <Text style={styles.groupName}>{groupName}</Text>
          </View>

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>{timeLeft}</Text>
            <Text style={styles.countdownLabel}>seconds</Text>
          </View>

          {/* Spinner */}
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
              <Gift size={50} color={Colors.warning} />
            </View>
          </Animated.View>

          {/* Prize Amount (if provided) */}
          {prizeAmount && (
            <View style={styles.prizeContainer}>
              <Text style={styles.prizeLabel}>Prize Amount</Text>
              <Text style={styles.prizeAmount}>₹{prizeAmount.toLocaleString()}</Text>
            </View>
          )}

          <Text style={styles.waitingText}>Waiting for results...</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  container: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginHorizontal: 40,
    ...Colors.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  groupName: {
    fontSize: 18,
    color: Colors.warning,
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  countdownText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  countdownLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  spinner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: Colors.warning + '40',
  },
  spinnerInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.warning + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  prizeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  prizeAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.warning,
  },
  waitingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});