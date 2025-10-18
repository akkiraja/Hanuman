import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Trophy, Sparkles, X } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { BidRound } from '../../types/chitFund';
import SafeBlurView from '../SafeBlurView';
import { useColorScheme } from 'react-native';

interface WinnerCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  completedRound: BidRound | null;
  isCurrentUser?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function WinnerCelebrationModal({
  visible,
  onClose,
  completedRound,
  isCurrentUser = false
}: WinnerCelebrationModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(Math.random() * screenWidth),
      y: new Animated.Value(-50),
      rotation: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Trophy animation
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();

      // Sparkle animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Confetti animation
      const confettiAnimations = confettiAnims.map((confetti) => {
        return Animated.parallel([
          Animated.timing(confetti.y, {
            toValue: 800,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.timing(confetti.rotation, {
              toValue: 1,
              duration: 1000 + Math.random() * 1000,
              useNativeDriver: true,
            })
          ),
        ]);
      });

      Animated.stagger(100, confettiAnimations).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      sparkleAnim.setValue(0);
      confettiAnims.forEach((confetti) => {
        confetti.x.setValue(Math.random() * screenWidth);
        confetti.y.setValue(-50);
        confetti.rotation.setValue(0);
      });
    }
  }, [visible]);

  const renderConfetti = () => {
    return confettiAnims.map((confetti, index) => {
      const colors = [Colors.primary, Colors.success, Colors.warning, Colors.money];
      const color = colors[index % colors.length];
      
      return (
        <Animated.View
          key={index}
          style={[
            styles.confetti,
            {
              backgroundColor: color,
              transform: [
                { translateX: confetti.x },
                { translateY: confetti.y },
                {
                  rotate: confetti.rotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      );
    });
  };

  if (!completedRound) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <SafeBlurView
        style={styles.container}
        tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
        intensity={100}
      >
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(248,250,252,0.5)' }]}>
          {/* Confetti */}
          <View style={styles.confettiContainer}>
            {renderConfetti()}
          </View>
          
          <View style={styles.content}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            
            {/* Trophy Animation */}
            <Animated.View
              style={[
                styles.trophyContainer,
                {
                  transform: [
                    { scale: scaleAnim },
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '10deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Trophy size={80} color={Colors.warning} />
              
              {/* Sparkles */}
              <Animated.View
                style={[
                  styles.sparkle,
                  styles.sparkle1,
                  {
                    opacity: sparkleAnim,
                    transform: [
                      {
                        scale: sparkleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1.5],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Sparkles size={20} color={Colors.warning} />
              </Animated.View>
              
              <Animated.View
                style={[
                  styles.sparkle,
                  styles.sparkle2,
                  {
                    opacity: sparkleAnim,
                    transform: [
                      {
                        scale: sparkleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1.5, 0.5],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Sparkles size={16} color={Colors.success} />
              </Animated.View>
              
              <Animated.View
                style={[
                  styles.sparkle,
                  styles.sparkle3,
                  {
                    opacity: sparkleAnim,
                    transform: [
                      {
                        scale: sparkleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.2],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Sparkles size={14} color={Colors.primary} />
              </Animated.View>
            </Animated.View>
            
            {/* Winner Info */}
            <View style={styles.winnerInfo}>
              <Text style={styles.congratsText}>
                {isCurrentUser ? '🎉 Congratulations!' : '🏆 We Have a Winner!'}
              </Text>
              
              <Text style={styles.winnerName}>{completedRound.winnerName}</Text>
              
              <View style={styles.winnerStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Winning Bid</Text>
                  <Text style={styles.statValue}>
                    ₹{completedRound.winningBid?.toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Prize Amount</Text>
                  <Text style={[styles.statValue, { color: Colors.success }]}>
                    ₹{completedRound.prizeAmount.toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Savings</Text>
                  <Text style={[styles.statValue, { color: Colors.money }]}>
                    ₹{(completedRound.prizeAmount - (completedRound.winningBid || 0)).toLocaleString()}
                  </Text>
                </View>
              </View>
              
              {isCurrentUser && (
                <View style={styles.userMessage}>
                  <Text style={styles.userMessageText}>
                    You won Round {completedRound.roundNumber}! The prize amount will be credited to your account.
                  </Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity style={styles.continueButton} onPress={onClose}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
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
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Colors.shadow,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  trophyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 24,
    position: 'relative',
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: -10,
    right: -10,
  },
  sparkle2: {
    bottom: -5,
    left: -15,
  },
  sparkle3: {
    top: 10,
    left: -20,
  },
  winnerInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  congratsText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  winnerName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  winnerStats: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  userMessage: {
    backgroundColor: Colors.success + '15',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  userMessageText: {
    fontSize: 14,
    color: Colors.success,
    textAlign: 'center',
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
    textAlign: 'center',
  },
});