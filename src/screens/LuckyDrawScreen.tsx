import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  SafeAreaView,
  Dimensions,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Trophy, Gift, X, Users } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { supabase } from '../libs/supabase';
import { toast } from 'sonner-native';

interface DrawData {
  id: string;
  group_id: string;
  group_name: string;
  start_timestamp: string;
  duration_seconds: number;
  prize_amount: number;
  winner_name: string | null;
  winner_user_id: string | null;
  revealed: boolean;
}

const { width, height } = Dimensions.get('window');

export default function LuckyDrawScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { drawId } = route.params as { drawId: string };

  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;

  const [drawData, setDrawData] = useState<DrawData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWinner, setShowWinner] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch draw data
  useEffect(() => {
    fetchDrawData();
    setupRealtimeSubscription();
  }, [drawId]);

  const fetchDrawData = async () => {
    try {
      const { data, error } = await supabase
        .from('draws')
        .select(`
          id,
          group_id,
          start_timestamp,
          duration_seconds,
          prize_amount,
          winner_name,
          winner_user_id,
          revealed,
          bhishi_groups!inner(name)
        `)
        .eq('id', drawId)
        .single();

      if (error) throw error;

      // Supabase returns bhishi_groups as array with !inner, so get first element
      const groupData = Array.isArray(data.bhishi_groups) ? data.bhishi_groups[0] : data.bhishi_groups;
      
      const draw: DrawData = {
        id: data.id,
        group_id: data.group_id,
        group_name: groupData?.name || 'Unknown Group',
        start_timestamp: data.start_timestamp,
        duration_seconds: data.duration_seconds,
        prize_amount: data.prize_amount,
        winner_name: data.winner_name,
        winner_user_id: data.winner_user_id,
        revealed: data.revealed,
      };

      setDrawData(draw);

      // Check if already revealed
      if (draw.revealed && draw.winner_name) {
        setShowWinner(true);
        setIsAnimating(false);
        // Auto-close after 3 seconds for already completed draws
        setTimeout(() => {
          navigation.goBack();
        }, 3000);
      } else {
        // Calculate remaining time
        const now = Date.now();
        const startTime = new Date(draw.start_timestamp).getTime();
        const elapsed = (now - startTime) / 1000;
        const remainingSeconds = Math.max(0, draw.duration_seconds - elapsed);

        console.log('🎲 Draw timing:', {
          startTime: new Date(draw.start_timestamp).toISOString(),
          now: new Date(now).toISOString(),
          elapsed: elapsed.toFixed(2),
          remainingSeconds: remainingSeconds.toFixed(2),
        });

        if (remainingSeconds <= 1.5) {
          // Late joiner - show winner or wait for reveal
          if (draw.revealed && draw.winner_name) {
            setShowWinner(true);
            // Auto-close after 3 seconds for late joiners
            setTimeout(() => {
              navigation.goBack();
            }, 3000);
          } else {
            toast('Draw is ending, waiting for results...');
          }
        } else {
          // Start animation
          setTimeLeft(Math.ceil(remainingSeconds));
          startSpinAnimation(remainingSeconds * 1000);
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error('❌ Error fetching draw:', err);
      setError('Failed to load draw. Please try again.');
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`draw-${drawId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'draws',
          filter: `id=eq.${drawId}`,
        },
        (payload) => {
          console.log('🔔 Realtime update received:', payload);
          const updatedDraw = payload.new;
          console.log('Updated draw data:', {
            revealed: updatedDraw.revealed,
            winner_name: updatedDraw.winner_name,
            winner_user_id: updatedDraw.winner_user_id,
          });

          if (updatedDraw.revealed && updatedDraw.winner_name) {
            console.log('🎉 Winner revealed via realtime:', updatedDraw.winner_name);
            setDrawData(prev => prev ? { ...prev, ...updatedDraw } : null);
            setShowWinner(true);
            setIsAnimating(false);
            toast.success('Winner announced!');
            
            // Auto-close after 3 seconds when winner is revealed via realtime
            setTimeout(() => {
              console.log('🚪 Auto-closing screen (realtime path)...');
              navigation.goBack();
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Prevent back button during animation
  useEffect(() => {
    if (isAnimating) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        toast('Please wait for the draw to complete');
        return true; // Block back button
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
        // Timer reached 0 - check for winner
        handleTimerComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  const handleTimerComplete = async () => {
    console.log('⏰ Timer complete, checking for winner...');
    console.log('Current drawData:', {
      revealed: drawData?.revealed,
      winner_name: drawData?.winner_name,
      drawId: drawData?.id,
    });
    
    // Re-fetch draw data to get latest winner info from server
    try {
      const { data, error } = await supabase
        .from('draws')
        .select('revealed, winner_name, winner_user_id')
        .eq('id', drawId)
        .single();

      if (error) throw error;

      console.log('✅ Re-fetched draw data:', data);

      // Update local state with fresh data
      if (data && drawData) {
        setDrawData({
          ...drawData,
          revealed: data.revealed,
          winner_name: data.winner_name,
          winner_user_id: data.winner_user_id,
        });
      }

      // If winner is revealed, show it
      if (data?.revealed && data?.winner_name) {
        console.log('🎉 Showing winner:', data.winner_name);
        setShowWinner(true);
        // Auto-close after 3 seconds
        setTimeout(() => {
          console.log('🚪 Auto-closing screen...');
          navigation.goBack();
        }, 3000);
      } else {
        // Wait for realtime update
        console.log('⏳ Winner not ready yet, waiting for realtime update...');
        toast('Waiting for winner announcement...');
      }
    } catch (err) {
      console.error('❌ Error re-fetching draw:', err);
      // Fallback to existing drawData
      if (drawData?.revealed && drawData?.winner_name) {
        setShowWinner(true);
        setTimeout(() => {
          navigation.goBack();
        }, 3000);
      } else {
        toast('Waiting for winner announcement...');
      }
    }
  };

  const startSpinAnimation = (remainingMs: number) => {
    spinValue.setValue(0);
    scaleValue.setValue(0);
    setIsAnimating(true);

    // Calculate rotations
    const totalRotations = remainingMs / 1000;
    const fastRotations = Math.max(0, totalRotations - 2);
    const slowRotations = 2;

    // Fast spin
    const fastSpin = Animated.timing(spinValue, {
      toValue: fastRotations,
      duration: Math.max(0, remainingMs - 2000),
      easing: Easing.linear,
      useNativeDriver: true,
    });

    // Slow spin
    const slowSpin = Animated.timing(spinValue, {
      toValue: fastRotations + slowRotations,
      duration: Math.min(2000, remainingMs),
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    // Scale in
    const scaleIn = Animated.spring(scaleValue, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    });

    scaleIn.start();

    Animated.sequence([fastSpin, slowSpin]).start(() => {
      console.log('✅ Animation complete');
      setIsAnimating(false);
      
      // Animation complete - timer should have already called handleTimerComplete
      // This is just a fallback
      if (drawData?.revealed && drawData?.winner_name) {
        setShowWinner(true);
        // Auto-close after 3 seconds
        setTimeout(() => {
          navigation.goBack();
        }, 3000);
      }
    });

    startCountdown(Math.ceil(remainingMs / 1000));
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleClose = () => {
    if (!isAnimating) {
      navigation.goBack();
    }
  };

  const handleViewGroup = () => {
    if (drawData) {
      navigation.navigate('GroupDetail' as never, { groupId: drawData.group_id } as never);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading draw...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !drawData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error || 'Draw not found'}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {!showWinner ? (
          <>
            {/* Close button (only if not animating) */}
            {!isAnimating && (
              <TouchableOpacity style={styles.closeIcon} onPress={handleClose}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>🎲 Lucky Draw in Progress</Text>
              <Text style={styles.subtitle}>{drawData.group_name}</Text>
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
                    transform: [{ rotate: spin }, { scale: scaleValue }],
                  },
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
              <Text style={styles.prizeAmount}>
                ₹{drawData.prize_amount.toLocaleString()}
              </Text>
            </View>
          </>
        ) : (
          /* Winner Reveal */
          <View style={styles.winnerContainer}>
            <View style={styles.winnerIcon}>
              <Trophy size={80} color={Colors.warning} />
            </View>
            <Text style={styles.congratsText}>🎉 Congratulations! 🎉</Text>
            <Text style={styles.winnerName}>{drawData.winner_name}</Text>
            <Text style={styles.winnerPrize}>
              Won ₹{drawData.prize_amount.toLocaleString()}!
            </Text>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.viewGroupButton}
                onPress={handleViewGroup}
              >
                <Users size={18} color={Colors.background} />
                <Text style={styles.viewGroupButtonText}>View Group</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                <Text style={styles.doneButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
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
  closeIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
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
    marginBottom: 40,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: '900',
    color: Colors.primary,
    lineHeight: 80,
  },
  countdownLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  spinnerContainer: {
    marginBottom: 40,
  },
  spinner: {
    width: 180,
    height: 180,
  },
  spinnerInner: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.warning + '20',
    borderRadius: 90,
    borderWidth: 4,
    borderColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prizeContainer: {
    alignItems: 'center',
  },
  prizeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  prizeAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.money,
  },
  winnerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  winnerIcon: {
    marginBottom: 32,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  winnerName: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  winnerPrize: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.money,
    marginBottom: 40,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  viewGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  viewGroupButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.background,
  },
  doneButton: {
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
