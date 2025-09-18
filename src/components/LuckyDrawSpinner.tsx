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
} from 'react-native';
import { Colors } from '../constants/colors';
import { Trophy, Gift } from 'lucide-react-native';

interface LuckyDrawSpinnerProps {
  visible: boolean;
  onComplete: (winner: any) => void;
  winner: any;
  prizeAmount: number;
}

const { width, height } = Dimensions.get('window');

export default function LuckyDrawSpinner({ 
  visible, 
  onComplete, 
  winner, 
  prizeAmount 
}: LuckyDrawSpinnerProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const [showWinner, setShowWinner] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (visible) {
      setShowWinner(false);
      setTimeLeft(30);
      startSpinAnimation();
      startCountdown();
    }
  }, [visible]);

  const startCountdown = () => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startSpinAnimation = () => {
    // Reset animation values
    spinValue.setValue(0);
    scaleValue.setValue(0);

    // Start with fast spinning
    const fastSpin = Animated.timing(spinValue, {
      toValue: 20, // 20 full rotations in first 25 seconds
      duration: 25000,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    // Then slow down for final 5 seconds
    const slowSpin = Animated.timing(spinValue, {
      toValue: 22, // 2 more rotations but slower
      duration: 5000,
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
      // Animation complete, show winner
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