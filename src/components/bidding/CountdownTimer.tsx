import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, AlertTriangle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

interface CountdownTimerProps {
  endTime: Date;
  onTimeUp?: () => void;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function CountdownTimer({ 
  endTime, 
  onTimeUp, 
  showIcon = true, 
  size = 'medium' 
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endTimeMs = new Date(endTime).getTime();
      const difference = endTimeMs - now;

      if (difference > 0) {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft({ hours, minutes, seconds, isExpired: false });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onTimeUp) {
          onTimeUp();
        }
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime, onTimeUp]);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          timeText: styles.smallTimeText,
          labelText: styles.smallLabelText,
          icon: 16,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          timeText: styles.largeTimeText,
          labelText: styles.largeLabelText,
          icon: 32,
        };
      default:
        return {
          container: styles.mediumContainer,
          timeText: styles.mediumTimeText,
          labelText: styles.mediumLabelText,
          icon: 24,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const isUrgent = !timeLeft.isExpired && timeLeft.hours === 0 && timeLeft.minutes < 5;
  const iconColor = timeLeft.isExpired ? Colors.error : isUrgent ? Colors.warning : Colors.primary;
  const textColor = timeLeft.isExpired ? Colors.error : isUrgent ? Colors.warning : Colors.text;

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  const getTimeDisplay = () => {
    if (timeLeft.isExpired) {
      return 'Time Up!';
    }
    
    if (timeLeft.hours > 0) {
      return `${formatTime(timeLeft.hours)}:${formatTime(timeLeft.minutes)}:${formatTime(timeLeft.seconds)}`;
    }
    
    return `${formatTime(timeLeft.minutes)}:${formatTime(timeLeft.seconds)}`;
  };

  const getLabel = () => {
    if (timeLeft.isExpired) {
      return 'Round Ended';
    }
    
    if (isUrgent) {
      return 'Hurry Up!';
    }
    
    return 'Time Remaining';
  };

  return (
    <View style={[styles.container, sizeStyles.container]}>
      {showIcon && (
        <View style={styles.iconContainer}>
          {timeLeft.isExpired ? (
            <AlertTriangle size={sizeStyles.icon} color={iconColor} />
          ) : (
            <Clock size={sizeStyles.icon} color={iconColor} />
          )}
        </View>
      )}
      
      <View style={styles.timeContainer}>
        <Text style={[sizeStyles.timeText, { color: textColor }]}>
          {getTimeDisplay()}
        </Text>
        <Text style={[sizeStyles.labelText, { color: textColor }]}>
          {getLabel()}
        </Text>
      </View>
      
      {isUrgent && !timeLeft.isExpired && (
        <View style={styles.urgentIndicator}>
          <View style={styles.urgentDot} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  timeContainer: {
    alignItems: 'center',
  },
  urgentIndicator: {
    marginLeft: 8,
  },
  urgentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  
  // Small size styles
  smallContainer: {
    padding: 8,
  },
  smallTimeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  smallLabelText: {
    fontSize: 10,
    marginTop: 2,
  },
  
  // Medium size styles
  mediumContainer: {
    padding: 16,
  },
  mediumTimeText: {
    fontSize: 24,
    fontWeight: '700',
  },
  mediumLabelText: {
    fontSize: 12,
    marginTop: 4,
  },
  
  // Large size styles
  largeContainer: {
    padding: 24,
  },
  largeTimeText: {
    fontSize: 32,
    fontWeight: '700',
  },
  largeLabelText: {
    fontSize: 14,
    marginTop: 6,
  },
});