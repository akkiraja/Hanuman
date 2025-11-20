import { Platform, Alert } from 'react-native';
import { supabase } from '../libs/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import expo-contacts with proper web/native handling
let Contacts: any = null;
let isContactsModuleLoaded = false;

if (Platform.OS !== 'web') {
  try {
    Contacts = require('expo-contacts');
    isContactsModuleLoaded = true;
    console.log('✅ expo-contacts imported successfully for', Platform.OS);
  } catch (error) {
    console.error('❌ expo-contacts import failed:', error);
    isContactsModuleLoaded = false;
  }
} else {
  console.log('🌐 Running on web - contacts will use demo data');
  isContactsModuleLoaded = false;
}

// Types
export interface Contact {
  id: string;
  name: string;
  phoneNumbers: any[];
  registeredUser: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export interface ContactsCache {
  contacts: Contact[];
  timestamp: number;
  registeredUsers: any[];
}

// Constants
const CACHE_KEY = 'contacts_cache_758cab24';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Utility function to normalize phone numbers for comparison
 */
export const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/[\s\-\(\)\+]/g, '');
};

/**
 * Check if contacts module is available and functional
 */
export const isContactsAvailable = (): boolean => {
  if (Platform.OS === 'web') {
    return false; // Contacts never work on web
  }
  
  return isContactsModuleLoaded && 
         Contacts && 
         typeof Contacts.getPermissionsAsync === 'function';
};

/**
 * Request contacts permission
 */
export const requestContactsPermission = async (): Promise<boolean> => {
  console.log('🔐 Starting permission request process...');
  console.log('Platform:', Platform.OS);
  console.log('Contacts module available:', !!Contacts);
  
  // Only use demo contacts on web
  if (Platform.OS === 'web') {
    console.log('📱 Web platform detected - using demo contacts');
    Alert.alert(
      'Demo Mode',
      'Contact access is not available in web preview. Using demo contacts for testing.',
      [{ text: 'OK' }]
    );
    return true;
  }

  // Check if expo-contacts is available on native platform
  if (!isContactsAvailable()) {
    console.error('❌ expo-contacts module not available on native platform!');
    Alert.alert(
      'Module Error',
      'Contacts module is not available. This might be because:\n\n1. The app needs to be rebuilt with expo-contacts\n2. You\'re testing in Expo Go (contacts don\'t work there)\n\nPlease build a standalone APK to test contacts.',
      [{ text: 'OK' }]
    );
    return false;
  }

  try {
    console.log('📞 Checking current permission status...');
    
    // First check current permission status
    const { status: currentStatus } = await Contacts.getPermissionsAsync();
    console.log('Current permission status:', currentStatus);
    
    if (currentStatus === 'granted') {
      console.log('✅ Permission already granted');
      return true;
    }
    
    console.log('🔑 Requesting contacts permission...');
    
    // Request permission
    const { status } = await Contacts.requestPermissionsAsync();
    console.log('Permission request result:', status);
    
    if (status === 'granted') {
      console.log('✅ Permission granted!');
      return true;
    } else {
      console.log('❌ Permission denied by user');
      Alert.alert(
        'Permission Required',
        'To add members from your contacts, please:\n\n1. Go to your device Settings\n2. Find this app\n3. Enable Contacts permission\n4. Come back and try again',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Try Again', 
            onPress: () => requestContactsPermission()
          }
        ]
      );
      return false;
    }
  } catch (error) {
    console.error('💥 Error in permission request:', error);
    Alert.alert(
      'Permission Error', 
      `Something went wrong while requesting contacts permission:\n\n${error.message || 'Unknown error'}\n\nTry restarting the app or add members manually.`,
      [{ text: 'OK' }]
    );
    return false;
  }
};

/**
 * Get cached contacts if available and not expired
 */
const getCachedContacts = async (): Promise<ContactsCache | null> => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsedCache: ContactsCache = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - parsedCache.timestamp < CACHE_DURATION) {
      console.log('📦 Using cached contacts data');
      return parsedCache;
    } else {
      console.log('⏰ Cache expired, will fetch fresh data');
      return null;
    }
  } catch (error) {
    console.error('Error reading contacts cache:', error);
    return null;
  }
};

/**
 * Cache contacts data
 */
const setCachedContacts = async (contacts: Contact[], registeredUsers: any[]): Promise<void> => {
  try {
    const cacheData: ContactsCache = {
      contacts,
      registeredUsers,
      timestamp: Date.now()
    };
    
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log('💾 Contacts cached successfully');
  } catch (error) {
    console.error('Error caching contacts:', error);
  }
};

/**
 * Clear contacts cache
 */
export const clearContactsCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Contacts cache cleared');
  } catch (error) {
    console.error('Error clearing contacts cache:', error);
  }
};

/**
 * Fetch registered users from Supabase
 */
const fetchRegisteredUsers = async (currentUserId?: string): Promise<any[]> => {
  console.log('👥 Fetching registered users from Supabase...');
  
  const { data: registeredUsers, error: usersError } = await supabase
    .from('profiles')
    .select('id, name, email, phone')
    .neq('id', currentUserId || ''); // Exclude current user
  
  if (usersError) {
    console.error('❌ Error fetching registered users:', usersError);
    throw new Error(`Failed to load registered users: ${usersError.message}`);
  }
  
  console.log(`👥 Found ${registeredUsers?.length || 0} registered users`);
  return registeredUsers || [];
};

/**
 * Fetch device contacts and match with registered users
 */
const fetchDeviceContacts = async (): Promise<any[]> => {
  console.log('📱 Fetching contacts from device...');
  
  if (Platform.OS === 'web') {
    console.log('🌐 Web platform - contacts not available');
    return [];
  }

  if (!isContactsAvailable()) {
    console.error('❌ expo-contacts module not available');
    throw new Error('Contacts module is not available');
  }

  // Get contacts with name and phone numbers
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    sort: Contacts.SortTypes.FirstName,
  });
  
  console.log(`📊 Raw contacts from device: ${data?.length || 0}`);
  
  if (!data || data.length === 0) {
    console.log('📭 No contacts found on device');
    return [];
  }
  
  // Filter contacts with valid name and phone
  const validContacts = data.filter(contact => {
    const hasName = contact.name && contact.name.trim().length > 0;
    const hasPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0;
    return hasName && hasPhone;
  });
  
  console.log(`📊 Valid contacts from device: ${validContacts.length}`);
  return validContacts;
};

/**
 * Match device contacts with registered users
 */
const matchContactsWithUsers = (deviceContacts: any[], registeredUsers: any[]): Contact[] => {
  console.log('🔍 Matching contacts with registered users...');
  
  // Create lookup map for registered users by phone
  const usersByPhone = new Map();
  registeredUsers.forEach(user => {
    if (user.phone) {
      const cleanPhone = normalizePhoneNumber(user.phone);
      usersByPhone.set(cleanPhone, user);
    }
  });
  
  // Filter contacts to only include registered users
  const registeredContacts = deviceContacts
    .map(contact => {
      const cleanContactPhone = normalizePhoneNumber(contact.phoneNumbers[0].number);
      const registeredUser = usersByPhone.get(cleanContactPhone);
      
      if (registeredUser) {
        return {
          id: contact.id || Math.random().toString(),
          name: contact.name.trim(),
          phoneNumbers: contact.phoneNumbers,
          registeredUser: registeredUser
        };
      }
      return null;
    })
    .filter(contact => contact !== null) as Contact[];
  
  console.log(`✅ Found ${registeredContacts.length} contacts who are registered users`);
  return registeredContacts;
};

/**
 * Load contacts with caching support
 */
export const loadContacts = async (currentUserId?: string, forceRefresh: boolean = false): Promise<Contact[]> => {
  console.log(`📱 Loading contacts... (forceRefresh: ${forceRefresh})`);
  
  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getCachedContacts();
      if (cached) {
        console.log(`📦 Returning ${cached.contacts.length} cached contacts`);
        return cached.contacts;
      }
    }
    
    // Fetch fresh data
    console.log('🔄 Fetching fresh contacts data...');
    
    // Fetch registered users and device contacts in parallel
    const [registeredUsers, deviceContacts] = await Promise.all([
      fetchRegisteredUsers(currentUserId),
      fetchDeviceContacts()
    ]);
    
    // Match contacts with registered users
    const matchedContacts = matchContactsWithUsers(deviceContacts, registeredUsers);
    
    // Cache the results
    await setCachedContacts(matchedContacts, registeredUsers);
    
    if (matchedContacts.length === 0) {
      console.log('📭 No registered contacts found');
    } else {
      console.log(`🎉 Loaded ${matchedContacts.length} registered contacts!`);
      const firstFew = matchedContacts.slice(0, 3).map(c => c.name).join(', ');
      console.log(`📋 Registered contacts: ${firstFew}`);
    }
    
    return matchedContacts;
    
  } catch (error) {
    console.error('💥 Error loading contacts:', error);
    throw error;
  }
};

/**
 * Refresh contacts - force reload and update cache
 */
export const refreshContacts = async (currentUserId?: string): Promise<Contact[]> => {
  console.log('🔄 Refreshing contacts...');
  return loadContacts(currentUserId, true);
};

/**
 * Get contacts with automatic permission handling
 */
export const getContactsWithPermission = async (currentUserId?: string, forceRefresh: boolean = false): Promise<{ contacts: Contact[], hasPermission: boolean }> => {
  console.log('🔐 Getting contacts with permission handling...');
  
  try {
    // Check/request permission first
    const hasPermission = await requestContactsPermission();
    
    if (!hasPermission) {
      return { contacts: [], hasPermission: false };
    }
    
    // Load contacts
    const contacts = await loadContacts(currentUserId, forceRefresh);
    
    return { contacts, hasPermission: true };
    
  } catch (error) {
    console.error('Error getting contacts with permission:', error);
    
    // Show user-friendly error
    Alert.alert(
      'Error Loading Contacts', 
      `Failed to load contacts from your device:\n\n${error.message || 'Unknown error'}\n\nYou can add members manually instead.`,
      [{ text: 'OK' }]
    );
    
    return { contacts: [], hasPermission: false };
  }
};

/**
 * Load ALL contacts (registered + unregistered) with status flags
 * Used in AddMembersScreen for inviting pending members
 */
export const loadAllContacts = async (currentUserId?: string, forceRefresh: boolean = false): Promise<{ registered: Contact[], unregistered: any[] }> => {
  console.log(`📱 Loading ALL contacts (registered + unregistered)...`);
  
  try {
    // Fetch registered users and device contacts in parallel
    const [registeredUsers, deviceContacts] = await Promise.all([
      fetchRegisteredUsers(currentUserId),
      fetchDeviceContacts()
    ]);
    
    // Create lookup map for registered users by phone
    const usersByPhone = new Map();
    registeredUsers.forEach(user => {
      if (user.phone) {
        const cleanPhone = normalizePhoneNumber(user.phone);
        usersByPhone.set(cleanPhone, user);
      }
    });
    
    // Separate registered and unregistered contacts
    const registered: Contact[] = [];
    const unregistered: any[] = [];
    
    deviceContacts.forEach(contact => {
      if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) return;
      
      const phoneNumber = contact.phoneNumbers[0].number;
      const cleanPhone = normalizePhoneNumber(phoneNumber);
      const registeredUser = usersByPhone.get(cleanPhone);
      
      if (registeredUser) {
        // Registered user
        registered.push({
          id: contact.id || Math.random().toString(),
          name: contact.name.trim(),
          phoneNumbers: contact.phoneNumbers,
          registeredUser: registeredUser
        });
      } else {
        // Unregistered contact
        unregistered.push({
          id: contact.id || Math.random().toString(),
          name: contact.name.trim(),
          phone: phoneNumber,
          phoneNumbers: contact.phoneNumbers
        });
      }
    });
    
    console.log(`✅ Found ${registered.length} registered, ${unregistered.length} unregistered contacts`);
    
    return { registered, unregistered };
    
  } catch (error) {
    console.error('💥 Error loading all contacts:', error);
    throw error;
  }
};

export default {
  loadContacts,
  refreshContacts,
  getContactsWithPermission,
  requestContactsPermission,
  isContactsAvailable,
  normalizePhoneNumber,
  clearContactsCache,
  loadAllContacts
};