
import React from 'react';
import { Platform, useColorScheme } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Users, BookOpen, User, Gavel } from 'lucide-react-native';
import HomeScreen from '../screens/HomeScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import BiddingGroupDetailScreen from '../screens/BiddingGroupDetailScreen';
import BiddingRoundScreen from '../screens/BiddingRoundScreen';
import AuctionListScreen from '../screens/AuctionListScreen';
import GroupMembersScreen from '../screens/GroupMembersScreen';
import PastRoundsScreen from '../screens/PastRoundsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TutorialsScreen from '../screens/TutorialsScreen';
import DashboardTestingScreen from '../screens/DashboardTestingScreen';
import PaymentSuccessScreen from '../screens/PaymentSuccessScreen';
import { Colors } from '../constants/colors';

// Define types for navigation
export type MainTabsParamList = {
  Home: undefined;
  Auction: undefined;
  Tutorials: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  GroupDetail: { groupId?: string };
  BiddingGroupDetail: { groupId?: string };
  BiddingRound: { groupId: string; roundId: string };
  GroupMembers: { groupId: string; groupName: string };
  PastRounds: { groupId: string; groupName: string };
  DashboardTesting: undefined;
  PaymentSuccess: {
    orderId?: string;
    groupId?: string;
    amount?: string;
    status?: string;
  };
};

const Tab = createBottomTabNavigator<MainTabsParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Tab Navigator
const TabNavigator = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent = Home;

          if (route.name === 'Home') {
            IconComponent = Home;
          } else if (route.name === 'Auction') {
            IconComponent = Gavel;
          } else if (route.name === 'Tutorials') {
            IconComponent = BookOpen;
          } else if (route.name === 'Profile') {
            IconComponent = User;
          }

          return <IconComponent size={20} color={color} />;
        },
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 72 : 60,
          paddingBottom: 8,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          backgroundColor: Colors.background,
          ...(Platform.OS === 'ios' ? { paddingBottom: 0 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Groups' }}
      />
      <Tab.Screen 
        name="Auction" 
        component={AuctionListScreen}
        options={{ tabBarLabel: 'Auction' }}
      />
      <Tab.Screen 
        name="Tutorials" 
        component={TutorialsScreen}
        options={{ tabBarLabel: 'Tutorials' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Main Navigator with Stack
export const MainTabNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="BiddingGroupDetail" component={BiddingGroupDetailScreen} />
      <Stack.Screen name="BiddingRound" component={BiddingRoundScreen} />
      <Stack.Screen name="GroupMembers" component={GroupMembersScreen} />
      <Stack.Screen name="PastRounds" component={PastRoundsScreen} />
      <Stack.Screen name="DashboardTesting" component={DashboardTestingScreen} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
    </Stack.Navigator>
  );
};

export default MainTabNavigator;
