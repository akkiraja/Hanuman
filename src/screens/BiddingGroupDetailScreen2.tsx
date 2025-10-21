import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, useColorScheme, TextInput, FlatList, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Settings, Trash2, LogOut, Play, Gavel, Users, Trophy, ChevronRight, UserPlus, Phone, Search, Check, X, Shield } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useChitStore } from '../stores/chitStore';
import { useBiddingStore } from '../stores/biddingStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner-native';
import { isGroupAdmin, isGroupCreator, isGroupCoAdmin } from '../utils/adminHelpers';
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
  
  // Removed: All Add Members Modal State - now using AddMembersScreen navigation

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

  // Refresh round data AND group details when screen comes into focus
  // This ensures UI updates when auction ends naturally and when returning from AddMembersScreen
  useFocusEffect(
    useCallback(() => {
      if (currentGroup?.id) {
        console.log('🔄 Screen focused - refreshing round data and group details:', currentGroup.id);
        
        // Reload round data to get latest status
        loadCurrentRound(currentGroup.id).catch(err => {
          console.error('Focus refresh failed:', err);
        });
        
        // Reload group details for member count updates (including after adding members)
        loadGroupDetails(currentGroup.id).catch(err => {
          console.error('Focus group refresh failed:', err);
        });
      }
    }, [currentGroup?.id, loadCurrentRound, loadGroupDetails])
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
                onPress={() => navigation.navigate('AddMembers', { 
                  groupId: currentGroup.id, 
                  groupName: currentGroup.name 
                })}
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

        {/* Add Members Primary CTA - Admin Only */}
                  {userIsAdmin && (
                    <TouchableOpacity 
                      style={styles.addMembersPrimaryCTA}
                      onPress={() => navigation.navigate('AddMembers', { 
                        groupId: currentGroup.id, 
                        groupName: currentGroup.name 
                      })}
                      activeOpacity={0.7}
                    >
                      <Users size={22} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.addMembersCTAText}>
                        Add Members / सदस्य जोड़ें
                      </Text>
                    </TouchableOpacity>
                  )}

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
  // Add Members Primary CTA
  addMembersPrimaryCTA: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  addMembersCTAText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});