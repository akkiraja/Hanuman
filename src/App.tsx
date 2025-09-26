import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { Toaster } from 'sonner-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MainTabNavigator from './navigation';
import AuthScreen from './screens/AuthScreen';
import { useAuthStore } from './stores/authStore';
import { useChitStore } from './stores/chitStore';
import { Colors } from './constants/colors';
import { notificationService } from './services/notificationService';
import { createNavigationLogger } from './magically/utils/NavigationLogger';


/**
 * ChitFund App - Traditional Indian VC/Committee Management
 * Helps users create and manage chit fund groups for collective savings
 */
export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isAuthenticated, isLoading, initialize, user, isOtpFlowActive } = useAuthStore();
  const { initialize: initializeChit } = useChitStore();
  
  // Log auth state changes for debugging
  useEffect(() => {
    console.log('🏠 App.tsx - Auth state:', {
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      isOtpFlowActive,
      userId: user?.id,
      userEmail: user?.email,
      userPhone: user?.phone
    });
  }, [isAuthenticated, isLoading, user, isOtpFlowActive]);

  // Initialize auth and chit stores
  useEffect(() => {
    const initializeApp = async () => {
      await initialize();
      if (isAuthenticated) {
        await initializeChit();
        // Initialize push notifications for authenticated users
        await notificationService.initialize();
      }
    };
    initializeApp();
  }, [initialize, initializeChit, isAuthenticated]);

  // Setup notification listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    // Handle notifications received while app is in foreground
    const notificationListener = notificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received in foreground:', notification);
        // You can show a toast or handle the notification here
      }
    );

    // Handle notification taps
    const responseListener = notificationService.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        const data = response.notification.request.content.data;
        
        // Handle different notification types
        if (data?.type === 'payment_reminder') {
          // Navigate to specific group or payment screen
          console.log('Payment reminder tapped for group:', data.groupId);
        }
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [isAuthenticated]);

  // Always extend the base theme from react-navigation
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...DefaultTheme.colors,
      background: '#FFFFFF',
      card: '#FFFFFF',
      primary: '#007AFF',
    },
  };

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 } as any}>
        <SafeAreaProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Deep linking configuration
  const linking = {
    prefixes: ['bhishi://'],
    config: {
      screens: {
        MainTabs: {
          screens: {
            Home: 'home',
            Tutorials: 'tutorials',
            Profile: 'profile',
          },
        },
        GroupDetail: 'group/:groupId',
        BiddingGroupDetail: 'bidding-group/:groupId',
        BiddingRound: 'bidding-round/:groupId/:roundId',
        DashboardTesting: 'testing',
        PaymentSuccess: 'payment-success',
      },
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer 
          theme={navigationTheme} 
          linking={linking}
          onStateChange={createNavigationLogger()}
        >
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Toaster theme={'light'} richColors />
          {isAuthenticated ? <MainTabNavigator /> : <AuthScreen />}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
