import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Users, Plus, Calendar, IndianRupee, Gift, UserPlus, Settings, Trash2, Trophy, LogOut, X, ArrowRight, CheckCircle, Crown, Phone, Search, Check, Shield, UserMinus } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useChitStore } from '../stores/chitStore';
import { useAuthStore } from '../stores/authStore';
import BiddingGroupDetailScreen2 from './BiddingGroupDetailScreen2';
import { Member, WinnerRecord } from '../types/chitFund';
import { format } from 'date-fns';
import { toast } from 'sonner-native';
import { supabase } from '../libs/supabase';
import { Platform, FlatList, ActivityIndicator } from 'react-native';
import LuckyDrawSpinner from '../components/LuckyDrawSpinner';

import contactsService, { Contact } from '../services/contactsService';
import { isGroupAdmin, isGroupCreator, getAdminRole } from '../utils/adminHelpers';
import { normalizePhone } from '../utils/phone';
import AdminManagementModal from '../components/group/AdminManagementModal';
import AdminBadge from '../components/group/AdminBadge';
import { ENABLE_SIMULTANEOUS_DRAW } from '../config/featureFlags';
import GrowYourGroupBanner from '../components/group/GrowYourGroupBanner';



interface Props {
  navigation: any;
}

export default function GroupDetailScreen({ navigation }: Props) {
  const { currentGroup, joinGroup, conductLuckyDraw, conductLuckyDrawWithWinner, finalizeLuckyDraw, finalizeDraw, recordLuckyDrawResult, selectManualWinner, addMembersToGroup, isLoading, fetchGroups, loadGroupDetails, deleteGroup, leaveGroup, appointCoAdmin, removeCoAdmin, removeMemberFromGroup } = useChitStore();
  const { user, profile } = useAuthStore();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showManualWinnerModal, setShowManualWinnerModal] = useState(false);
  const [selectedMemberForWinner, setSelectedMemberForWinner] = useState<Member | null>(null);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<Member | null>(null);
  
  // Spinner state
  const [showSpinner, setShowSpinner] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<any>(null);
  const [currentDraw, setCurrentDraw] = useState<any>(null); // NEW: Current draw from realtime

  const [showAdminManagementModal, setShowAdminManagementModal] = useState(false);
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
  

  // HYBRID APPROACH: Subscribe to bhishi_groups for instant trigger, then fetch draw details
  useEffect(() => {
    if (!currentGroup?.id) return;

    console.log('📡 HYBRID: Setting up bhishi_groups realtime subscription for group:', currentGroup.id);

    const groupChannel = supabase
      .channel(`group:${currentGroup.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bhishi_groups',
          filter: `id=eq.${currentGroup.id}`,
        },
        async (payload) => {
          console.log('⚡ Group UPDATE event received:', payload);
          const updatedGroup = payload.new;
          
          // Check if draw_started_at was just set (new draw triggered)
          if (updatedGroup.draw_started_at) {
            const drawStartTime = new Date(updatedGroup.draw_started_at).getTime();
            const now = Date.now();
            const elapsedSeconds = (now - drawStartTime) / 1000;
            
            console.log('🎲 Draw trigger detected!', {
              draw_started_at: updatedGroup.draw_started_at,
              elapsedSeconds: elapsedSeconds.toFixed(2)
            });
            
            // Only react if draw started recently (< 2 minutes ago)
            if (elapsedSeconds < 120) {
              console.log('⚡ Fetching full draw details from draws table...');
              
              // Fetch full draw details with retry logic (handle race condition)
              let retryCount = 0;
              const maxRetries = 5;
              let drawRecord: any = null;
              
              while (retryCount < maxRetries && !drawRecord) {
                const { data, error } = await supabase
                  .from('draws')
                  .select('*')
                  .eq('group_id', currentGroup.id)
                  .eq('revealed', false)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                
                if (data) {
                  drawRecord = data;
                  console.log('✅ Draw record fetched:', drawRecord.id);
                } else if (error) {
                  console.error('❌ Error fetching draw:', error);
                  break;
                } else {
                  retryCount++;
                  if (retryCount < maxRetries) {
                    console.log(`⏳ Draw record not found yet, retrying (${retryCount}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms
                  }
                }
              }
              
              if (drawRecord) {
              console.log('🎯 INSTANT TRIGGER! Starting member spinner with draw:', drawRecord.id);
              setCurrentDraw(drawRecord);
              // Only auto-show spinner if feature flag is enabled
                if (ENABLE_SIMULTANEOUS_DRAW) {
                setShowSpinner(true);
                } else {
                                  console.log('🚫 Auto-spinner disabled by feature flag. User should check Lucky Draws tab.');
                                }
                              } else {
                                console.warn('⚠️ Could not fetch draw record after retries');
                              }
            } else {
              console.log('⏰ Draw started too long ago, ignoring');
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Group subscription status:', status);
      });

    // ALSO subscribe to draws table for winner reveal updates (when replication becomes available)
    const drawsChannel = supabase
      .channel(`draws:${currentGroup.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'draws',
          filter: `group_id=eq.${currentGroup.id}`,
        },
        (payload) => {
          console.log('🏆 Draw UPDATE event received:', payload);
          const draw = payload.new;
          
          // Winner revealed - update current draw state
          if (draw && draw.revealed) {
            console.log('✅ Winner revealed via realtime:', draw.winner_name);
            setCurrentDraw(draw);
            // Spinner will auto-close after showing winner
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Draws UPDATE subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up subscriptions');
      supabase.removeChannel(groupChannel);
      supabase.removeChannel(drawsChannel);
    };
  }, [currentGroup?.id]);

  // NEW: Late joiner logic - check for active draws on focus
  useFocusEffect(
    React.useCallback(() => {
      const checkForActiveDraws = async () => {
        if (!currentGroup?.id) return;

        try {
          const { data: recentDraw, error } = await supabase
            .from('draws')
            .select('*')
            .eq('group_id', currentGroup.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (error || !recentDraw) return;

          // Check if draw is recent (within last 2 minutes)
          const drawAge = (Date.now() - new Date(recentDraw.created_at).getTime()) / 1000;
          if (drawAge > 120) return; // Ignore if older than 2 minutes

          const startTime = new Date(recentDraw.start_timestamp).getTime();
          const elapsed = (Date.now() - startTime) / 1000;
          const remaining = recentDraw.duration_seconds - elapsed;

          console.log('🔍 Late joiner check:', {
            drawId: recentDraw.id,
            revealed: recentDraw.revealed,
            remaining: remaining.toFixed(2),
            elapsed: elapsed.toFixed(2)
          });

          if (!recentDraw.revealed && remaining > 0) {
          // Show spinner with remaining time
          console.log('⏰ Late joiner - showing spinner with remaining time');
          setCurrentDraw(recentDraw);
          // Only auto-show spinner if feature flag is enabled
            if (ENABLE_SIMULTANEOUS_DRAW) {
            setShowSpinner(true);
          } else {
            console.log('🚫 Auto-spinner disabled by feature flag. User should check Lucky Draws tab.');
          }
          } else if (recentDraw.revealed && remaining > -5) {
                        // Just revealed - show immediately
                        console.log('🏆 Late joiner - showing immediate result');
                        setCurrentDraw(recentDraw);
                        // Only auto-show spinner if feature flag is enabled
                        if (ENABLE_SIMULTANEOUS_DRAW) {
                          setShowSpinner(true);
                        } else {
                          console.log('🚫 Auto-spinner disabled by feature flag. User should check Lucky Draws tab.');
                        }
                      }
        } catch (error) {
          console.error('❌ Late joiner check failed:', error);
        }
      };

      checkForActiveDraws();
    }, [currentGroup?.id])
  );

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
    return <BiddingGroupDetailScreen2 navigation={navigation} />;
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
      // NEW: conductLuckyDrawWithWinner now returns drawId
      const winnerInfo = await conductLuckyDrawWithWinner(currentGroup.id);
      console.log('🎲 Lucky draw started with drawId:', winnerInfo.drawId);
      
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
      // NEW: Call finalizeDraw to set revealed=true (broadcasts to all clients)
      if (selectedWinner?.drawId) {
        console.log('🎯 Finalizing draw (revealed=true):', selectedWinner.drawId);
        await finalizeDraw(selectedWinner.drawId);
      }
      
      // NEW: Record draw results (draw_history, group_members, bhishi_groups)
      // Handles both registered and unregistered winners
      if (selectedWinner?.drawId && selectedWinner?.winner) {
        console.log('📝 Recording draw result for winner:', selectedWinner.winner.name);
        await recordLuckyDrawResult({
          drawId: selectedWinner.drawId,
          groupId: selectedWinner.groupId,
          winnerMemberId: selectedWinner.winner.id, // group_members.id (always present)
          winnerUserId: selectedWinner.winner.user_id || null, // null for unregistered
          winnerName: selectedWinner.winner.name,
          amount: selectedWinner.amount,
        });
      }
      
      setShowSpinner(false);
      setSelectedWinner(null);
      setCurrentDraw(null);
      
      toast.success(`🎉 ${winner.memberName} won ₹${winner.amount.toLocaleString()}!`);
      
      // Refresh group details to get updated data
      if (currentGroup?.id) {
        await loadGroupDetails(currentGroup.id);
      }
    } catch (error) {
      setShowSpinner(false);
      setSelectedWinner(null);
      setCurrentDraw(null);
      Alert.alert('Error', 'Failed to finalize lucky draw');
      console.error('Lucky draw finalization error:', error);
    }
  };

  // NEW: Callback for requesting finalization from spinner
  const handleRequestFinalize = async (drawId: string) => {
    console.log('📝 Spinner requesting finalization for drawId:', drawId);
    try {
      await finalizeDraw(drawId);
    } catch (error) {
      console.error('❌ Failed to finalize draw:', error);
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

  const handleAppointCoAdmin = async (memberId: string) => {
  console.log('👑 GroupDetailScreen handleAppointCoAdmin called:', {
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
  console.log('🚫 GroupDetailScreen handleRemoveCoAdmin called:', {
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

  const handleRemoveMember = (member: Member) => {
    setSelectedMemberForRemoval(member);
    setShowRemoveMemberModal(true);
  };

  const confirmRemoveMember = async () => {
    if (!selectedMemberForRemoval || !currentGroup) return;
    try {
      const success = await removeMemberFromGroup(currentGroup.id, selectedMemberForRemoval.id);
      setShowRemoveMemberModal(false);
      setSelectedMemberForRemoval(null);
      if (success) {
        toast.success(`${selectedMemberForRemoval.name} removed from group`);
        await loadGroupDetails(currentGroup.id);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to remove member');
    }
  };



  // Include both active (registered) and pending (unregistered/iPhone) members in eligibility
  const canStartDraw = currentGroup.status === 'active' && 
        currentGroup.members.filter(m => !m.hasReceived && (m.isActive || m.status === 'pending')).length > 0;

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
            <Text style={styles.subtitle}>{currentGroup.description}</Text>
          </View>
          {/* Admin Controls - Only for Group Admins */}
          {isGroupAdmin(user?.id, currentGroup) && (
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

        {/* Add Members Primary CTA - Admin Only */}
        {isGroupAdmin(user?.id, currentGroup) && (
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
              Add Members (सदस्य जोड़ें)
            </Text>
          </TouchableOpacity>
        )}

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
          {isGroupAdmin(user?.id, currentGroup) && 
          currentGroup.members.filter(m => !m.hasReceived && (m.isActive || m.status === 'pending')).length > 0 && (
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
                          {isGroupAdmin(member.user_id, currentGroup) && (
                            <AdminBadge role="Admin" size="small" />
                          )}
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
              {isGroupAdmin(user?.id, currentGroup) && (
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
                        {isGroupAdmin(member.user_id, currentGroup) && (
                          <AdminBadge role="Admin" size="small" />
                        )}
                      </View>
                      <Text style={styles.memberPhoneText}>{member.phone}</Text>
                    </View>
                    <View style={styles.memberActions}>
                      {/* Admin Manual Winner Selection */}
                      {isGroupAdmin(user?.id, currentGroup) && (
                        <TouchableOpacity
                          style={styles.selectWinnerButton}
                          onPress={() => handleManualWinnerSelection(member)}
                        >
                          <Crown size={20} color={Colors.warning} />
                        </TouchableOpacity>
                      )}
                      {/* Admin Remove Member */}
                      {isGroupAdmin(user?.id, currentGroup) && member.user_id !== user?.id && !isGroupAdmin(member.user_id, currentGroup) && (
                        <TouchableOpacity
                          style={styles.removeMemberButton}
                          onPress={() => handleRemoveMember(member)}
                        >
                          <UserMinus size={18} color={Colors.error} />
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
            Eligible Members ({currentGroup.members.filter(m => !m.hasReceived && (m.isActive || m.status === 'pending')).length}):
            </Text>
              <View style={styles.eligibleMembersList}>
              {currentGroup.members
              .filter(m => !m.hasReceived && (m.isActive || m.status === 'pending'))
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

      {/* Remove Member Modal */}
      <Modal
        visible={showRemoveMemberModal}
        transparent
        animationType="fade"
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModal, Colors.shadow]}>
            <UserMinus size={48} color={Colors.error} />
            <Text style={styles.deleteTitle}>Remove Member</Text>
            <Text style={styles.deleteSubtitle}>
              Remove "{selectedMemberForRemoval?.name}" from this group?
            </Text>
            <Text style={styles.deleteWarning}>
              This member will be removed and cannot participate in draws.
            </Text>
            
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => {
                  setShowRemoveMemberModal(false);
                  setSelectedMemberForRemoval(null);
                }}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={confirmRemoveMember}
                disabled={isLoading}
              >
                <Text style={styles.deleteConfirmText}>
                  {isLoading ? 'Removing...' : 'Remove Member'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin Management Modal (Creator Only) */}
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

      {/* Lucky Draw Spinner - Shows animation and winner declaration */}
      <LuckyDrawSpinner
        visible={showSpinner}
        onComplete={handleSpinnerComplete}
        winner={{
          memberName: selectedWinner?.memberName || selectedWinner?.winner?.name || currentDraw?.winner_name || 'Unknown',
          amount: selectedWinner?.amount || currentDraw?.prize_amount || totalPool
        }}
        prizeAmount={selectedWinner?.amount || currentDraw?.prize_amount || totalPool}
        drawId={selectedWinner?.drawId || currentDraw?.id}
        startTimestamp={selectedWinner?.startTimestamp || currentDraw?.start_timestamp || currentDraw?.start_time}
        durationSeconds={selectedWinner?.durationSeconds || currentDraw?.duration_seconds || 60}
        onRequestFinalize={handleRequestFinalize}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeMemberButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.error + '20',
    marginLeft: 8,
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
  // Modal Styles (shared by Join Modal and other modals)
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
  inviteBannerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});