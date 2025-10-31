import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { ArrowLeft, Search, Users, Check, Clock, UserPlus } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useChitStore } from '../stores/chitStore';
import { useAuthStore } from '../stores/authStore';
import { loadAllContacts, requestContactsPermission } from '../services/contactsService';
import { Colors } from '../constants/colors';
import { normalizePhone } from '../utils/phone';
import { toast } from 'sonner-native';
import { createStyles } from '../styles/addMembersScreenStyles';

type AddMembersScreenProps = {
  navigation: any;
  route: {
    params: {
      groupId: string;
      groupName: string;
    };
  };
};

interface ContactItem {
  id: string;
  name: string;
  phone: string;
  isRegistered: boolean;
  userId?: string;
  email?: string;
}

export default function AddMembersScreen({ navigation, route }: AddMembersScreenProps) {
  const { groupId, groupName } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);
  
  const { addMembersToGroup, currentGroup } = useChitStore();
  const { user } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allContacts, setAllContacts] = useState<ContactItem[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    loadContactsData();
  }, []);
  
  const loadContactsData = async () => {
    try {
      setIsLoading(true);
      
      // Request permission first
      const hasPermission = await requestContactsPermission();
      if (!hasPermission) {
        toast.error('Contacts permission denied');
        navigation.goBack();
        return;
      }
      
      // Load all contacts (registered + unregistered)
      const { registered, unregistered } = await loadAllContacts(user?.id);
      
      // Merge into single list with status flags
      const contacts: ContactItem[] = [
        ...registered.map(c => ({
          id: c.registeredUser.id,
          name: c.registeredUser.name || c.name,
          phone: c.registeredUser.phone,
          isRegistered: true,
          userId: c.registeredUser.id,
          email: c.registeredUser.email
        })),
        ...unregistered.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          isRegistered: false
        }))
      ];
      
      // Filter out existing members
      const existingMemberIds = new Set(
        currentGroup?.members?.map(m => m.user_id).filter(Boolean) || []
      );
      const existingPhones = new Set(
        currentGroup?.members?.map(m => m.phone || (m as any).invited_phone).filter(Boolean) || []
      );
      
      const filteredContacts = contacts.filter(c => {
        if (c.userId && existingMemberIds.has(c.userId)) return false;
        if (c.phone && existingPhones.has(c.phone)) return false;
        return true;
      });
      
      setAllContacts(filteredContacts);
      
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };
  
  const handleAddMembers = async () => {
    if (selectedContacts.size === 0) {
      toast.error('Please select at least one contact');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Prepare members data with normalized phone numbers
      const membersToAdd = allContacts
        .filter(c => selectedContacts.has(c.id))
        .map(c => ({
          userId: c.userId,
          name: c.name,
          phone: normalizePhone(c.phone), // Ensure consistent +91XXXXXXXXXX format
          email: c.email
        }));
      
      // Call store to add members via RPC
      const result = await addMembersToGroup(groupId, membersToAdd);
      
      // Show success toast with summary
      const registered = membersToAdd.filter(m => m.userId).length;
      const unregistered = membersToAdd.length - registered;
      
      if (result.addedCount > 0) {
        toast.success(
          `Added ${result.addedCount} member${result.addedCount > 1 ? 's' : ''}` +
          (registered > 0 ? ` (${registered} registered` : '') +
          (unregistered > 0 ? `, ${unregistered} invited` : '') +
          (registered > 0 || unregistered > 0 ? ')' : '')
        );
      }
      
      if (result.skippedCount > 0) {
        toast.info(`${result.skippedCount} already in group`);
      }
      
      // Navigate back
      navigation.goBack();
      
    } catch (error) {
      console.error('Error adding members:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add members');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const filteredContacts = allContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );
  
  const selectedCount = selectedContacts.size;
  const registeredSelected = allContacts
    .filter(c => selectedContacts.has(c.id) && c.isRegistered)
    .length;
  const unregisteredSelected = selectedCount - registeredSelected;
  
  const renderContactItem = (contact: ContactItem) => {
    const isSelected = selectedContacts.has(contact.id);
    
    return (
      <TouchableOpacity
        key={contact.id}
        style={[
          styles.contactItem,
          isSelected && styles.contactItemSelected
        ]}
        onPress={() => toggleContact(contact.id)}
        activeOpacity={0.7}
      >
        <View style={styles.contactInfo}>
          <View style={styles.contactHeader}>
            <Text style={styles.contactName}>{contact.name}</Text>
            {!contact.isRegistered && (
              <View style={styles.pendingBadge}>
                <Clock size={12} color={Colors.warning} />
                <Text style={styles.pendingBadgeText}>Will Invite</Text>
              </View>
            )}
          </View>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
          {contact.isRegistered && contact.email && (
            <Text style={styles.contactEmail}>{contact.email}</Text>
          )}
        </View>
        
        <View style={[
          styles.checkbox,
          isSelected && styles.checkboxSelected
        ]}>
          {isSelected && <Check size={16} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Users size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>
        {searchQuery ? 'No Matching Contacts' : 'No Available Contacts'}
      </Text>
      <Text style={styles.emptyStateText}>
        {searchQuery 
          ? 'Try a different search term' 
          : 'All your contacts are already members of this group'}
      </Text>
    </View>
  );
  
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.loadingItem}>
          <View style={styles.loadingAvatar} />
          <View style={styles.loadingContent}>
            <View style={styles.loadingName} />
            <View style={styles.loadingPhone} />
          </View>
        </View>
      ))}
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Blur Effect */}
      <BlurView
        style={styles.header}
        tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
        intensity={100}
      >
        <View style={[styles.headerOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(248,250,252,0.5)' }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Add Members</Text>
            <Text style={styles.headerSubtitle}>{groupName}</Text>
          </View>
          
          <View style={styles.headerRight}>
            {selectedCount > 0 && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>{selectedCount}</Text>
              </View>
            )}
          </View>
        </View>
      </BlurView>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      
      {/* Selection Summary */}
      {selectedCount > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {registeredSelected > 0 && `${registeredSelected} registered`}
            {registeredSelected > 0 && unregisteredSelected > 0 && ', '}
            {unregisteredSelected > 0 && `${unregisteredSelected} to invite`}
          </Text>
        </View>
      )}
      
      {/* Contacts List */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          renderLoadingState()
        ) : filteredContacts.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.contactsList}>
            <Text style={styles.sectionHeader}>
              {filteredContacts.length} Available Contact{filteredContacts.length !== 1 ? 's' : ''}
            </Text>
            {filteredContacts.map(renderContactItem)}
          </View>
        )}
      </ScrollView>
      
      {/* Add Button */}
      {selectedCount > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.addButton,
              isSubmitting && styles.addButtonDisabled
            ]}
            onPress={handleAddMembers}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <UserPlus size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>
                  Add {selectedCount} Member{selectedCount !== 1 ? 's' : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
