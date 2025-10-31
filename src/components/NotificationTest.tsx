import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Bell, Send, TestTube } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { notificationService } from '../services/notificationService';
import { triggerPaymentReminder, checkAndSendPaymentReminders } from '../utils/notificationUtils';
import { useChitStore } from '../stores/chitStore';

interface NotificationTestProps {
  visible?: boolean;
}

export default function NotificationTest({ visible = false }: NotificationTestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { groups } = useChitStore();

  if (!visible) return null;

  const handleTestLocalNotification = async () => {
    try {
      setIsLoading(true);
      await notificationService.scheduleLocalNotification(
        '💰 Test Notification',
        'This is a test notification from your Bhishi app!',
        3
      );
      Alert.alert('Success', 'Test notification scheduled for 3 seconds!');
    } catch (error) {
      console.error('Test notification error:', error);
      Alert.alert('Error', 'Failed to schedule test notification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPaymentReminder = async () => {
    try {
      if (groups.length === 0) {
        Alert.alert('No Groups', 'You need to be in a group to test payment reminders');
        return;
      }

      setIsLoading(true);
      const firstGroup = groups[0];
      const success = await triggerPaymentReminder(firstGroup.id);
      
      if (success) {
        Alert.alert('Success', `Payment reminder sent for group: ${firstGroup.name}`);
      } else {
        Alert.alert('Error', 'Failed to send payment reminder');
      }
    } catch (error) {
      console.error('Payment reminder test error:', error);
      Alert.alert('Error', 'Failed to test payment reminder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAllReminders = async () => {
    try {
      setIsLoading(true);
      await checkAndSendPaymentReminders();
      Alert.alert('Success', 'Checked and sent payment reminders for all eligible groups');
    } catch (error) {
      console.error('Check reminders error:', error);
      Alert.alert('Error', 'Failed to check payment reminders');
    } finally {
      setIsLoading(false);
    }
  };

  const getPushToken = () => {
    const token = notificationService.getPushToken();
    if (token) {
      Alert.alert('Push Token', token, [
        { text: 'Copy', onPress: () => console.log('Token:', token) },
        { text: 'OK' }
      ]);
    } else {
      Alert.alert('No Token', 'Push token not available. Make sure expo-notifications is installed.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TestTube size={20} color={Colors.primary} />
        <Text style={styles.title}>Notification Testing</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Local Notifications</Text>
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleTestLocalNotification}
          disabled={isLoading}
        >
          <Bell size={16} color={Colors.background} />
          <Text style={styles.buttonText}>Test Local Notification</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]}
          onPress={getPushToken}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>Show Push Token</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleTestPaymentReminder}
          disabled={isLoading}
        >
          <Send size={16} color={Colors.background} />
          <Text style={styles.buttonText}>Test Payment Reminder</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleCheckAllReminders}
          disabled={isLoading}
        >
          <Send size={16} color={Colors.background} />
          <Text style={styles.buttonText}>Check All Reminders</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          📱 Install expo-notifications first:{"\n"}
          npx expo install expo-notifications
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  info: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});