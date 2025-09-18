import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Gift } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface MemberDrawSpinnerProps {
  groupName: string;
  visible: boolean;
  onComplete: () => void;
}

export default function MemberDrawSpinner({ 
  groupName, 
  visible, 
  onComplete 
}: MemberDrawSpinnerProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      startAnimations();
      // Auto-complete after 30 seconds (matching admin spinner duration)
      const timer = setTimeout(() => {
        onComplete();
      }, 30000);
      
      return () => clearTimeout(timer);
    } else {
      // Reset animations when hidden
      spinValue.setValue(0);
      scaleValue.setValue(0);
      fadeValue.setValue(0);
    }
  }, [visible]);

  const startAnimations = () => {
    // Reset all animations
    spinValue.setValue(0);
    scaleValue.setValue(0);
    fadeValue.setValue(0);

    // Fade in animation
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Scale in animation
    Animated.spring(scaleValue, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

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
    <View style={styles.overlay}>
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      >
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeValue,
              transform: [{ scale: scaleValue }]
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.spinner,
              {
                transform: [{ rotate }]
              }
            ]}
          >
            <Gift size={60} color={Colors.warning} />
          </Animated.View>
          
          <View style={styles.textContent}>
            <Text style={styles.title}>🎲 Lucky Draw in Progress</Text>
            <Text style={styles.subtitle}>{groupName}</Text>
            <Text style={styles.description}>Please wait while the draw is being conducted...</Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
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
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  textContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: Colors.warning,
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});