import { Platform } from 'react-native';
import { supabase } from '../libs/supabase';

// Conditional imports for cross-platform compatibility
let Notifications: any = null;
let Device: any = null;

// Check if we're on a supported platform first
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
    console.log('✅ expo-notifications loaded successfully on', Platform.OS);
  } catch (error) {
    console.error('❌ expo-notifications not available in this build');
    console.error('Solution: Rebuild APK after installing expo-notifications');
  }
} else {
  console.log('🌐 Web platform detected - notifications not supported');
}

// Configure notification behavior (only if Notifications is available)
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  device_type: string;
  created_at: string;
  updated_at: string;
}

class NotificationService {
  private pushToken: string | null = null;

  /**
   * Initialize notifications and register for push notifications
   */
  async initialize(): Promise<string | null> {
    console.log('🔄 Starting notification initialization...');
    try {
      // Check if expo-notifications is available
      console.log('✅ Notifications module check:', typeof Notifications);
      console.log('✅ Device module check:', typeof Device);
      
      if (!Notifications || !Device) {
        console.error('❌ Expo notifications modules not properly loaded');
        return null;
      }
      
      console.log('✅ Expo notifications modules loaded successfully');

      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.error('❌ Push notifications only work on physical devices');
        console.log('Current platform:', Platform.OS);
        console.log('Is device:', Device.isDevice);
        return null;
      }
      
      console.log('✅ Running on physical device, proceeding with token generation');

      // Create Android notification channel for heads-up notifications
      if (Platform.OS === 'android') {
        console.log('🔔 Creating Android notification channel with high importance...');
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: false,
          });
          console.log('✅ Android notification channel created successfully');
        } catch (error) {
          console.error('⚠️ Failed to create Android notification channel:', error);
          // Continue even if channel creation fails
        }
      }

      // Request permissions (Android 13+ requires runtime permission)
      console.log('🔔 Requesting notification permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('⚠️ Notification permission not granted, requesting...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Failed to get push notification permission!');
        console.log('💡 User can grant permission in device settings later');
        return null;
      }
      
      console.log('✅ Notification permission granted');


      // Get the push token
      console.log('🔄 Requesting Expo push token...');
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '1d6ed105-52c0-4995-bf9f-8fbcd055ed36', // Corrected project ID
      });

      this.pushToken = tokenData.data;
      console.log('✅ Expo Push Token Generated:', this.pushToken);
      console.log('Token length:', this.pushToken?.length);

      // Store token in Supabase
      await this.storePushToken(this.pushToken);

      return this.pushToken;
    } catch (error) {
      console.error('❌ CRITICAL: Error initializing notifications:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return null;
    }
  }

  /**
   * Store or update push token in Supabase
   */
  private async storePushToken(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return;
      }

      const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';

      // Check if token already exists for this user
      const { data: existingToken } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('token', token)
        .single();

      if (existingToken) {
        console.log('Push token already exists in database');
        return;
      }

      // Insert or update token
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          token: token,
          device_type: deviceType,
        }, {
          onConflict: 'user_id,token'
        });

      if (error) {
        console.error('Error storing push token:', error);
      } else {
        console.log('Push token stored successfully');
      }
    } catch (error) {
      console.error('Error in storePushToken:', error);
    }
  }

  /**
   * Remove push token from database (on logout)
   */
  async removePushToken(): Promise<void> {
    try {
      if (!this.pushToken) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('token', this.pushToken);

      if (error) {
        console.error('Error removing push token:', error);
      } else {
        console.log('Push token removed successfully');
        this.pushToken = null;
      }
    } catch (error) {
      console.error('Error in removePushToken:', error);
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(title: string, body: string, seconds: number = 5): Promise<void> {
    try {
      if (!Notifications) {
        console.log('📱 Notifications not available. Please install expo-notifications');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
        },
        trigger: {
          seconds,
        },
      });
      console.log('Local notification scheduled');
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  /**
   * Handle notification received while app is in foreground
   */
  addNotificationReceivedListener(callback: (notification: any) => void) {
    if (!Notifications) {
      console.log('📱 Notifications not available for listeners');
      return { remove: () => {} }; // Return dummy subscription
    }
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Handle notification tapped/clicked
   */
  addNotificationResponseReceivedListener(callback: (response: any) => void) {
    if (!Notifications) {
      console.log('📱 Notifications not available for response listeners');
      return { remove: () => {} }; // Return dummy subscription
    }
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;