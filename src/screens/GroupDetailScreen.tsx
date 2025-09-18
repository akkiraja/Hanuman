
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Users, Plus, Calendar, IndianRupee, Gift, UserPlus, Settings, Trash2, Trophy, LogOut, X, ArrowRight, CheckCircle, Crown, Phone, Search, Check } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useChitStore } from '../stores/chitStore';
import { useAuthStore } from '../stores/authStore';
import BiddingGroupDetailScreen from './BiddingGroupDetailScreen';
import { Member, WinnerRecord } from '../types/chitFund';
import { format } from 'date-fns';
import { toast } from 'sonner-native';
import { supabase } from '../libs/supabase';
import { Platform, FlatList, ActivityIndicator } from 'react-native';
import LuckyDrawSpinner from '../components/LuckyDrawSpinner';

import contactsService, { Contact } from '../services/contactsService';



interface Props {
  navigation: any;
}

export default function GroupDetailScreen({ navigation }: Props) {
  const { currentGroup, joinGroup, conductLuckyDraw, conductLuckyDrawWithWinner, finalizeLuckyDraw, selectManualWinner, addMembersToGroup, isLoading, fetchGroups, loadGroupDetails, deleteGroup, leaveGroup } = useChitStore();
  const { user } = useAuthStore();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showManualWinnerModal, setShowManualWinnerModal] = useState(false);
  const [selectedMemberForWinner, setSelectedMemberForWinner] = useState<Member | null>(null);
  
  // Spinner state
  const [showSpinner, setShowSpinner] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<any>(null);

  
  // Add Members Modal State
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [selectedPlatformUsers, setSelectedPlatformUsers] = useState<any[]>([]);
  const [hasContactsPermission, setHasContactsPermission] = useState(false);
  const [isRefreshingContacts, setIsRefreshingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: '',
    phone: '',
    email: ''
  });

  // Load complete group details when screen mounts or currentGroup changes
  useEffect(() => {
    if (currentGroup?.id) {
      console.log(`🔄 Loading details for group: ${currentGroup.name}`);
      loadGroupDetails(currentGroup.id);
      

    }
  }, [currentGroup?.id, loadGroupDetails]);
  

  


  // Check if we're in the 5-day payment window before draw date
  const isInPaymentWindow = (drawDay: string) => {
    const today = new Date();
    const drawDayNum = parseInt(drawDay);
    
    // Calculate this month's draw date
    let drawDate = new Date(today.getFullYear(), today.getMonth(), drawDayNum);
    
    // If draw day has passed this month, consider next month's draw
    if (drawDate < today) {
      drawDate = new Date(today.getFullYear(), today.getMonth() + 1, drawDayNum);
    }
    
    // Calculate payment window start (5 days before draw date)
    const paymentWindowStart = new Date(drawDate);
    paymentWindowStart.setDate(drawDate.getDate() - 5);
    
    // Payment window is from 5 days before until draw date
    const isInWindow = today >= paymentWindowStart && today <= drawDate;
    
    return isInWindow;
  };

  // Check if member should show payment status (paid indicator)
  const shouldShowPaymentStatus = (member: Member) => {
    const isPaid = member.contributionStatus === 'paid';
    const hasDrawDay = !!currentGroup?.drawDay;
    const inWindow = currentGroup?.drawDay ? isInPaymentWindow(currentGroup.drawDay) : false;
    const shouldShow = isPaid && hasDrawDay && inWindow;
    
    // Debug payment status visibility
    console.log(`💳 Payment Status Check for ${member.name}:`);
    console.log(`   - Contribution Status: ${member.contributionStatus}`);
    console.log(`   - Is Paid: ${isPaid}`);
    console.log(`   - Has Draw Day: ${hasDrawDay} (${currentGroup?.drawDay})`);
    console.log(`   - In Payment Window: ${inWindow}`);
    console.log(`   - Should Show Tick: ${shouldShow}`);
    
    return shouldShow;
  };

  if (!currentGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Group not found</Text>
      </SafeAreaView>
    );
  }
  
  // Render bidding group detail screen for bidding groups
  if (currentGroup.groupType === 'bidding') {
    return <BiddingGroupDetailScreen navigation={navigation} />;
  }

  const handleJoinGroup = async () => {
    Alert.alert(
      'Feature Disabled',
      'Manual member addition is no longer supported. Only registered platform users can be added to groups. Please ask the person to sign up on the app first, then add them from the group creation screen.',
      [{ text: 'OK' }]
    );
    setShowJoinModal(false);
  };

  const handleLuckyDraw = async () => {
    try {
      // Select winner but don't save to database yet
      const winnerInfo = await conductLuckyDrawWithWinner(currentGroup.id);
      setSelectedWinner(winnerInfo);
      setShowDrawModal(false);
      setShowSpinner(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to start lucky draw');
      console.error('Lucky draw error:', error);
    }
  };
  
  const handleSpinnerComplete = async (winner: any) => {
    try {
      // Finalize the draw in database
      await finalizeLuckyDraw(selectedWinner);
      setShowSpinner(false);
      setSelectedWinner(null);
      
      toast.success(`🎉 ${winner.memberName} won ₹${winner.amount.toLocaleString()}!`);
      
      // Refresh group details to get updated data
      if (currentGroup?.id) {
        await loadGroupDetails(currentGroup.id);
      }
    } catch (error) {
      setShowSpinner(false);
      setSelectedWinner(null);
      Alert.alert('Error', 'Failed to finalize lucky draw');
      console.error('Lucky draw finalization error:', error);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      setShowDeleteModal(false);
      
      // Navigate away immediately to prevent "group not found" error
      navigation.navigate('MainTabs');
      
      const success = await deleteGroup(currentGroup.id);
      
      if (success) {
        toast.success('Group deleted successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete group');
      console.error('Delete group error:', error);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      setShowLeaveModal(false);
      setShowSettingsModal(false);
      
      // Navigate away immediately to prevent issues
      navigation.navigate('MainTabs');
      
      const success = await leaveGroup(currentGroup.id);
      
      if (success) {
        toast.success('You have left the group successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to leave group');
      console.error('Leave group error:', error);
    }
  };

  const handleManualWinnerSelection = (member: Member) => {
    setSelectedMemberForWinner(member);
    setShowManualWinnerModal(true);
  };

  const confirmManualWinner = async () => {
    if (!selectedMemberForWinner) return;
    
    try {
      const winner = await selectManualWinner(currentGroup.id, selectedMemberForWinner.id);
      setShowManualWinnerModal(false);
      setSelectedMemberForWinner(null);
      toast.success(`🎉 ${winner.memberName} selected as winner! ₹${winner.amount.toLocaleString()}`);
      
      // Refresh group details to get updated data
      if (currentGroup?.id) {
        await loadGroupDetails(currentGroup.id);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to select winner');
      console.error('Manual winner selection error:', error);
    }
  };

  // Contact integration functions using new service
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

  const refreshContacts = async () => {
    console.log('🔄 Refreshing contacts...');
    setIsRefreshingContacts(true);
    
    try {
      await loadContactsWithPermission(true); // Force refresh
      toast.success('🔄 Contacts refreshed!');
    } catch (error) {
      console.error('Error refreshing contacts:', error);
      toast.error('Failed to refresh contacts');
    } finally {
      setIsRefreshingContacts(false);
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

  const handleContactSelect = (contact: any) => {
    const isSelected = selectedContacts.find(c => c.id === contact.id);
    if (isSelected) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
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
    console.log("🚀 addSelectedMembersToGroup CALLED");
    console.log('🚀 === ADDING SELECTED MEMBERS TO GROUP ===');
    console.log('📊 Selected contacts:', selectedContacts.length);
    console.log('📊 Selected platform users:', selectedPlatformUsers.length);
    console.log('🎯 Current group ID:', currentGroup?.id);
    
    // Show loading state immediately
    setIsAddingMembers(true);
    
    const membersToAdd = [];
    
    // Add selected contacts
    console.log('📱 Processing selected contacts...');
    selectedContacts.forEach((contact, index) => {
      console.log(`📱 Contact ${index + 1}:`, {
        name: contact.name,
        id: contact.id,
        hasRegisteredUser: !!contact.registeredUser,
        registeredUserId: contact.registeredUser?.id,
        registeredUserName: contact.registeredUser?.name
      });
      
      const registeredUser = contact.registeredUser;
      
      if (!registeredUser || !registeredUser.id) {
        console.warn(`⚠️ Skipping contact ${contact.name} - no registered user or missing userId`);
        return;
      }
      
      const memberData = {
        name: registeredUser.name || contact.name.trim(),
        phone: registeredUser.phone || contact.phoneNumbers?.[0]?.number?.replace(/[\s\-\(\)]/g, '') || '',
        email: registeredUser.email || '',
        userId: registeredUser.id
      };
      
      console.log(`✅ Adding contact member:`, memberData);
      membersToAdd.push(memberData);
    });
    
    // Add selected platform users
    console.log('👥 Processing selected platform users...');
    selectedPlatformUsers.forEach((user, index) => {
      console.log(`👥 Platform user ${index + 1}:`, {
        name: user.name,
        id: user.id,
        email: user.email,
        phone: user.phone
      });
      
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
      
      console.log(`✅ Adding platform user member:`, memberData);
      membersToAdd.push(memberData);
    });
    
    console.log(`📊 Total members to add: ${membersToAdd.length}`);
    console.log('📋 Members data:', membersToAdd);
    console.log("👥 Final membersToAdd:", membersToAdd);
    
    if (membersToAdd.length === 0) {
      console.warn('⚠️ No valid members to add');
      setIsAddingMembers(false); // Hide loading state
      Alert.alert('No Valid Members', 'No valid registered users were selected. Please ensure selected contacts are registered on the platform.');
      return;
    }
    
    try {
      console.log('🔄 Calling addMembersToGroup...');
      const result = await addMembersToGroup(currentGroup.id, membersToAdd);
      console.log('✅ addMembersToGroup result:', result);
      
      // Close modals and reset state
      console.log('🔄 Closing modals and resetting state...');
      setShowAddMembersModal(false);
      setShowContactPicker(false);
      setShowUserPicker(false);
      setSelectedContacts([]);
      setSelectedPlatformUsers([]);
      setSearchQuery('');
      setUserSearchQuery('');
      
      // Show appropriate feedback based on result
      if (result.addedCount > 0) {
        console.log('🎉 Showing success toast...');
        toast.success(`🎉 Added ${result.addedCount} member${result.addedCount > 1 ? 's' : ''} to group!`);
      } else {
        console.log('ℹ️ Showing info message for no new members...');
        toast.info('All selected members are already in the group.');
      }
      
      // Refresh group details
      console.log('🔄 Refreshing group details...');
      if (currentGroup?.id) {
        await loadGroupDetails(currentGroup.id);
        console.log('✅ Group details refreshed');
      }
      
      console.log('🎉 Member addition process completed successfully!');
    } catch (error) {
      console.error('❌ Add members error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Alert.alert('Error', error.message || 'Failed to add members. Please try again.');
    } finally {
      // Always hide loading state
      setIsAddingMembers(false);
    }
  };

  const canStartDraw = currentGroup.status === 'active' && 
    currentGroup.members.filter(m => !m.hasReceived && m.isActive).length > 0;

  const totalPool = currentGroup.monthlyAmount * currentGroup.currentMembers;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            {/* Settings Icon - Only for Non-Admin Members */}
            {user?.id !== currentGroup.createdBy && (
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
            <Text style={styles.subtitle}>{currentGroup.description}</Text>
          </View>
          {/* Admin Controls - Only for Group Admin */}
          {user?.id === currentGroup.createdBy && (
            <View style={styles.adminControls}>
              <TouchableOpacity 
                style={styles.addMembersButton}
                onPress={() => setShowAddMembersModal(true)}
              >
                <UserPlus size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => setShowDeleteModal(true)}
              >
                <Settings size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Group Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, Colors.shadow]}>
            <IndianRupee size={24} color={Colors.money} />
            <Text style={styles.statNumber}>₹{totalPool.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Pool</Text>
          </View>
          
          <View style={[styles.statCard, Colors.shadow]}>
            <Users size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>{currentGroup.currentMembers}/40</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          
          <View style={[styles.statCard, Colors.shadow]}>
            <Gift size={24} color={Colors.success} />
            <Text style={styles.statNumber}>{currentGroup.winners.length}</Text>
            <Text style={styles.statLabel}>Winners</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {currentGroup.status === 'forming' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton, Colors.shadow]}
              onPress={() => setShowJoinModal(true)}
            >
              <UserPlus size={20} color={Colors.background} />
              <Text style={styles.primaryButtonText}>Add Member</Text>
            </TouchableOpacity>
          )}
          
          {/* Only group admin can conduct lucky draw if there are eligible members */}
          {user?.id === currentGroup.createdBy && 
           currentGroup.members.filter(m => !m.hasReceived && m.isActive).length > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.successButton, Colors.shadow]}
              onPress={() => setShowDrawModal(true)}
            >
              <Gift size={20} color={Colors.background} />
              <Text style={styles.successButtonText}>Lucky Draw (Admin)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Next Draw Info */}
        {currentGroup.status === 'active' && (
          <View style={[styles.nextDrawCard, Colors.shadow]}>
            <Calendar size={24} color={Colors.warning} />
            <View style={styles.nextDrawContent}>
              <Text style={styles.nextDrawTitle}>Next Draw</Text>
              <Text style={styles.nextDrawDate}>
                {format(new Date(currentGroup.nextDrawDate), 'EEEE, MMMM dd, yyyy')}
              </Text>
            </View>
          </View>
        )}



        {/* Members Overview */}
        <View style={styles.membersSection}>
          <View style={styles.membersHeader}>
            <Text style={styles.membersTitle}>Members ({currentGroup.members.length})</Text>
            <View style={styles.membersStats}>
              <View style={styles.statChip}>
                <View style={[styles.statDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.statChipText}>
                  {currentGroup.members.filter(m => m.hasReceived).length} Won
                </Text>
              </View>
              <View style={styles.statChip}>
                <View style={[styles.statDot, { backgroundColor: Colors.warning }]} />
                <Text style={styles.statChipText}>
                  {currentGroup.members.filter(m => !m.hasReceived).length} Pending
                </Text>
              </View>
            </View>
          </View>
          
          {/* Winners Section */}
          {currentGroup.members.filter(m => m.hasReceived).length > 0 && (
            <View style={styles.memberGroup}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>🏆 Winners</Text>
              </View>
              {currentGroup.members
                .filter(m => m.hasReceived)
                .map((member) => {
                  const winnerRecord = currentGroup.winners.find(w => w.memberId === member.id);
                  return (
                    <View key={member.id} style={[styles.memberRow, styles.winnerRow]}>
                      <View style={styles.memberDetails}>
                        <View style={styles.memberNameRow}>
                          {shouldShowPaymentStatus(member) && (
                            <CheckCircle size={16} color={Colors.success} style={styles.paymentStatusIcon} />
                          )}
                          <Text style={styles.memberNameText}>{member.name}</Text>
                        </View>
                        <Text style={styles.memberPhoneText}>{member.phone}</Text>
                        {winnerRecord && (
                          <Text style={styles.winDateText}>
                            Won on {format(new Date(winnerRecord.drawDate), 'MMM dd, yyyy')}
                          </Text>
                        )}
                      </View>
                      <View style={styles.memberActions}>
                        <Text style={styles.winAmountText}>
                          ₹{winnerRecord?.amount.toLocaleString() || '0'}
                        </Text>
                        <View style={styles.wonBadge}>
                          <Trophy size={16} color={Colors.background} />
                        </View>
                      </View>
                    </View>
                  );
                })
              }
            </View>
          )}
          
          {/* Pending Section */}
          {currentGroup.members.filter(m => !m.hasReceived).length > 0 && (
            <View style={styles.memberGroup}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>⏳ Pending Draw</Text>
                {user?.id === currentGroup.createdBy && (
                  <Text style={styles.adminHint}>Tap crown to select winner</Text>
                )}
              </View>
              {currentGroup.members
                .filter(m => !m.hasReceived)
                .map((member) => (
                  <View key={member.id} style={[styles.memberRow, styles.pendingRow]}>
                    <View style={styles.memberDetails}>
                      <View style={styles.memberNameRow}>
                        {shouldShowPaymentStatus(member) && (
                          <CheckCircle size={16} color={Colors.success} style={styles.paymentStatusIcon} />
                        )}
                        <Text style={styles.memberNameText}>{member.name}</Text>
                      </View>
                      <Text style={styles.memberPhoneText}>{member.phone}</Text>
                    </View>
                    <View style={styles.memberActions}>
                      {/* Admin Manual Winner Selection */}
                      {user?.id === currentGroup.createdBy && (
                        <TouchableOpacity
                          style={styles.selectWinnerButton}
                          onPress={() => handleManualWinnerSelection(member)}
                        >
                          <Crown size={20} color={Colors.warning} />
                        </TouchableOpacity>
                      )}
                      <View style={styles.pendingBadgeNew}>
                        <Text style={styles.pendingBadgeText}>PENDING</Text>
                      </View>
                    </View>
                  </View>
                ))
              }
            </View>
          )}
        </View>
      </ScrollView>

      {/* Join Group Modal - Disabled */}
      <Modal
        visible={showJoinModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowJoinModal(false)}>
              <Text style={styles.cancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Member</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.modalContent}>
            <View style={[styles.inputGroup, { alignItems: 'center', paddingVertical: 40 }]}>
              <Users size={64} color={Colors.textSecondary} />
              <Text style={[styles.inputLabel, { fontSize: 18, marginTop: 20, textAlign: 'center' }]}>Feature Disabled</Text>
              <Text style={[styles.input, { 
                borderWidth: 0, 
                backgroundColor: 'transparent', 
                textAlign: 'center', 
                fontSize: 16,
                color: Colors.textSecondary,
                marginTop: 10
              }]}>
                Only registered platform users can be added to groups. Ask the person to sign up on the app first, then add them during group creation.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Lucky Draw Modal */}
      <Modal
        visible={showDrawModal}
        transparent
        animationType="fade"
      >
        <View style={styles.drawModalOverlay}>
          <View style={[styles.drawModal, Colors.shadow]}>
            <Gift size={48} color={Colors.success} />
            <Text style={styles.drawTitle}>Lucky Draw</Text>
            <Text style={styles.drawSubtitle}>
              Prize Amount: ₹{totalPool.toLocaleString()}
            </Text>
            
            {/* Eligible Members */}
            <View style={styles.eligibleMembersContainer}>
              <Text style={styles.eligibleMembersTitle}>
                Eligible Members ({currentGroup.members.filter(m => !m.hasReceived && m.isActive).length}):
              </Text>
              <View style={styles.eligibleMembersList}>
                {currentGroup.members
                  .filter(m => !m.hasReceived && m.isActive)
                  .map((member, index) => (
                    <Text key={member.id} style={styles.eligibleMemberName}>
                      {index + 1}. {member.name}
                    </Text>
                  ))
                }
              </View>
            </View>
            
            <View style={styles.drawActions}>
              <TouchableOpacity
                style={styles.drawCancelButton}
                onPress={() => setShowDrawModal(false)}
              >
                <Text style={styles.drawCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.drawConfirmButton}
                onPress={handleLuckyDraw}
                disabled={isLoading}
              >
                <Text style={styles.drawConfirmText}>
                  {isLoading ? 'Drawing...' : 'Start Draw'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Group Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModal, Colors.shadow]}>
            <Trash2 size={48} color={Colors.error} />
            <Text style={styles.deleteTitle}>Delete Group</Text>
            <Text style={styles.deleteSubtitle}>
              Are you sure you want to delete "{currentGroup.name}"?
            </Text>
            <Text style={styles.deleteWarning}>
              This action cannot be undone. All group data, members, and draw history will be permanently deleted.
            </Text>
            
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleDeleteGroup}
                disabled={isLoading}
              >
                <Text style={styles.deleteConfirmText}>
                  {isLoading ? 'Deleting...' : 'Delete Group'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Member Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="fade"
      >
        <View style={styles.settingsModalOverlay}>
          <View style={[styles.settingsModal, Colors.shadow]}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Group Settings</Text>
              <TouchableOpacity 
                onPress={() => setShowSettingsModal(false)}
                style={styles.settingsCloseButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingsContent}>
              <TouchableOpacity
                style={styles.settingsOption}
                onPress={() => {
                  setShowSettingsModal(false);
                  setShowLeaveModal(true);
                }}
              >
                <LogOut size={24} color={Colors.warning} />
                <View style={styles.settingsOptionContent}>
                  <Text style={styles.settingsOptionTitle}>Leave Group</Text>
                  <Text style={styles.settingsOptionSubtitle}>
                    Remove yourself from this Bhishi group
                  </Text>
                </View>
                <ArrowRight size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Leave Group Modal */}
      <Modal
        visible={showLeaveModal}
        transparent
        animationType="fade"
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModal, Colors.shadow]}>
            <LogOut size={48} color={Colors.warning} />
            <Text style={styles.deleteTitle}>Leave Group</Text>
            <Text style={styles.deleteSubtitle}>
              Are you sure you want to leave "{currentGroup.name}"?
            </Text>
            <Text style={styles.deleteWarning}>
              You will no longer be able to participate in draws or receive notifications from this group.
            </Text>
            
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setShowLeaveModal(false)}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.leaveConfirmButton}
                onPress={handleLeaveGroup}
                disabled={isLoading}
              >
                <Text style={styles.leaveConfirmText}>
                  {isLoading ? 'Leaving...' : 'Leave Group'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Winner Selection Modal */}
      <Modal
        visible={showManualWinnerModal}
        transparent
        animationType="fade"
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModal, Colors.shadow]}>
            <Crown size={48} color={Colors.warning} />
            <Text style={styles.deleteTitle}>Select Winner</Text>
            <Text style={styles.deleteSubtitle}>
              Select "{selectedMemberForWinner?.name}" as the winner?
            </Text>
            <Text style={styles.deleteWarning}>
              Prize Amount: ₹{(currentGroup.monthlyAmount * currentGroup.currentMembers).toLocaleString()}
            </Text>
            <Text style={[styles.deleteWarning, { fontSize: 14, marginTop: 8 }]}>
              This will move them from pending to winners list and create a draw record.
            </Text>
            
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => {
                  setShowManualWinnerModal(false);
                  setSelectedMemberForWinner(null);
                }}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.drawConfirmButton}
                onPress={confirmManualWinner}
                disabled={isLoading}
              >
                <Text style={styles.drawConfirmText}>
                  {isLoading ? 'Selecting...' : 'Select Winner'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
            <Text style={styles.addMembersTitle}>Select members to add to the group</Text>
            
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
            <View style={styles.modalHeaderRight}>
              <TouchableOpacity 
                onPress={refreshContacts}
                disabled={isRefreshingContacts}
                style={styles.refreshButton}
              >
                <Text style={styles.refreshIcon}>{isRefreshingContacts ? '⏳' : '🔄'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowContactPicker(false)}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search contacts..."
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
          
          {contacts.filter(contact => 
            contact.name.toLowerCase().includes(searchQuery.toLowerCase())
          ).length === 0 ? (
            <View style={styles.emptyContactsContainer}>
              <Phone size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyContactsTitle}>No Contacts Available</Text>
              <Text style={styles.emptyContactsText}>
                {Platform.OS === 'web' 
                  ? 'Contacts are not available in web preview.' 
                  : 'No contacts found who are registered on the platform'
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={contacts.filter(contact => 
                contact.name.toLowerCase().includes(searchQuery.toLowerCase())
              )}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedContacts.find(c => c.id === item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.contactItem,
                      isSelected && styles.contactItemSelected
                    ]}
                    onPress={() => handleContactSelect(item)}
                  >
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{item.name}</Text>
                      <Text style={styles.contactPhone}>
                        {item.phoneNumbers?.[0]?.number || 'No phone'}
                      </Text>
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

      {/* Platform Users Picker Modal */}
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
            <Text style={styles.modalTitle}>Select Platform Users</Text>
            <TouchableOpacity onPress={() => setShowUserPicker(false)}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
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
      
      {/* Lucky Draw Spinner (Admin) */}
      <LuckyDrawSpinner
        visible={showSpinner}
        onComplete={handleSpinnerComplete}
        winner={selectedWinner}
        prizeAmount={selectedWinner?.amount || 0}
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
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    ...Colors.shadow,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  successButton: {
    backgroundColor: Colors.success,
  },
  successButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  nextDrawCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  nextDrawContent: {
    marginLeft: 12,
  },
  nextDrawTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  nextDrawDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  // New Members Section Styles
  membersSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  membersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  membersStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statChipText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  memberGroup: {
    marginBottom: 24,
  },
  groupHeader: {
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  // Member Row Styles
  memberRow: {
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 6,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  winnerRow: {
    borderColor: Colors.success + '30',
  },
  pendingRow: {
    borderColor: Colors.border,
  },
  memberDetails: {
    flex: 1,
    paddingRight: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentStatusIcon: {
    marginRight: 8,
  },
  memberNameText: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.text,
    marginBottom: 1,
  },
  memberPhoneText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 1,
  },
  winDateText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  memberActions: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  winAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.success,
    marginBottom: 4,
  },
  wonBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wonBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.background,
    letterSpacing: 0.5,
  },
  pendingBadgeNew: {
    backgroundColor: Colors.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: '500',
    color: Colors.background,
    letterSpacing: 0.3,
  },
  // Winners History Styles
  historyCard: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },
  historyInfo: {
    flex: 1,
    paddingRight: 12,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success,
  },
  createButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  drawModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  drawModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 280,
  },
  drawTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
  },
  drawSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  eligibleMembersContainer: {
    marginTop: 16,
    maxHeight: 120,
  },
  eligibleMembersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  eligibleMembersList: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    maxHeight: 80,
  },
  eligibleMemberName: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  drawActions: {
    flexDirection: 'row',
    marginTop: 24,
  },
  drawCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  drawCancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  drawConfirmButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  drawConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  
  // Settings Button
  settingsButton: {
    padding: 8,
    borderRadius: 8,
  },
  
  // Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  deleteSubtitle: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteWarning: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  deleteCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  // Leave Group Styles
  leaveConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.warning,
    alignItems: 'center',
  },
  leaveConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  // Header Left Styles
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Settings Modal Styles
  settingsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settingsModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 0,
    maxWidth: 320,
    width: '100%',
    overflow: 'hidden',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  settingsCloseButton: {
    padding: 4,
  },
  settingsContent: {
    padding: 0,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  settingsOptionContent: {
    flex: 1,
  },
  settingsOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  settingsOptionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  // Manual Winner Selection Styles
  selectWinnerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.warning + '20',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  // Admin Controls Styles
  adminControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addMembersButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Add Members Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
    color: Colors.textSecondary,
  },
  addButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  addMembersContent: {
    flex: 1,
    padding: 16,
  },
  addMembersTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  addMembersActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  addMembersActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
    gap: 8,
  },
  addMembersActionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
  },
  selectedMembersPreview: {
    marginTop: 20,
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedMembersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  selectedMemberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedMemberName: {
    fontSize: 14,
    color: Colors.text,
  },
  // Contact/User Picker Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    color: Colors.text,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  contactItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyContactsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  refreshButton: {
    padding: 4,
  },
  refreshIcon: {
    fontSize: 18,
  },
});
