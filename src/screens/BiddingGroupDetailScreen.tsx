import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, FlatList, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Users, TrendingDown, Calendar, Trophy, Settings, Trash2, LogOut, X, Crown, Shield, UserPlus, Phone, Search, Check } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useChitStore } from '../stores/chitStore';
import { useBiddingStore } from '../stores/biddingStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner-native';
import { isGroupAdmin, isGroupCreator, getAdminRole } from '../utils/adminHelpers';
import AdminManagementModal from '../components/group/AdminManagementModal';
import AdminBadge from '../components/group/AdminBadge';
import contactsService, { Contact } from '../services/contactsService';
import { supabase } from '../libs/supabase';
import { normalizePhone } from '../utils/phone';
import OverviewCardsSection from '../components/bidding/OverviewCardsSection';
import LiveBiddingSection from '../components/bidding/LiveBiddingSection';
import CurrentRoundCard from '../components/bidding/CurrentRoundCard';
import { ChevronRight } from 'lucide-react-native';
import CollapsibleRulesSection from '../components/bidding/CollapsibleRulesSection';
import { BiddingGroupSkeleton } from '../components/bidding/LoadingSkeleton';
import CreateRoundModal from '../components/bidding/CreateRoundModal';

interface BiddingGroupDetailScreenProps {
  navigation: any;
}

export default function BiddingGroupDetailScreen({ navigation }: BiddingGroupDetailScreenProps) {
  // Performance timing
  console.time('⚡ BiddingGroupDetailScreen:InitialRender');
  
  const { currentGroup, loadGroupDetails, deleteGroup, leaveGroup, addMembersToGroup, appointCoAdmin, removeCoAdmin } = useChitStore();

  const { user } = useAuthStore();
  const {
    currentRound,
    bidHistory,
    isLoading,
    loadCurrentRound,
    loadBidHistory,
    createBidRound,
    startBidRound,
    userBids,
    loadUserBids
  } = useBiddingStore();
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showCreateRoundModal, setShowCreateRoundModal] = useState(false);
  const [showAdminManagementModal, setShowAdminManagementModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  
  // Add Members Modal State
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [selectedPlatformUsers, setSelectedPlatformUsers] = useState<any[]>([]);
  const [hasContactsPermission, setHasContactsPermission] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  
  // PHASE 1: Critical Path - Load only group details for fast first render (like GroupDetailScreen)
  useEffect(() => {
  if (currentGroup?.id) {
  console.log('🚀 Phase 1: Loading group details for fast render:', currentGroup.id);
  loadGroupDetails(currentGroup.id).finally(() => {
  setIsInitialLoading(false); // Show content immediately after group details
  console.timeEnd('⚡ BiddingGroupDetailScreen:InitialRender');
  });
  }
  }, [currentGroup?.id]);

  // PHASE 2: Progressive Loading - Load current round data for live bidding section
  useEffect(() => {
  if (currentGroup?.id && !isInitialLoading) {
      console.log('⚡ Phase 2: Loading current round data:', currentGroup.id);
          loadCurrentRound(currentGroup.id);
        }
      }, [currentGroup?.id, isInitialLoading]);

      // PHASE 3: Deferred Loading - Load user-specific data after interactions complete (v3 safe)
      useEffect(() => {
      if (currentGroup?.id && user?.id && !isInitialLoading) {
      console.log('⏳ Phase 3: Deferring user bids and history to after interactions:', currentGroup.id);
      let cancelled = false;
      const handle = InteractionManager.runAfterInteractions(async () => {
      if (cancelled) return;
      try {
      await Promise.all([
        loadUserBids(currentGroup.id, user.id),
          loadBidHistory(currentGroup.id)
      ]);
      } catch (err) {
          console.log('Deferred load error:', err);
        }
      });

              return () => {
              cancelled = true;
              if (typeof handle?.cancel === 'function') handle.cancel();
              };
              }
                }, [currentGroup?.id, user?.id, isInitialLoading]);
  
  // Handle create round with auto-start
  const handleCreateRound = async (biddingHours: number) => {
    if (!currentGroup?.id) return;
    
    try {
      // Calculate end time based on bidding hours
      const endTime = new Date(Date.now() + biddingHours * 60 * 60 * 1000);

      // ✅ Define totalPool safely before using
      const totalPool = (currentGroup?.monthlyAmount || 0) * (currentGroup?.currentMembers || 0);

      // ✅ Now safe to calculate minimum bid
      const minimumBid = Math.floor(totalPool * 0.1); // 10% of group pool
      
      console.log('🎯 Creating round with auto-start...');
      console.log(`⏰ Duration: ${biddingHours} hours`);
      console.log(`💰 Prize: ₹${totalPool.toLocaleString()}`);
      
      // Create round (this uses group monthly amount as prize automatically)
      const newRound = await createBidRound(currentGroup.id, endTime, minimumBid);
      
      // Auto-start the round immediately
      await startBidRound(newRound.id);
      
      console.log('✅ Round created and started successfully');
      
      // Show success message
      Alert.alert(
        'Round Started!',
        `Live bidding is now active for ${biddingHours} hour${biddingHours !== 1 ? 's' : ''}. Members can start placing bids.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Failed to create and start round:', error);
      throw error;
    }
  };
  
  // Contact integration functions
  const loadContactsWithPermission = async (forceRefresh: boolean = false) => {
  setLoadingContacts(true);
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
    } finally {
          setLoadingContacts(false);
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
        phone: normalizePhone(registeredUser.phone || contact.phoneNumbers?.[0]?.number),
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
      Alert.alert('No Valid Members', 'No valid registered users were selected.');
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
      Alert.alert('Error', error.message || 'Failed to add members. Please try again.');
    } finally {
      setIsAddingMembers(false);
    }
  };
  
  const handleAppointCoAdmin = async (memberId: string) => {
    console.log('👑 BiddingGroupDetailScreen handleAppointCoAdmin called:', {
      memberId,
      groupId: currentGroup?.id,
      groupName: currentGroup?.name,
    });
    
    try {
      if (!currentGroup) {
        console.error('❌ No current group');
        return;
      }
      
      console.log('📞 Calling appointCoAdmin from store...');
      await appointCoAdmin(currentGroup.id, memberId);
      console.log('✅ appointCoAdmin completed successfully');
      toast.success('Co-admin appointed successfully! 👑');
    } catch (error) {
      console.error('❌ Failed to appoint co-admin:', error);
      toast.error('Failed to appoint co-admin');
    }
  };

  const handleRemoveCoAdmin = async () => {
    console.log('🚫 BiddingGroupDetailScreen handleRemoveCoAdmin called:', {
      groupId: currentGroup?.id,
      currentCoAdminId: currentGroup?.co_admin_id,
    });
    
    try {
      if (!currentGroup) {
        console.error('❌ No current group');
        return;
      }
      
      console.log('📞 Calling removeCoAdmin from store...');
      await removeCoAdmin(currentGroup.id);
      console.log('✅ removeCoAdmin completed successfully');
      toast.success('Co-admin removed successfully');
    } catch (error) {
      console.error('❌ Failed to remove co-admin:', error);
      toast.error('Failed to remove co-admin');
    }
  };
  
  if (!currentGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Group not found</Text>
      </SafeAreaView>
    );
  }
  
  // Show loading skeleton while initial data loads
  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <BiddingGroupSkeleton />
      </SafeAreaView>
    );
  }
  
  const isAdmin = isGroupAdmin(user?.id, currentGroup);
  const totalPool = (currentGroup?.monthlyAmount || 0) * (currentGroup?.currentMembers || 0);
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            {/* Settings/Admin Management Icons */}
            {isGroupCreator(user?.id, currentGroup) ? (
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => setShowAdminManagementModal(true)}
              >
                <Shield size={24} color={Colors.primary} />
              </TouchableOpacity>
            ) : !isGroupAdmin(user?.id, currentGroup) && (
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => setShowSettingsModal(true)}
              >
                <Settings size={24} color={Colors.text} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{currentGroup.name}</Text>
            <Text style={styles.subtitle}>Bidding Group</Text>
          </View>
          {/* Admin Controls - Only for Group Admins */}
          {isGroupAdmin(user?.id, currentGroup) && (
            <View style={styles.adminControls}>
              <TouchableOpacity 
                style={styles.addMembersButton}
                onPress={() => setShowAddMembersModal(true)}
              >
                <UserPlus size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => setShowSettingsModal(true)}
              >
                <Settings size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* 1. Overview Cards */}
        <OverviewCardsSection
          totalPool={totalPool}
          currentMembers={currentGroup?.currentMembers || 0}
          currentRoundNumber={currentRound?.roundNumber || 0}
        />
        
        {/* 2. Live Bidding Section */}
        <LiveBiddingSection
          currentRound={currentRound}
          isAdmin={isAdmin}
          onEnterLiveBidding={() => {
            if (currentRound?.id) {
              navigation.navigate('BiddingRound' as never, { 
                groupId: currentGroup.id, 
                roundId: currentRound.id 
              } as never);
            }
          }}
          onCreateRound={() => setShowCreateRoundModal(true)}
        />
        
        {/* 3. Current Round Details */}
        <CurrentRoundCard currentRound={currentRound} />
        
        {/* 4. Group Members CTA Card (Lightweight) */}
        <TouchableOpacity 
          style={styles.ctaCard}
          onPress={() => {
            navigation.navigate('GroupMembers' as never, {
              groupId: currentGroup.id,
              groupName: currentGroup.name
            } as never);
          }}
          activeOpacity={0.7}
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
        
        {/* 5. Past Rounds CTA Card (Lightweight) */}
        <TouchableOpacity 
          style={styles.ctaCard}
          onPress={() => {
            navigation.navigate('PastRounds' as never, {
              groupId: currentGroup.id,
              groupName: currentGroup.name
            } as never);
          }}
          activeOpacity={0.7}
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
        
        {/* 6. Collapsible Bidding Rules */}
        <CollapsibleRulesSection defaultExpanded={false} />
      </ScrollView>
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
      
      {/* Create Round Modal */}
      <CreateRoundModal
        visible={showCreateRoundModal}
        onClose={() => setShowCreateRoundModal(false)}
        onCreateRound={handleCreateRound}
        groupPoolAmount={totalPool}
        isLoading={isLoading}
      />
      
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
            
            {loadingContacts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading contacts...</Text>
              </View>
            ) : (
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
                  })
                }
              </ScrollView>
            )}
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
      
      <AdminManagementModal
        visible={showAdminManagementModal}
        onClose={() => setShowAdminManagementModal(false)}
        members={currentGroup.members}
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
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '20',
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSection: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...Colors.shadow,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  emptyPreview: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  
  // CTA Card Styles (Lightweight)
  ctaCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Colors.shadow,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ctaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
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