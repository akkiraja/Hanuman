import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, useColorScheme, TextInput, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Settings, Trash2, LogOut, Play, Gavel, Users, Trophy, ChevronRight, UserPlus, Phone, Search, Check, X, Shield } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useChitStore } from '../stores/chitStore';
import { useBiddingStore } from '../stores/biddingStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner-native';
import { isGroupAdmin, isGroupCreator, isGroupCoAdmin } from '../utils/adminHelpers';
import contactsService, { Contact } from '../services/contactsService';
import { supabase } from '../libs/supabase';
import OverviewCardsSection from '../components/bidding/OverviewCardsSection';
import CreateRoundModal from '../components/bidding/CreateRoundModal';
import AdminManagementModal from '../components/group/AdminManagementModal';

interface BiddingGroupDetailScreen2Props {
  navigation: any;
}

export default function BiddingGroupDetailScreen2({ navigation }: BiddingGroupDetailScreen2Props) {
  console.log('🔄 BiddingGroupDetailScreen2 mounted');
  
  const { currentGroup, loadGroupDetails, deleteGroup, leaveGroup, addMembersToGroup, appointCoAdmin, removeCoAdmin } = useChitStore();
  const { currentRound, loadCurrentRound, createBidRound, startBidRound, bidHistory, loadBidHistory, isLoading: isBiddingLoading, subscribeToRound, unsubscribeFromRound } = useBiddingStore();
  const { user } = useAuthStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateRoundModal, setShowCreateRoundModal] = useState(false);
  const [isCreatingRound, setIsCreatingRound] = useState(false);
  const [showAdminManagementModal, setShowAdminManagementModal] = useState(false);
  
  // Add Members Modal State
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [selectedPlatformUsers, setSelectedPlatformUsers] = useState<any[]>([]);
  const [hasContactsPermission, setHasContactsPermission] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  // Load group details and current round
  useEffect(() => {
    if (currentGroup?.id) {
      console.log('🔄 Background refresh group details:', currentGroup.id);
      loadGroupDetails(currentGroup.id).catch(err => {
        console.error('Background refresh failed:', err);
      });
      
      // Load current round to check if auction is active
      loadCurrentRound(currentGroup.id).catch(err => {
        console.error('Failed to load current round:', err);
      });
      
      // Load bid history for past rounds count
      loadBidHistory(currentGroup.id).catch(err => {
        console.error('Failed to load bid history:', err);
      });
    }
  }, [currentGroup?.id]);

  // Refresh round data when screen comes into focus
  // This ensures UI updates when auction ends naturally
  useFocusEffect(
    useCallback(() => {
      if (currentGroup?.id) {
        console.log('🔄 Screen focused - refreshing round data:', currentGroup.id);
        
        // Reload round data to get latest status
        loadCurrentRound(currentGroup.id).catch(err => {
          console.error('Focus refresh failed:', err);
        });
        
        // Also reload group details for member count updates
        loadGroupDetails(currentGroup.id).catch(err => {
          console.error('Focus group refresh failed:', err);
        });
      }
    }, [currentGroup?.id])
  );

  // Subscribe to realtime round updates
  useEffect(() => {
    if (!currentRound?.id) return;
    console.log('🔔 Subscribing to realtime updates for round:', currentRound.id);
    subscribeToRound(currentRound.id);

    return () => {
      console.log('🔕 Unsubscribing from realtime updates for round:', currentRound.id);
      unsubscribeFromRound();
    };
  }, [currentRound?.id, subscribeToRound, unsubscribeFromRound]);

  // Contact integration functions
  const loadContactsWithPermission = async (forceRefresh: boolean = false) => {
    try {
      const { contacts: loadedContacts, hasPermission } = await contactsService.getContactsWithPermission(user?.id, forceRefresh);
      
      setContacts(loadedContacts);
      setHasContactsPermission(hasPermission);
      
      return hasPermission;
    } catch (error) {
      console.error('Error loading contacts:', error);
      setContacts([]);
      setHasContactsPermission(false);
      return false;
    }
  };
  
  const loadPlatformUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .neq('id', user?.id)
        .order('name');
        
      if (error) {
        console.error('Error loading platform users:', error);
        setPlatformUsers([]);
      } else {
        setPlatformUsers(users || []);
      }
    } catch (error) {
      console.error('Error loading platform users:', error);
      setPlatformUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };
  
  const handleContactSelect = (contact: Contact) => {
    const isSelected = selectedContacts.find(c => c.id === contact.id);
    if (isSelected) {
      setSelectedContacts(prev => prev.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts(prev => [...prev, contact]);
    }
  };
  
  const handleUserSelect = (user: any) => {
    const isSelected = selectedPlatformUsers.find(u => u.id === user.id);
    if (isSelected) {
      setSelectedPlatformUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      setSelectedPlatformUsers(prev => [...prev, user]);
    }
  };
  
  const addSelectedMembersToGroup = async () => {
    console.log('🚀 Adding selected members to bidding group');
    setIsAddingMembers(true);
    
    const membersToAdd = [];
    
    // Process selected contacts
    selectedContacts.forEach((contact) => {
      const registeredUser = contact.registeredUser;
      
      if (!registeredUser || !registeredUser.id) {
        console.warn(`⚠️ Skipping contact ${contact.name} - no registered user`);
        return;
      }
      
      const memberData = {
        name: registeredUser.name || contact.name.trim(),
        phone: registeredUser.phone || contact.phoneNumbers?.[0]?.number?.replace(/[\s\-\(\)]/g, '') || '',
        email: registeredUser.email || '',
        userId: registeredUser.id
      };
      
      membersToAdd.push(memberData);
    });
    
    // Process selected platform users
    selectedPlatformUsers.forEach((user) => {
      if (!user.id) {
        console.warn(`⚠️ Skipping platform user ${user.name} - missing userId`);
        return;
      }
      
      const memberData = {
        name: user.name.trim(),
        phone: user.phone || '',
        email: user.email,
        userId: user.id
      };
      
      membersToAdd.push(memberData);
    });
    
    if (membersToAdd.length === 0) {
      setIsAddingMembers(false);
      toast.error('No valid registered users were selected.');
      return;
    }
    
    try {
      const result = await addMembersToGroup(currentGroup!.id, membersToAdd);
      
      // Close modals and reset state
      setShowAddMembersModal(false);
      setShowContactPicker(false);
      setShowUserPicker(false);
      setSelectedContacts([]);
      setSelectedPlatformUsers([]);
      setSearchQuery('');
      setUserSearchQuery('');
      
      if (result.addedCount > 0) {
        toast.success(`🎉 Added ${result.addedCount} member${result.addedCount > 1 ? 's' : ''} to group!`);
      } else {
        toast.info('All selected members are already in the group.');
      }
      
      // Refresh group details
      if (currentGroup?.id) {
        await loadGroupDetails(currentGroup.id);
      }
    } catch (error) {
      console.error('❌ Add members error:', error);
      toast.error(error.message || 'Failed to add members. Please try again.');
    } finally {
      setIsAddingMembers(false);
    }
  };

  // Handle create round with auto-start
  const handleCreateRound = async (biddingHours: number) => {
    if (!currentGroup?.id) return;
    
    try {
      setIsCreatingRound(true);
      
      // Calculate end time based on bidding hours
      const endTime = new Date(Date.now() + biddingHours * 60 * 60 * 1000);

      // Define totalPool safely before using
      const totalPool = (currentGroup?.monthlyAmount || 0) * (currentGroup?.currentMembers || 0);

      // Calculate minimum bid
      const minimumBid = Math.floor(totalPool * 0.1); // 10% of group pool
      
      console.log('🎯 Creating round with auto-start...');
      console.log(`⏰ Duration: ${biddingHours} hours`);
      console.log(`💰 Prize: ₹${totalPool.toLocaleString()}`);
      
      // Create round (this uses group monthly amount as prize automatically)
      const newRound = await createBidRound(currentGroup.id, endTime, minimumBid);
      
      // Auto-start the round immediately
      await startBidRound(newRound.id);
      
      console.log('✅ Round created and started successfully');
      
      toast.success(
        `Live bidding started for ${biddingHours} hour${biddingHours !== 1 ? 's' : ''}!`,
        {
          description: 'Members can now place their bids in the Bidding tab.'
        }
      );
      
      // Close modal and reload round data
      setShowCreateRoundModal(false);
      loadCurrentRound(currentGroup.id);
      
    } catch (error) {
      console.error('❌ Failed to create and start round:', error);
      toast.error('Failed to start auction', {
        description: 'Please try again or contact support.'
      });
    } finally {
      setIsCreatingRound(false);
    }
  };

  // Navigate to Auction tab
  const handleGoToLiveAuction = () => {
    console.log('🎯 Go to Live Auction pressed');
    // Navigate from Stack screen to Tab screen using nested navigation
    navigation.navigate('MainTabs' as never, { screen: 'Auction' } as never);
  };
  
  // Co-Admin Management Handlers
  const handleAppointCoAdmin = async (userId: string) => {
    console.log('👑 Appointing co-admin:', userId);
    try {
      await appointCoAdmin(currentGroup!.id, userId);
      toast.success('Co-admin appointed successfully');
      
      // Reload group details to reflect co-admin change
      if (currentGroup?.id) {
        await loadGroupDetails(currentGroup.id);
      }
    } catch (error) {
      console.error('❌ Error appointing co-admin:', error);
      toast.error(error.message || 'Failed to appoint co-admin');
      throw error;
    }
  };
  
  const handleRemoveCoAdmin = async () => {
    console.log('👑 Removing co-admin');
    try {
      await removeCoAdmin(currentGroup!.id);
      toast.success('Co-admin removed successfully');
      
      // Reload group details to reflect co-admin change
      if (currentGroup?.id) {
        await loadGroupDetails(currentGroup.id);
      }
    } catch (error) {
      console.error('❌ Error removing co-admin:', error);
      toast.error(error.message || 'Failed to remove co-admin');
      throw error;
    }
  };

  // Handle delete group (admin only)
  const handleDeleteGroup = async () => {
    if (!currentGroup?.id) return;
    
    try {
      setShowSettingsModal(false);
      console.log('🗑️ Deleting group:', currentGroup.id);
      
      // Navigate away first
      navigation.navigate('MainTabs');
      
      const success = await deleteGroup(currentGroup.id);
      
      if (success) {
        toast.success('Group deleted successfully');
      } else {
        toast.error('Failed to delete group');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete group');
    }
  };

  // Handle leave group (member)
  const handleLeaveGroup = async () => {
    if (!currentGroup?.id || !user?.id) return;
    
    try {
      setShowSettingsModal(false);
      console.log('👋 Leaving group:', currentGroup.id);
      
      // Navigate away first
      navigation.navigate('MainTabs');
      
      const success = await leaveGroup(currentGroup.id);
      
      if (success) {
        toast.success('Left group successfully');
      } else {
        toast.error('Failed to leave group');
      }
    } catch (error) {
      console.error('Leave error:', error);
      toast.error('Failed to leave group');
    }
  };

  // Check if user is admin
  const userIsAdmin = currentGroup && user ? isGroupAdmin(user?.id || '', currentGroup) : false;
  const userIsCreator = currentGroup && user ? isGroupCreator(user?.id || '', currentGroup) : false;

  // Calculate total pool
  const totalPool = (currentGroup?.monthlyAmount || 0) * (currentGroup?.currentMembers || 0);

  // Check if auction is active (only when status is 'active', not 'open')
  const isAuctionActive = !!currentRound && currentRound.status === 'active';

  // Show error only if no group data
  if (!currentGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{currentGroup.name}</Text>
            <Text style={styles.subtitle}>Bidding Group</Text>
          </View>
          {/* Admin Controls - Only for Group Admins */}
          {userIsAdmin && (
            <View style={styles.adminControls}>
              <TouchableOpacity 
                style={styles.addMembersButton}
                onPress={() => setShowAddMembersModal(true)}
              >
                <UserPlus size={20} color={Colors.primary} />
              </TouchableOpacity>
              {/* Co-Admin Management - Only for Creator */}
              {userIsCreator && (
                <TouchableOpacity 
                  style={styles.settingsButton}
                  onPress={() => setShowAdminManagementModal(true)}
                >
                  <Shield size={24} color={Colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => setShowSettingsModal(true)}
              >
                <Settings size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
          )}
          {/* Non-admin users just see settings */}
          {!userIsAdmin && (
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => setShowSettingsModal(true)}
            >
              <Settings size={24} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Group Info Section */}
        <View style={styles.section}>
          <Text style={styles.groupName}>{currentGroup.name}</Text>
          <Text style={styles.groupDescription}>Bidding Group</Text>
        </View>

        {/* Overview Cards Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <OverviewCardsSection
            totalPool={totalPool}
            currentMembers={currentGroup.currentMembers || 0}
            currentRoundNumber={typeof currentGroup.currentRound === 'number' ? currentGroup.currentRound : 0}
          />
        </View>

        {/* Live Auction Controls Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Auction</Text>
          
          {isAuctionActive && (
            <View style={styles.activeAuctionBanner}>
              <Gavel size={20} color={Colors.success} />
              <Text style={styles.activeAuctionText}>
                Auction is currently live!
              </Text>
            </View>
          )}
          
          <View style={styles.auctionControlsContainer}>
            {/* Admin: Start Live Auction Button */}
            {userIsAdmin && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.startAuctionButton,
                  isAuctionActive && styles.disabledButton
                ]}
                onPress={() => setShowCreateRoundModal(true)}
                disabled={isAuctionActive || isCreatingRound}
              >
                <Play size={20} color={isAuctionActive ? Colors.textSecondary : Colors.background} />
                <Text style={[
                  styles.actionButtonText,
                  isAuctionActive && styles.disabledButtonText
                ]}>
                  {isAuctionActive ? 'Auction Running' : 'Start Live Auction'}
                </Text>
              </TouchableOpacity>
            )}

            {/* All Members: Go to Live Auction Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.goToAuctionButton]}
              onPress={handleGoToLiveAuction}
            >
              <Gavel size={20} color={Colors.primary} />
              <Text style={styles.goToAuctionButtonText}>Go to Live Auction</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.auctionNote}>
            {userIsAdmin 
              ? 'Start a new auction round and members will be notified. Access live bidding through the Bidding tab.'
              : 'View and participate in active auctions through the Bidding tab.'
            }
          </Text>
        </View>

        {/* View All Members CTA Card */}
        <TouchableOpacity 
          style={styles.ctaCard}
          onPress={() => {
            navigation.navigate('GroupMembers' as never, {
              groupId: currentGroup.id,
              groupName: currentGroup.name
            } as never);
          }}
        >
          <View style={styles.ctaContent}>
            <View style={styles.ctaIcon}>
              <Users size={24} color={Colors.primary} />
            </View>
            <View style={styles.ctaText}>
              <Text style={styles.ctaTitle}>View All Members</Text>
              <Text style={styles.ctaSubtitle}>
                {currentGroup.currentMembers || 0} member{(currentGroup.currentMembers || 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* View Past Rounds CTA Card */}
        <TouchableOpacity 
          style={styles.ctaCard}
          onPress={() => {
            navigation.navigate('PastRounds' as never, {
              groupId: currentGroup.id,
              groupName: currentGroup.name
            } as never);
          }}
        >
          <View style={styles.ctaContent}>
            <View style={styles.ctaIcon}>
              <Trophy size={24} color={Colors.primary} />
            </View>
            <View style={styles.ctaText}>
              <Text style={styles.ctaTitle}>View Past Rounds</Text>
              <Text style={styles.ctaSubtitle}>
                {bidHistory?.length || 0} completed round{(bidHistory?.length || 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Create Round Modal */}
      <CreateRoundModal
        visible={showCreateRoundModal}
        onClose={() => setShowCreateRoundModal(false)}
        onCreateRound={handleCreateRound}
        groupPoolAmount={totalPool}
        isLoading={isCreatingRound}
      />

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowSettingsModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Group Settings</Text>
            
            {userIsCreator && (
              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={handleDeleteGroup}
              >
                <Trash2 size={20} color={Colors.error} />
                <Text style={[styles.modalOptionText, { color: Colors.error }]}>
                  Delete Group
                </Text>
              </TouchableOpacity>
            )}
            
            {!userIsCreator && (
              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={handleLeaveGroup}
              >
                <LogOut size={20} color={Colors.error} />
                <Text style={[styles.modalOptionText, { color: Colors.error }]}>
                  Leave Group
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.modalOption, styles.cancelOption]} 
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Add Members Modal */}
      <Modal
        visible={showAddMembersModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddMembersModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Members</Text>
            <TouchableOpacity 
              onPress={addSelectedMembersToGroup}
              disabled={isAddingMembers || (selectedContacts.length === 0 && selectedPlatformUsers.length === 0)}
            >
              <Text style={[
                styles.addButton,
                (isAddingMembers || (selectedContacts.length === 0 && selectedPlatformUsers.length === 0)) && { color: Colors.textSecondary }
              ]}>
                {isAddingMembers ? 'Adding...' : `Add (${selectedContacts.length + selectedPlatformUsers.length})`}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.addMembersContent}>
            <Text style={styles.addMembersTitle}>Select members to add to the bidding group</Text>
            
            {/* Loading Indicator */}
            {isAddingMembers && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Adding members to group...</Text>
              </View>
            )}
            
            <View style={styles.addMembersActions}>
              <TouchableOpacity
                style={styles.addMembersActionButton}
                onPress={async () => {
                  if (hasContactsPermission) {
                    setShowContactPicker(true);
                  } else {
                    const granted = await loadContactsWithPermission();
                    if (granted) {
                      setShowContactPicker(true);
                    }
                  }
                }}
              >
                <Phone size={20} color={Colors.primary} />
                <Text style={styles.addMembersActionText}>From Contacts</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.addMembersActionButton}
                onPress={async () => {
                  await loadPlatformUsers();
                  setShowUserPicker(true);
                }}
              >
                <Users size={20} color={Colors.primary} />
                <Text style={styles.addMembersActionText}>Platform Users</Text>
              </TouchableOpacity>
            </View>
            
            {/* Selected Members Preview */}
            {(selectedContacts.length > 0 || selectedPlatformUsers.length > 0) && (
              <View style={styles.selectedMembersPreview}>
                <Text style={styles.selectedMembersTitle}>
                  Selected Members ({selectedContacts.length + selectedPlatformUsers.length})
                </Text>
                
                {selectedContacts.map(contact => (
                  <View key={contact.id} style={styles.selectedMemberItem}>
                    <Text style={styles.selectedMemberName}>{contact.name}</Text>
                    <TouchableOpacity onPress={() => handleContactSelect(contact)}>
                      <X size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                
                {selectedPlatformUsers.map(user => (
                  <View key={user.id} style={styles.selectedMemberItem}>
                    <Text style={styles.selectedMemberName}>{user.name}</Text>
                    <TouchableOpacity onPress={() => handleUserSelect(user)}>
                      <X size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Contact Picker Modal */}
      <Modal
        visible={showContactPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowContactPicker(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Contacts</Text>
            <TouchableOpacity onPress={() => setShowContactPicker(false)}>
              <Text style={styles.addButton}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.contactPickerContent}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            
            <ScrollView style={styles.contactsList}>
              {contacts
                .filter(contact => 
                  contact.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(contact => {
                  const isSelected = selectedContacts.find(c => c.id === contact.id);
                  return (
                    <TouchableOpacity
                      key={contact.id}
                      style={[
                        styles.contactItem,
                        isSelected && styles.selectedContactItem
                      ]}
                      onPress={() => handleContactSelect(contact)}
                    >
                      <Text style={styles.contactName}>{contact.name}</Text>
                      {contact.phoneNumbers?.[0] && (
                        <Text style={styles.contactPhone}>
                          {contact.phoneNumbers[0].number}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Platform Users Modal */}
      <Modal
        visible={showUserPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowUserPicker(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Platform Users</Text>
            <TouchableOpacity 
              onPress={() => setShowUserPicker(false)}
              disabled={selectedPlatformUsers.length === 0}
            >
              <Text style={[
                styles.addButton,
                selectedPlatformUsers.length === 0 && { color: Colors.textSecondary }
              ]}>
                Done ({selectedPlatformUsers.length})
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInputField}
              placeholder="Search users..."
              value={userSearchQuery}
              onChangeText={setUserSearchQuery}
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
          
          {loadingUsers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading platform users...</Text>
            </View>
          ) : platformUsers.filter(user => 
            user.name.toLowerCase().includes(userSearchQuery.toLowerCase())
          ).length === 0 ? (
            <View style={styles.emptyContactsContainer}>
              <Users size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyContactsTitle}>No Users Found</Text>
              <Text style={styles.emptyContactsText}>
                {platformUsers.length === 0 
                  ? 'No other users have signed up yet.' 
                  : 'No users match your search'
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={platformUsers.filter(user => 
                user.name.toLowerCase().includes(userSearchQuery.toLowerCase())
              )}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedPlatformUsers.find(u => u.id === item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.contactItem,
                      isSelected && styles.contactItemSelected
                    ]}
                    onPress={() => handleUserSelect(item)}
                  >
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{item.name}</Text>
                      <Text style={styles.contactPhone}>{item.email}</Text>
                      {item.phone && (
                        <Text style={styles.contactPhone}>{item.phone}</Text>
                      )}
                    </View>
                    {isSelected && (
                      <Check size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
      
      {/* Admin Management Modal (Creator Only) */}
      <AdminManagementModal
        visible={showAdminManagementModal}
        onClose={() => setShowAdminManagementModal(false)}
        members={currentGroup.members || []}
        currentCoAdminId={currentGroup.co_admin_id}
        creatorId={currentGroup.createdBy}
        currentUserId={user?.id || ''}
        currentGroup={currentGroup}
        onAppointCoAdmin={handleAppointCoAdmin}
        onRemoveCoAdmin={handleRemoveCoAdmin}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  adminControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addMembersButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary + '20',
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginBottom: 12,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    color: Colors.text,
  },
  cancelOption: {
    backgroundColor: Colors.border,
    marginTop: 8,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  auctionControlsContainer: {
    gap: 12,
  },
  activeAuctionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    borderColor: Colors.success,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  activeAuctionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  startAuctionButton: {
    backgroundColor: Colors.primary,
  },
  goToAuctionButton: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: Colors.border,
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  goToAuctionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  disabledButtonText: {
    color: Colors.textSecondary,
  },
  auctionNote: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
    lineHeight: 18,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ctaText: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  
  // Member Addition Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cancelButton: {
    fontSize: 16,
    color: Colors.error,
  },
  addButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  addMembersContent: {
    flex: 1,
    padding: 20,
  },
  addMembersTitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  addMembersActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  addMembersActionButton: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  addMembersActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  selectedMembersPreview: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  selectedMembersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  selectedMemberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedMemberName: {
    fontSize: 14,
    color: Colors.text,
  },
  contactPickerContent: {
    flex: 1,
    padding: 20,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
  },
  contactsList: {
    flex: 1,
  },
  contactItem: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedContactItem: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  
  // Platform Users Modal Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    gap: 12,
  },
  searchInputField: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  emptyContactsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyContactsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyContactsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  contactItemSelected: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  contactInfo: {
    flex: 1,
  },
});