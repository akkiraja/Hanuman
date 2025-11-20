import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Gift } from 'lucide-react-native';

interface DashboardDrawSpinnerProps {
  groupName: string;
  visible: boolean;
  onComplete: () => void;
}

export default function DashboardDrawSpinner({ 
  groupName, 
  visible, 
  onComplete 
}: DashboardDrawSpinnerProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const [timeLeft, setTimeLeft] = useState(45);

  useEffect(() => {
    if (visible) {
      setTimeLeft(45);
      startSpinAnimation();
      startCountdown();
    } else {
      // Reset when hidden
      spinValue.setValue(0);
      setTimeLeft(45);
    }
  }, [visible]);

  const startCountdown = () => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startSpinAnimation = () => {
    // Reset animation
    spinValue.setValue(0);

    // Continuous spinning animation
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000, // 2 seconds per rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    spin.start();
  };

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <View style={[styles.container, Colors.shadow]}>
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.spinner,
            {
              transform: [{ rotate }]
            }
          ]}
        >
          <Gift size={24} color={Colors.warning} />
        </Animated.View>
        
        <View style={styles.textContent}>
          <Text style={styles.title}>🎲 Lucky Draw in Progress</Text>
          <Text style={styles.subtitle}>{groupName}</Text>
          <Text style={styles.countdown}>{timeLeft}s remaining</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  countdown: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600',
  },
});