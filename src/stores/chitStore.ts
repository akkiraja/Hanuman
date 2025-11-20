import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../libs/supabase';
import { STORAGE_KEYS } from '../constants';
import { ChitGroup, Member, WinnerRecord, Payment } from '../types/chitFund';
import { notifyPaymentMarkedDone, notifyDrawConducted, notifyWinnerAnnounced, sendLuckyDrawNotification, notifyGroupJoined, safeNotifyLuckyDraw, safeNotifyGroupJoined, safeNotifyLuckyDrawWinnerToAll } from '../utils/notificationUtils';
import { normalizePhone } from '../utils/phone';

// Define AddMemberData interface for member addition (Issue #1)
interface AddMemberData {
  name: string;
  phone: string;
  email: string;
  userId: string;
}

interface ChitState {
  groups: ChitGroup[];
  currentGroup: ChitGroup | null;
  isLoading: boolean;
  error: string | null;
}

interface ChitActions {
  // Group management
  createGroup: (groupData: {
    name: string;
    description: string;
    monthlyAmount: number;
    totalMembers: number;
    drawDate: string;
    groupType?: 'lucky_draw' | 'bidding';
    members?: { name: string; email: string; phone: string; userId?: string }[];
    upiId?: string;
  }) => Promise<void>;
  fetchGroups: () => Promise<void>;
  joinGroup: (groupId: string, member: { name: string; email: string; phone: string }) => Promise<void>;
  setCurrentGroup: (group: ChitGroup | null) => void;
  loadGroupDetails: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  leaveGroup: (groupId: string) => Promise<boolean>;
      removeMemberFromGroup: (groupId: string, memberId: string) => Promise<boolean>;
  
  // Lucky draw
  conductLuckyDraw: (groupId: string) => Promise<WinnerRecord>;
  conductLuckyDrawWithWinner: (groupId: string) => Promise<any>;
  finalizeLuckyDraw: (winnerInfo: any) => Promise<WinnerRecord>;
  finalizeDraw: (drawId: string) => Promise<void>; // NEW: Server-authoritative draw finalization
  recordLuckyDrawResult: (params: {
        drawId: string;
        groupId: string;
        winnerMemberId: string;
        winnerUserId: string | null;
        winnerName: string;
        amount: number;
      }) => Promise<void>; // NEW: Consolidated draw result recording
      selectManualWinner: (groupId: string, memberId: string) => Promise<WinnerRecord>;
  addMembersToGroup: (groupId: string, members: AddMemberData[]) => Promise<{ addedCount: number; skippedCount: number; }>;
  getRecentWinner: (groupId: string) => Promise<any | null>;
  
  // Admin management
  appointCoAdmin: (groupId: string, userId: string) => Promise<void>;
  removeCoAdmin: (groupId: string) => Promise<void>;
  isDrawInProgress: (group: any) => boolean;
  clearDrawStartedTimestamp: (groupId: string) => Promise<void>;
  cleanupStaleDrawTimestamps: () => Promise<void>;
  
  // Payments
  recordPayment: (groupId: string, memberId: string, amount: number) => Promise<void>;
  updatePaymentStatus: (groupId: string, status: 'pending' | 'paid') => Promise<void>;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  initialize: () => Promise<void>;
}

type ChitStore = ChitState & ChitActions;

export const useChitStore = create<ChitStore>()(persist(
  (set, get) => ({
    // Initial state
    groups: [],
    currentGroup: null,
    isLoading: false,
    error: null,

    initialize: async () => {
      // Clean up any stale draw timestamps first (for app crashes/reloads)
      await get().cleanupStaleDrawTimestamps();
      
      await get().fetchGroups();
    },

    fetchGroups: async () => {
      set({ isLoading: true, error: null });
      
      try {
        // Use direct database query to avoid RLS recursion issues
        const { data: groups, error } = await supabase
          .from('bhishi_groups')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching groups:', error);
          set({ error: error.message, isLoading: false });
          return;
        }

        const formattedGroups = (groups || []).map((group: any) => {
          // Calculate next draw date based on draw_date (day of month)
          const today = new Date();
          const drawDayNum = parseInt(group.draw_date);
          let nextDraw = new Date(today.getFullYear(), today.getMonth(), drawDayNum);
          
          // If draw day has passed this month, move to next month
          if (nextDraw <= today) {
            nextDraw = new Date(today.getFullYear(), today.getMonth() + 1, drawDayNum);
          }
          
          return {
            id: group.id,
            name: group.name,
            description: group.description,
            monthlyAmount: group.monthly_amount,
            totalMembers: group.total_members,
            currentMembers: group.current_members,
            duration: group.total_rounds,
            startDate: new Date(group.created_at),
            nextDrawDate: nextDraw,
            drawDay: group.draw_date,
            groupType: group.group_type || 'lucky_draw', // Include group type with default
            status: group.status,
            createdBy: group.created_by,
            createdAt: new Date(group.created_at),
            draw_started_at: group.draw_started_at, // Include draw timestamp
            members: [], // Will be loaded separately if needed
            winners: [] // Will be loaded separately if needed
          };
        });

        set({ groups: formattedGroups, isLoading: false });
      } catch (error) {
        console.error('Error in fetchGroups:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to fetch groups',
          isLoading: false 
        });
      }
    },

    createGroup: async (groupData) => {
      console.log('🚀 === CREATING GROUP (SIMPLE VERSION) ===');
      set({ isLoading: true, error: null });
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          set({ error: 'User not authenticated', isLoading: false });
          return;
        }

        console.log('🚀 Creating group:', groupData.name);
        console.log('👤 Current user ID:', user.id);
        console.log('👤 Current user email:', user.email);
        
        // Check if user has a profile (required for foreign key constraint)
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, email, upi_id')
          .eq('id', user.id)
          .single();
          
        if (profileError || !userProfile) {
          console.error('❌ User profile not found:', profileError);
          console.log('🔧 Creating user profile...');
          
          // Create user profile if it doesn't exist
          const { data: newProfile, error: createProfileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || null, // Support OTP users
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              upi_id: groupData.upiId || null
            })
            .select()
            .single();
            
          if (createProfileError) {
            console.error('❌ Failed to create user profile:', createProfileError);
            set({ error: 'Failed to create user profile. Please try again.', isLoading: false });
            return;
          }
          
          console.log('✅ User profile created with UPI ID:', newProfile);
        } else {
          console.log('✅ User profile exists:', userProfile);
          
          // Update UPI ID if provided and different from current
          if (groupData.upiId && groupData.upiId !== userProfile.upi_id) {
            console.log('🔄 Updating user UPI ID...');
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ upi_id: groupData.upiId })
              .eq('id', user.id);
              
            if (updateError) {
              console.error('❌ Failed to update UPI ID:', updateError);
              // Continue anyway, don't fail group creation for UPI update
            } else {
              console.log('✅ UPI ID updated successfully');
            }
          }
        }

        // Create the group using direct database insert
        const { data: newGroup, error: groupError } = await supabase
          .from('bhishi_groups')
          .insert({
            name: groupData.name,
            description: groupData.description,
            monthly_amount: groupData.monthlyAmount,
            total_members: groupData.totalMembers,
            draw_date: groupData.drawDate,
            group_type: groupData.groupType || 'lucky_draw', // Default to lucky_draw for backwards compatibility
            total_rounds: groupData.totalMembers,
            created_by: user.id,
            status: 'active'
          })
          .select()
          .single();
        
        if (groupError) {
          console.error('❌ Error creating group:', groupError);
          set({ error: groupError.message, isLoading: false });
          return;
        }
        
        console.log('✅ Group created:', newGroup.id);

        // SIMPLE MEMBER INSERTION
        console.log('👥 Adding members to group:', newGroup.id);
        let totalMembersAdded = 0;
        
        try {
          // Add creator first
          console.log('👤 Adding creator as member...');
          
          // Get creator's actual name from profiles table
          const { data: creatorProfile, error: creatorProfileError } = await supabase
            .from('profiles')
            .select('name, email, phone')
            .eq('id', user.id)
            .single();
            
          const creatorName = creatorProfile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
          console.log('👤 Creator name from profile:', creatorName);
          
          const { data: creatorMember, error: creatorError } = await supabase
            .from('group_members')
            .insert({
              group_id: newGroup.id,
              user_id: user.id,
              name: creatorName,
              email: creatorProfile?.email || user.email || null, // Support OTP users
              phone: creatorProfile?.phone || user.user_metadata?.phone || '',
              contribution_status: 'pending'
            })
            .select()
            .single();
            
          if (creatorError) {
            throw new Error(`Failed to add creator: ${creatorError.message}`);
          }
          
          console.log('✅ Creator added:', creatorMember.name);
          totalMembersAdded++;
          
          // Note: Additional members will be added later via GroupDetailScreen


          
          console.log(`🎉 Total members added: ${totalMembersAdded}`);
          
          // Update group member count
          await supabase
            .from('bhishi_groups')
            .update({ current_members: totalMembersAdded })
            .eq('id', newGroup.id);
            
        } catch (error) {
          console.error('💥 Member insertion failed:', error);
          set({ 
            error: `Group created but member insertion failed: ${error.message}`,
            isLoading: false 
          });
          return;
        }

        // Refresh groups after creation
        await get().fetchGroups();
        
        // Calculate next draw date based on draw_date (day of month)
        const today = new Date();
        const drawDayNum = parseInt(newGroup.draw_date);
        let nextDraw = new Date(today.getFullYear(), today.getMonth(), drawDayNum);
        
        // If draw day has passed this month, move to next month
        if (nextDraw <= today) {
          nextDraw = new Date(today.getFullYear(), today.getMonth() + 1, drawDayNum);
        }
        
        // Set the newly created group as current
        const formattedGroup = {
          id: newGroup.id,
          name: newGroup.name,
          description: newGroup.description,
          monthlyAmount: newGroup.monthly_amount,
          totalMembers: newGroup.total_members,
          currentMembers: totalMembersAdded,
          duration: newGroup.total_rounds,
          startDate: new Date(newGroup.created_at),
          nextDrawDate: nextDraw,
          drawDay: newGroup.draw_date,
          groupType: newGroup.group_type || 'lucky_draw',
          status: newGroup.status,
          createdBy: newGroup.created_by,
          createdAt: new Date(newGroup.created_at),
          members: [], // Will be loaded by loadGroupDetails
          winners: []
        };
        
        set({ currentGroup: formattedGroup, isLoading: false });
      } catch (error) {
        console.error('Error in createGroup:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to create group',
          isLoading: false 
        });
      }
    },

    joinGroup: async (groupId, memberData) => {
      set({ isLoading: true, error: null });
      
      try {
        const { data, error } = await supabase.functions.invoke('join-group', {
          body: {
            group_id: groupId,
            name: memberData.name,
            email: memberData.email,
            phone: memberData.phone
          }
        });
        
        if (error) {
          set({ error: error.message, isLoading: false });
          return;
        }

        // Refresh groups after joining
        await get().fetchGroups();
        set({ isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to join group',
          isLoading: false 
        });
      }
    },

    getRecentWinner: async (groupId) => {
      try {
        // Check if user is authenticated before making RLS-protected calls
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser?.id) {
          console.log('⚠️ User not authenticated - skipping recent winner lookup for group:', groupId);
          return null;
        }
        
        // Get the most recent draw for this group within the last 24 hours
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        
        const { data: recentDraw, error } = await supabase
          .from('draw_history')
          .select('*')
          .eq('group_id', groupId)
          .gte('draw_date', twentyFourHoursAgo.toISOString())
          .order('draw_date', { ascending: false })
          .limit(1)
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('❌ Error fetching recent winner:', error);
          return null;
        }
        
        return recentDraw || null;
      } catch (error) {
        console.error('❌ Error in getRecentWinner:', error);
        return null;
      }
    },

    // New method for spinner-based lucky draw - SERVER AUTHORITATIVE
    conductLuckyDrawWithWinner: async (groupId) => {
      console.log('🎲 === CONDUCTING LUCKY DRAW (SERVER AUTHORITATIVE) ===');
      set({ isLoading: true, error: null });
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        console.log('🎯 Group ID:', groupId);
        console.log('👤 Admin ID:', user.id);
        
        // Get group details
        const { data: group, error: groupError } = await supabase
          .from('bhishi_groups')
          .select('*')
          .eq('id', groupId)
          .single();
          
        if (groupError || !group) {
          throw new Error('Group not found');
        }
        
        // Verify user is group admin (creator OR co-admin)
        if (group.created_by !== user.id && group.co_admin_id !== user.id) {
        throw new Error('Only group admin can conduct lucky draw');
        }

        console.log('✅ Group found:', group.name);
        
        // Get eligible members (those who haven't won yet)
        // IMPORTANT: Include both 'active' (registered) AND 'pending' (unregistered/iPhone users)
        // This ensures iPhone users waiting for iOS launch can still win lucky draws
        const { data: eligibleMembers, error: membersError } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', groupId)
          .eq('has_won', false)
          .in('status', ['active', 'pending']);
          
        if (membersError) {
          throw new Error('Failed to fetch group members');
        }
        
        if (!eligibleMembers || eligibleMembers.length === 0) {
          throw new Error('No eligible members for draw');
        }
        
        console.log(`🎲 Found ${eligibleMembers.length} eligible members`);
        
        // Select random winner
        const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
        const winner = eligibleMembers[randomIndex];
        
        console.log('🏆 Selected winner:', winner.name);
        
        // Calculate prize amount (total pool)
        const prizeAmount = group.monthly_amount * group.current_members;
        
        // CRITICAL CHANGE: INSERT draw record FIRST with revealed=false
        // This triggers INSTANT realtime INSERT event for all group members
        const startTimestamp = new Date();
        const durationSeconds = 60; // Default spinner duration
        
        console.log('📝 Inserting draw record with revealed=false...');
        const { data: drawRecord, error: drawInsertError } = await supabase
          .from('draws')
          .insert({
            group_id: groupId,
            created_by: user.id,
            status: 'pending_reveal',
            revealed: false,
            start_timestamp: startTimestamp.toISOString(),
            duration_seconds: durationSeconds,
            prize_amount: prizeAmount,
            winner_user_id: winner.user_id,
            winner_name: winner.name,
            round_number: group.current_round + 1
          })
          .select()
          .single();
          
        if (drawInsertError || !drawRecord) {
          console.error('❌ Failed to insert draw record:', drawInsertError);
          throw new Error('Failed to create draw record');
        }
        
        console.log('✅ Draw record created with ID:', drawRecord.id);
        console.log('📡 Realtime INSERT event should broadcast INSTANTLY to all clients!');
        
        // Update legacy draw_started_at for backward compatibility (optional)
        const { error: updateDrawError } = await supabase
          .from('bhishi_groups')
          .update({ 
            draw_started_at: startTimestamp.toISOString()
          })
          .eq('id', groupId);
          
        if (updateDrawError) {
          console.error('⚠️ Failed to update legacy draw_started_at:', updateDrawError);
          // Don't fail - new draws table is primary source of truth
        }
        
        // Send push notifications and SMS to all members as fallback
        try {
          const { data: adminProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();
          
          await supabase.functions.invoke('send-notifications', {
            body: {
              type: 'lucky_draw_started',
              data: {
                groupId,
                groupName: group.name,
                adminName: adminProfile?.name || 'Admin',
                drawId: drawRecord.id,
                timestamp: startTimestamp.toISOString()
              }
            }
          });
          console.log('📢 Lucky draw notifications sent (SMS/Push fallback)');
        } catch (notificationError) {
          console.error('⚠️ Failed to send notifications (not critical):', notificationError);
        }
        
        // Return draw metadata for admin spinner with drawId
        const winnerInfo = {
          drawId: drawRecord.id, // NEW: Draw ID for finalization
          memberId: winner.user_id,
          memberName: winner.name,
          amount: prizeAmount,
          groupId: groupId,
          groupName: group.name,
          winner: winner,
          startTimestamp: startTimestamp.toISOString(),
          durationSeconds: durationSeconds
        };
        
        set({ isLoading: false });
        return winnerInfo;
        
      } catch (error) {
        console.error('💥 Lucky draw selection failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to select winner',
          isLoading: false 
        });
        throw error;
      }
    },

    // NEW: Consolidated method to record lucky draw results
    // Handles both registered and unregistered winners
    recordLuckyDrawResult: async ({
      drawId,
      groupId,
      winnerMemberId,
      winnerUserId,
      winnerName,
      amount,
    }) => {
      console.log('📝 === RECORDING LUCKY DRAW RESULT ===');
      console.log('Draw ID:', drawId);
      console.log('Winner Member ID:', winnerMemberId);
      console.log('Winner User ID:', winnerUserId || 'null (unregistered)');
      
      try {
        // Get group details for round calculation
        const { data: group, error: groupError } = await supabase
          .from('bhishi_groups')
          .select('*')
          .eq('id', groupId)
          .single();
          
        if (groupError || !group) {
          throw new Error('Group not found');
        }
        
        const nextRound = group.current_round + 1;
        
        // 1️⃣ Insert into draw_history
        console.log('1️⃣ Inserting draw_history record...');
        const insertPayload = {
          group_id: groupId,
          draw_id: drawId,
          round: nextRound,
          winner_member_id: winnerMemberId, // PRIMARY: always present
          winner_id: winnerUserId, // OPTIONAL: null for unregistered
          winner_name: winnerName,
          amount: amount,
          status: 'completed'
        };
        
        // Use atomic RPC function to prevent duplicate inserts (23505 errors)
        // This is idempotent - safe to call multiple times for the same group+round
        const { data: historyData, error: historyError } = await supabase.rpc(
          'record_draw_history_if_not_exists',
          {
            p_group_id: groupId,
            p_draw_id: drawId,
            p_round: nextRound,
            p_winner_member_id: winnerMemberId,
            p_winner_id: winnerUserId,
            p_winner_name: winnerName,
            p_amount: amount,
          }
        );
          
        if (historyError) {
          console.error('❌ Failed to record draw_history via RPC:', historyError);
          console.error('📋 Error code:', historyError.code);
          console.error('📋 Error message:', historyError.message);
          throw new Error('Failed to record draw history');
        }
        
        // Check if a record was actually inserted (empty array = already exists)
        if (!historyData || historyData.length === 0) {
          console.log('ℹ️ Draw history already exists for this round (idempotent - OK)');
        } else {
          console.log('✅ Draw history recorded (new record)');
        }
        
        console.log('✅ Draw history recorded');
        
        // 2️⃣ Update draws table - SKIP this step as finalizeDraw already handles it
        console.log('2️⃣ Skipping draws table update (already done by finalizeDraw)');
        // REMOVED: Redundant update that was causing potential conflicts
        
        // 3️⃣ Mark member as has_won
        console.log('3️⃣ Updating group_members...');
        const { error: memberUpdateError } = await supabase
          .from('group_members')
          .update({ has_won: true })
          .eq('id', winnerMemberId);
          
        if (memberUpdateError) {
          console.error('❌ Failed to update member:', memberUpdateError);
          throw new Error('Failed to update winner status');
        }
        
        console.log('✅ Member marked as winner');
        
        // 4️⃣ Update group round (idempotent - only if current_round hasn't changed)
        console.log('4️⃣ Updating group round...');
        const { data: groupUpdateData, error: groupUpdateError } = await supabase
          .from('bhishi_groups')
          .update({ current_round: nextRound })
          .eq('id', groupId)
          .eq('current_round', group.current_round) // Only update if round hasn't changed (prevents double increment)
          .select();
          
        if (groupUpdateError) {
          console.error('❌ Failed to update group:', groupUpdateError);
          throw new Error('Failed to update group round');
        }
        
        // Check if round was actually updated (empty array = already updated by another client)
        if (!groupUpdateData || groupUpdateData.length === 0) {
          console.log('ℹ️ Group round already updated (race condition handled - OK)');
        } else {
          console.log('✅ Group round updated to:', nextRound);
        }
        
        // 5️⃣ Clear draw timestamp
        await get().clearDrawStartedTimestamp(groupId);
        
        // 6️⃣ Refresh groups
        await get().fetchGroups();
        
        // Update current group if it's the one that had the draw
        const updatedGroup = get().groups.find(g => g.id === groupId);
        if (updatedGroup && get().currentGroup?.id === groupId) {
          set({ currentGroup: updatedGroup });
        }
        
        console.log('✅ Lucky draw result recorded successfully!');

        // 7️⃣ Send notifications AFTER all DB commits
        // This ensures notifications never block DB operations
        await safeNotifyLuckyDraw(groupId, winnerUserId, group.name, winnerName);

                  // 8️⃣ Send SMS to ALL unregistered members about the winner
                  await safeNotifyLuckyDrawWinnerToAll(groupId, group.name, winnerName);
        
      } catch (err) {
        console.error('❌ Error recording lucky draw result:', err);
        throw err;
      }
    },

    // Method to finalize the draw after spinner completes
    finalizeLuckyDraw: async (winnerInfo) => {
      console.log('🎯 === FINALIZING LUCKY DRAW ===');
      set({ isLoading: true, error: null });
      
      try {
        const { groupId, winner, amount } = winnerInfo;
        
        // Get group details for round calculation
        const { data: group, error: groupError } = await supabase
          .from('bhishi_groups')
          .select('*')
          .eq('id', groupId)
          .single();
          
        if (groupError || !group) {
          throw new Error('Group not found');
        }
        
        const nextRound = group.current_round + 1;
        
        // Insert draw history record
        // Support both registered (has user_id) and unregistered/pending (no user_id) winners
        const { data: drawRecord, error: drawError } = await supabase
        .from('draw_history')
        .insert({
        group_id: groupId,
        round: nextRound,
        winner_member_id: winner.id, // PRIMARY: group_members.id (always present)
        winner_id: winner.user_id || null, // OPTIONAL: only for registered members
        winner_name: winner.name,
          amount: amount,
          status: 'completed'
        })
                    .select()
                    .single();
          
        if (drawError) {
          console.error('❌ Draw history error:', drawError);
          throw new Error('Failed to record draw history');
        }
        
        console.log('✅ Draw history recorded:', drawRecord.id);
        
        // Update winner's status
        const { error: updateMemberError } = await supabase
          .from('group_members')
          .update({ has_won: true })
          .eq('id', winner.id);
          
        if (updateMemberError) {
          console.error('❌ Member update error:', updateMemberError);
          throw new Error('Failed to update winner status');
        }
        
        console.log('✅ Winner status updated');
        
        // Update group round
        const { error: updateGroupError } = await supabase
          .from('bhishi_groups')
          .update({ current_round: nextRound })
          .eq('id', groupId);
          
        if (updateGroupError) {
          console.error('❌ Group update error:', updateGroupError);
          throw new Error('Failed to update group round');
        }
        
        console.log('✅ Group round updated');
        
        // Clear draw started timestamp to hide member spinners
        await get().clearDrawStartedTimestamp(groupId);

        // Send winner announcement notification
        try {
          await sendLuckyDrawNotification(groupId, winner.user_id);
          console.log('🎉 Winner announcement notification sent successfully');
        } catch (notificationError) {
          console.error('⚠️ Failed to send winner announcement notification:', notificationError);
        }
        
        // Refresh groups to get updated data
        await get().fetchGroups();
        
        // Update current group if it's the one that had the draw
        const updatedGroup = get().groups.find(g => g.id === groupId);
        if (updatedGroup && get().currentGroup?.id === groupId) {
          set({ currentGroup: updatedGroup });
        }
        
        console.log('🎉 Lucky draw finalized successfully!');
        set({ isLoading: false });
        
        return {
          id: drawRecord.id,
          memberId: winner.user_id,
          memberName: winner.name,
          amount: amount,
          drawDate: new Date(drawRecord.draw_date),
          round: nextRound
        };
        
      } catch (error) {
        console.error('💥 Lucky draw finalization failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to finalize draw',
          isLoading: false 
        });
        throw error;
      }
    },

    // Finalize draw (set revealed=true) - SERVER AUTHORITATIVE & IDEMPOTENT
    finalizeDraw: async (drawId: string) => {
      console.log('🎯 === FINALIZING DRAW (SERVER AUTHORITATIVE) ===');
      console.log('📝 Draw ID:', drawId);
      console.log('🔍 Step 1: Fetching existing draw...');
      
      try {
        // CRITICAL FIX: Fetch existing draw first to get winner info
        // This is needed because the check constraint "winner_set_when_revealed" requires
        // winner_name to be set when revealed=true (winner_user_id can be NULL for unregistered)
        const { data: existingDraw, error: fetchError } = await supabase
          .from('draws')
          .select('*')
          .eq('id', drawId)
          .single();
          
        if (fetchError) {
          console.error('❌ Failed to fetch draw:', fetchError);
          console.error('📋 Error details:', JSON.stringify(fetchError, null, 2));
          throw new Error(`Draw fetch failed: ${fetchError.message}`);
        }
        
        if (!existingDraw) {
          console.error('❌ Draw not found in database');
          throw new Error('Draw not found');
        }
        
        console.log('✅ Draw found:', {
          id: existingDraw.id,
          revealed: existingDraw.revealed,
          winner_name: existingDraw.winner_name,
          winner_user_id: existingDraw.winner_user_id || 'NULL (unregistered)'
        });
        
        // Check if already revealed (idempotent)
        if (existingDraw.revealed) {
          console.log('✅ Draw already revealed (idempotent), skipping:', existingDraw.id);
          return;
        }
        
        console.log('🔍 Step 2: Validating winner data...');
        if (!existingDraw.winner_name) {
          console.error('❌ CRITICAL: winner_name is NULL - constraint will fail!');
          throw new Error('Winner name is missing from draw record');
        }
        
        console.log('🎯 Finalizing draw for winner:', existingDraw.winner_name);
        console.log('👤 Winner User ID:', existingDraw.winner_user_id || 'NULL (unregistered)');
        console.log('🔍 Step 3: Updating draw to revealed=true...');
        
        const updatePayload = { 
          revealed: true,
          status: 'revealed' as const,
          processed_at: new Date().toISOString(),
          winner_user_id: existingDraw.winner_user_id, // Can be NULL
          winner_name: existingDraw.winner_name // Must be present
        };
        
        console.log('📤 Update payload:', JSON.stringify(updatePayload, null, 2));
        
        // Update draw record to revealed=true with winner info explicitly set
        // This satisfies the check constraint "winner_set_when_revealed"
        // NOTE: Using .select() without .single() to avoid errors when no rows match
        const { data: finalizedDraws, error: updateError } = await supabase
          .from('draws')
          .update(updatePayload)
          .eq('id', drawId)
          .eq('revealed', false) // Only update if not already revealed
          .select();
          
        if (updateError) {
          console.error('❌ Failed to finalize draw - database error:', updateError);
          console.error('📋 Error code:', updateError.code);
          console.error('📋 Error message:', updateError.message);
          console.error('📋 Error details:', updateError.details);
          console.error('📋 Error hint:', updateError.hint);
          console.error('📋 Update payload:', JSON.stringify(updatePayload, null, 2));
          throw new Error(`Failed to finalize draw: ${updateError.message}`);
        }
        
        // Check if any rows were actually updated
        if (!finalizedDraws || finalizedDraws.length === 0) {
          console.log('⚠️ No rows updated - draw may already be revealed or doesn\'t exist');
          // This is OK - idempotent behavior
          // Verify the draw exists and is revealed
          const { data: verifyDraw } = await supabase
            .from('draws')
            .select('*')
            .eq('id', drawId)
            .single();
            
          if (verifyDraw?.revealed) {
            console.log('✅ Draw is already revealed (race condition handled)');
            return; // Success - idempotent
          } else {
            console.error('❌ Draw exists but update failed - this shouldn\'t happen');
            throw new Error('Failed to update draw to revealed state');
          }
        }
        
        console.log('✅ Draw finalized successfully!');
        console.log('📡 Realtime UPDATE event broadcasting winner reveal to all clients!');
        
      } catch (error) {
        console.error('💥 finalizeDraw failed:', error);
        throw error;
      }
    },

    // Clear draw started timestamp (cleanup for member spinners)
    clearDrawStartedTimestamp: async (groupId) => {
      try {
        const { error } = await supabase
          .from('bhishi_groups')
          .update({ draw_started_at: null })
          .eq('id', groupId);
          
        if (error) {
          console.error('⚠️ Failed to clear draw timestamp:', error);
        } else {
          console.log('🧹 Draw timestamp cleared for group:', groupId);
        }
      } catch (error) {
        console.error('⚠️ Error clearing draw timestamp:', error);
      }
    },
    
    // Cleanup stale draw timestamps (for app crashes/reloads)
    cleanupStaleDrawTimestamps: async () => {
      try {
        console.log('🧹 Cleaning up stale draw timestamps...');
        
        // Clear any draw_started_at older than 60 seconds
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
        
        const { error } = await supabase
          .from('bhishi_groups')
          .update({ draw_started_at: null })
          .lt('draw_started_at', oneMinuteAgo)
          .not('draw_started_at', 'is', null);
          
        if (error) {
          console.error('⚠️ Failed to cleanup stale timestamps:', error);
        } else {
          console.log('✅ Stale draw timestamps cleaned up');
        }
      } catch (error) {
        console.error('⚠️ Error cleaning up stale timestamps:', error);
      }
    },

    // Check if a draw is currently in progress for a group
    isDrawInProgress: (group) => {
      if (!group?.draw_started_at) return false;
      
      const drawStartTime = new Date(group.draw_started_at);
      const now = new Date();
      const timeDiff = (now.getTime() - drawStartTime.getTime()) / 1000; // seconds
      
      // Show spinner if draw started within last 100 seconds (matches LuckyDrawSpinner duration)
      // Increased window to account for network delays and APK sync issues
      const isActive = timeDiff >= -2 && timeDiff <= 100; // Allow 2 seconds buffer for clock differences
      
      if (isActive) {
        console.log(`🎲 Draw in progress for ${group.name}: ${Math.round(100 - timeDiff)}s remaining (timeDiff: ${Math.round(timeDiff)}s)`);
      } else if (group.draw_started_at) {
        console.log(`📊 Draw timing for ${group.name}: timeDiff=${Math.round(timeDiff)}s (not active: ${timeDiff > 100 ? 'expired' : 'future'})`);
      }
      
      return isActive;
    },

    conductLuckyDraw: async (groupId) => {
      console.log('🎲 === CONDUCTING LUCKY DRAW ===');
      set({ isLoading: true, error: null });
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        console.log('🎯 Group ID:', groupId);
        console.log('👤 Admin ID:', user.id);
        
        // Get group details
        const { data: group, error: groupError } = await supabase
          .from('bhishi_groups')
          .select('*')
          .eq('id', groupId)
          .single();
          
        if (groupError || !group) {
          throw new Error('Group not found');
        }
        
        // Verify user is group admin (creator OR co-admin)
        if (group.created_by !== user.id && group.co_admin_id !== user.id) {
          throw new Error('Only group admin can conduct lucky draw');
        }
        
        console.log('✅ Group found:', group.name);
        console.log('📊 Current round:', group.current_round);
        console.log('🎯 Total rounds:', group.total_rounds);
        
        // Get eligible members (those who haven't won yet)
        const { data: eligibleMembers, error: membersError } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', groupId)
          .eq('has_won', false);
          
        if (membersError) {
          throw new Error('Failed to fetch group members');
        }
        
        if (!eligibleMembers || eligibleMembers.length === 0) {
          throw new Error('No eligible members for draw');
        }
        
        console.log(`🎲 Found ${eligibleMembers.length} eligible members`);
        
        // Select random winner
        const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
        const winner = eligibleMembers[randomIndex];
        
        console.log('🏆 Selected winner:', winner.name);
        
        // Calculate prize amount (total pool)
        const prizeAmount = group.monthly_amount * group.current_members;
        const nextRound = group.current_round + 1;
        
        console.log('💰 Prize amount:', prizeAmount);
        console.log('🔄 Next round:', nextRound);
        
        // Insert draw history record
        // Support both registered (has user_id) and unregistered/pending (no user_id) winners
        const { data: drawRecord, error: drawError } = await supabase
        .from('draw_history')
        .insert({
        group_id: groupId,
        round: nextRound,
        winner_member_id: winner.id, // PRIMARY: group_members.id (always present)
        winner_id: winner.user_id || null, // OPTIONAL: only for registered members
        winner_name: winner.name,
          amount: prizeAmount,
          status: 'completed'
        })
                    .select()
                    .single();
          
        if (drawError) {
          console.error('❌ Draw history error:', drawError);
          throw new Error('Failed to record draw history');
        }
        
        console.log('✅ Draw history recorded:', drawRecord.id);
        
        // Update winner's status
        const { error: updateMemberError } = await supabase
          .from('group_members')
          .update({ has_won: true })
          .eq('id', winner.id);
          
        if (updateMemberError) {
          console.error('❌ Member update error:', updateMemberError);
          throw new Error('Failed to update winner status');
        }
        
        console.log('✅ Winner status updated');
        
        // Update group round
        const { error: updateGroupError } = await supabase
          .from('bhishi_groups')
          .update({ current_round: nextRound })
          .eq('id', groupId);
          
        if (updateGroupError) {
          console.error('❌ Group update error:', updateGroupError);
          throw new Error('Failed to update group round');
        }
        
        console.log('✅ Group round updated');
        
        const winnerRecord: WinnerRecord = {
          id: drawRecord.id,
          memberId: winner.user_id,
          memberName: winner.name,
          amount: prizeAmount,
          drawDate: new Date(drawRecord.draw_date),
          round: nextRound
        };

        // Send draw completed notification first (admin started draw)
        try {
          await notifyDrawConducted(groupId, group.name);
          console.log('🎲 Draw completed notification sent');
        } catch (notificationError) {
          console.error('⚠️ Failed to send draw completed notification:', notificationError);
        }

        // Send lucky draw notification (winner announcement)
        try {
          await sendLuckyDrawNotification(groupId, winner.user_id);
          console.log('🎉 Lucky draw notification sent successfully');
        } catch (notificationError) {
          console.error('⚠️ Failed to send lucky draw notification:', notificationError);
          // Don't fail the draw if notifications fail
        }
        
        // Refresh groups to get updated data
        await get().fetchGroups();
        
        // Update current group if it's the one that had the draw
        const updatedGroup = get().groups.find(g => g.id === groupId);
        if (updatedGroup && get().currentGroup?.id === groupId) {
          set({ currentGroup: updatedGroup });
        }
        
        console.log('🎉 Lucky draw completed successfully!');
        set({ isLoading: false });
        return winnerRecord;
        
      } catch (error) {
        console.error('💥 Lucky draw failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to conduct draw',
          isLoading: false 
        });
        throw error;
      }
    },

    // Manual winner selection for admins
    selectManualWinner: async (groupId, memberId) => {
      console.log('👑 === MANUAL WINNER SELECTION ===');
      set({ isLoading: true, error: null });
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        console.log('🎯 Group ID:', groupId);
        console.log('👤 Admin ID:', user.id);
        console.log('🏆 Selected Member ID:', memberId);
        
        // Get group details
        const { data: group, error: groupError } = await supabase
          .from('bhishi_groups')
          .select('*')
          .eq('id', groupId)
          .single();
          
        if (groupError || !group) {
          throw new Error('Group not found');
        }
        
        // Verify user is group admin (creator OR co-admin)
        if (group.created_by !== user.id && group.co_admin_id !== user.id) {
          throw new Error('Only group admin can select winners manually');
        }
        
        console.log('✅ Group found:', group.name);
        
        // Get the selected member
        const { data: selectedMember, error: memberError } = await supabase
          .from('group_members')
          .select('*')
          .eq('id', memberId)
          .eq('group_id', groupId)
          .single();
          
        if (memberError || !selectedMember) {
          throw new Error('Member not found');
        }
        
        // Check if member has already won
        if (selectedMember.has_won) {
          throw new Error('This member has already won');
        }
        
        console.log('🏆 Selected member:', selectedMember.name);
        
        // Calculate prize amount (total pool)
        const prizeAmount = group.monthly_amount * group.current_members;
        const nextRound = group.current_round + 1;
        
        console.log('💰 Prize amount:', prizeAmount);
        console.log('🔄 Next round:', nextRound);
        
        // Insert draw history record (manual selection)
        // Support both registered (has user_id) and unregistered/pending (no user_id) winners
        const { data: drawRecord, error: drawError } = await supabase
        .from('draw_history')
        .insert({
        group_id: groupId,
        round: nextRound,
        winner_member_id: selectedMember.id, // PRIMARY: group_members.id (always present)
        winner_id: selectedMember.user_id || null, // OPTIONAL: only for registered members
        winner_name: selectedMember.name,
          amount: prizeAmount,
          status: 'completed'
        })
                    .select()
                    .single();
          
        if (drawError) {
          console.error('❌ Draw history error:', drawError);
          throw new Error('Failed to record draw history');
        }
        
        console.log('✅ Draw history recorded (manual):', drawRecord.id);
        
        // Update winner's status
        const { error: updateMemberError } = await supabase
          .from('group_members')
          .update({ has_won: true })
          .eq('id', selectedMember.id);
          
        if (updateMemberError) {
          console.error('❌ Member update error:', updateMemberError);
          throw new Error('Failed to update winner status');
        }
        
        console.log('✅ Winner status updated (manual)');
        
        // Update group round
        const { error: updateGroupError } = await supabase
          .from('bhishi_groups')
          .update({ current_round: nextRound })
          .eq('id', groupId);
          
        if (updateGroupError) {
          console.error('❌ Group update error:', updateGroupError);
          throw new Error('Failed to update group round');
        }
        
        console.log('✅ Group round updated (manual)');
        
        // Clear draw started timestamp to hide member spinners
        await get().clearDrawStartedTimestamp(groupId);
        
        const winnerRecord: WinnerRecord = {
          id: drawRecord.id,
          memberId: selectedMember.user_id,
          memberName: selectedMember.name,
          amount: prizeAmount,
          drawDate: new Date(drawRecord.draw_date),
          round: nextRound
        };

        // Send draw started notification (manual selection - immediate)
        try {
          await notifyDrawConducted(groupId, group.name);
          console.log('🎲 Manual draw started notification sent');
        } catch (notificationError) {
          console.error('⚠️ Failed to send draw started notification:', notificationError);
        }

        // Send winner announcement notification (manual selection - immediate)
        try {
          await sendLuckyDrawNotification(groupId, selectedMember.user_id);
          console.log('🎉 Manual winner announcement notification sent');
        } catch (notificationError) {
          console.error('⚠️ Failed to send winner announcement notification:', notificationError);
          // Don't fail the selection if notifications fail
        }
        
        // Refresh groups to get updated data
        await get().fetchGroups();
        
        // Update current group if it's the one that had the manual selection
        const updatedGroup = get().groups.find(g => g.id === groupId);
        if (updatedGroup && get().currentGroup?.id === groupId) {
          set({ currentGroup: updatedGroup });
        }
        
        console.log('👑 Manual winner selection completed successfully!');
        set({ isLoading: false });
        return winnerRecord;
        
      } catch (error) {
        console.error('💥 Manual winner selection failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to select winner',
          isLoading: false 
        });
        throw error;
      }
    },

    // Add members to existing group (Admin only)
    addMembersToGroup: async (groupId, members) => {
      console.log('👥 === ADDING MEMBERS TO EXISTING GROUP (DIRECT INSERT) ===');
      
      // Input validation
      if (!groupId || !members?.length) {
        throw new Error('Invalid input: groupId and members array are required');
      }
      
      console.log('Adding members:', members.length);
      set({ isLoading: true, error: null });
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        console.log('👤 Admin ID:', user.id);
        console.log('🎯 Group ID:', groupId);
        console.log('👥 Members to add:', members.length);
        
        // Check if user is admin (creator) of the group
        const { data: group, error: groupError } = await supabase
          .from('bhishi_groups')
          .select('created_by, name')
          .eq('id', groupId)
          .single();
          
        if (groupError || !group) {
          console.error('❌ Group fetch error:', groupError);
          throw new Error('Group not found');
        }
        
        if (group.created_by !== user.id) {
          throw new Error('Only the group creator can add members');
        }
        
        // Get admin name separately for better compatibility
        let adminName = 'Admin';
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', group.created_by)
            .single();
          
          if (profile?.full_name) {
            adminName = profile.full_name;
          }
        } catch (profileError) {
          console.warn('⚠️ Could not fetch admin name, using default:', profileError);
        }
        
        // Get existing members to avoid duplicates
        const { data: existingMembers } = await supabase
          .from('group_members')
          .select('user_id, phone')
          .eq('group_id', groupId);
        
        const existingUserIds = new Set(existingMembers?.map(m => m.user_id).filter(Boolean));
        const existingPhones = new Set(existingMembers?.map(m => normalizePhone(m.phone || '')).filter(Boolean));
        
        let addedCount = 0;
        let skippedCount = 0;
        const newlyAddedMembers: any[] = [];
        
        // Process each member
        for (const member of members) {
          try {
            const normalizedPhone = member.phone ? normalizePhone(member.phone) : null;
            
            // Skip if already exists
            if (member.userId && existingUserIds.has(member.userId)) {
              console.log(`⏩ Skipping existing user: ${member.name}`);
              skippedCount++;
              continue;
            }
            
            if (normalizedPhone && existingPhones.has(normalizedPhone)) {
              console.log(`⏩ Skipping existing phone: ${member.name}`);
              skippedCount++;
              continue;
            }
            
            // Prepare member data for insert
            const memberData: any = {
              group_id: groupId,
              name: member.name,
              phone: normalizedPhone,
              email: member.email || null,
              user_id: member.userId || null,
              status: member.userId ? 'active' : 'pending',
              has_won: false,
              contribution_status: 'pending'
            };
            
            // For unregistered contacts, set invited_phone
            if (!member.userId && normalizedPhone) {
              memberData.invited_phone = normalizedPhone;
            }
            
            // Insert member
            const { data: insertedMember, error: insertError } = await supabase
              .from('group_members')
              .insert(memberData)
              .select()
              .single();
            
            if (insertError) {
              console.error(`❌ Failed to insert ${member.name}:`, insertError);
              skippedCount++;
              continue;
            }
            
            console.log(`✅ Added member: ${member.name}`);
            addedCount++;
            newlyAddedMembers.push(insertedMember);
            
          } catch (memberError) {
            console.error(`⚠️ Error adding ${member.name}:`, memberError);
            skippedCount++;
          }
        }
        
        // Update group's current_members count
        const { data: updatedMembersCount } = await supabase
          .from('group_members')
          .select('id', { count: 'exact' })
          .eq('group_id', groupId);
        
        if (updatedMembersCount) {
          await supabase
            .from('bhishi_groups')
            .update({ current_members: updatedMembersCount.length })
            .eq('id', groupId);
        }
        
        // Send notifications to newly added members
        if (newlyAddedMembers.length > 0) {
          console.log(`📤 Sending notifications to ${newlyAddedMembers.length} members...`);
          for (const member of newlyAddedMembers) {
            try {
              await safeNotifyGroupJoined(
                groupId,
                member.user_id || null,
                group.name,
                member.name,
                adminName
              );
              console.log(`✅ Notification sent to ${member.name}`);
            } catch (notificationError) {
              console.error(`⚠️ Failed to send notification to ${member.name}:`, notificationError);
            }
          }
        }
        
        // Send SMS to unregistered members via Edge Function
        const unregisteredMembers = newlyAddedMembers.filter(m => !m.user_id);
        if (unregisteredMembers.length > 0) {
        try {
        console.log(`📞 [SMS DEBUG] Triggering SMS for ${unregisteredMembers.length} unregistered members`);
        console.log(`📞 [SMS DEBUG] Group ID: ${groupId}`);
        console.log(`📞 [SMS DEBUG] Group Name: ${group.name}`);
        console.log(`📞 [SMS DEBUG] Admin Name: ${adminName}`);
        console.log(`📞 [SMS DEBUG] Event: group_joined`);

        const { data: smsResponse, error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
        type: 'group_sms',
        data: {
            groupId: groupId,
              event: 'group_joined',
              groupName: group.name || 'Unknown Group',
                adminName: adminName
            }
          }
          });

                      if (smsError) {
                        console.error('❌ [SMS DEBUG] Edge function returned error:', smsError);
                        console.error('❌ [SMS DEBUG] Error details:', JSON.stringify(smsError, null, 2));
                      } else {
                        console.log('✅ [SMS DEBUG] SMS function response:', JSON.stringify(smsResponse, null, 2));
                      }
                    } catch (error) {
                      console.error('❌ [SMS DEBUG] Exception caught:', error);
                      console.error('❌ [SMS DEBUG] Error type:', typeof error);
                      console.error('❌ [SMS DEBUG] Error message:', error instanceof Error ? error.message : 'Unknown error');
                      // Don't throw - SMS is optional, member addition already succeeded
                    }
                  } else {
                    console.log('⏩ [SMS DEBUG] No unregistered members to send SMS to');
                  }
        
        // Send WhatsApp messages to unregistered members
        if (unregisteredMembers.length > 0) {
          console.log(`📲 Sending WhatsApp messages to ${unregisteredMembers.length} unregistered members...`);
          
          for (const member of unregisteredMembers) {
            try {
              if (!member.phone) {
                console.log(`⏩ Skipping WhatsApp for ${member.name} - no phone number`);
                continue;
              }
              
              // Use approved Twilio template: group_invite (HXe85d7319718439b111e123e7cf48889c)
              // Template: "Notification: {{1}} has added you as a member in the Bhishi group {{2}}\nOpen the Bhishi app to view your group"
              // {{1}} = admin name, {{2}} = group name
              
              console.log(`📱 Sending WhatsApp template to ${member.name} (${member.phone})...`);
              
              await supabase.functions.invoke('send-whatsapp', {
                body: {
                  phone: member.phone,
                  type: 'template',
                  contentSid: 'HXe85d7319718439b111e123e7cf48889c',
                  contentVariables: {
                    '1': adminName,
                    '2': group.name
                  }
                }
              });
              
              console.log(`✅ WhatsApp sent successfully to ${member.name}`);
            } catch (whatsappError) {
              console.error(`⚠️ Failed to send WhatsApp to ${member.name}:`, whatsappError);
              // Don't throw - WhatsApp is optional, member addition already succeeded
            }
          }
          
          console.log(`✅ WhatsApp automation completed for ${unregisteredMembers.length} members`);
        }
        
        // Refresh group details from server
        await get().loadGroupDetails(groupId);
        
        set({ 
          isLoading: false,
          error: null
        });
        
        console.log(`✅ Successfully added ${addedCount} members, skipped ${skippedCount}`);
        return {
          addedCount,
          skippedCount
        };
        
      } catch (error) {
        console.error('💥 Top-level error in addMembersToGroup:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to add members',
          isLoading: false 
        });
        throw error;
      }
    },

    // Appoint a co-admin for the group (Creator only)
    appointCoAdmin: async (groupId, userId) => {
      console.log('👑 Appointing co-admin:', { groupId, userId });
      set({ isLoading: true, error: null });
      
      try {
        const { error } = await supabase
          .from('bhishi_groups')
          .update({ co_admin_id: userId })
          .eq('id', groupId);
        
        if (error) {
          console.error('❌ Failed to appoint co-admin:', error);
          throw error;
        }
        
        console.log('✅ Co-admin appointed successfully');
        
        // Reload group details to reflect changes
        await get().loadGroupDetails(groupId);
        set({ isLoading: false });
      } catch (error) {
        console.error('💥 Error appointing co-admin:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to appoint co-admin',
          isLoading: false 
        });
        throw error;
      }
    },

    // Remove co-admin from the group (Creator only)
    removeCoAdmin: async (groupId) => {
      console.log('👑 Removing co-admin from group:', groupId);
      set({ isLoading: true, error: null });
      
      try {
        const { error } = await supabase
          .from('bhishi_groups')
          .update({ co_admin_id: null })
          .eq('id', groupId);
        
        if (error) {
          console.error('❌ Failed to remove co-admin:', error);
          throw error;
        }
        
        console.log('✅ Co-admin removed successfully');
        
        // Reload group details to reflect changes
        await get().loadGroupDetails(groupId);
        set({ isLoading: false });
      } catch (error) {
        console.error('💥 Error removing co-admin:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to remove co-admin',
          isLoading: false 
        });
        throw error;
      }
    },

    recordPayment: async (groupId, memberId, amount) => {
      set({ isLoading: true, error: null });
      
      try {
        const { data, error } = await supabase.functions.invoke('make-payment', {
          body: {
            group_id: groupId,
            member_id: memberId,
            amount
          }
        });
        
        if (error) {
          set({ error: error.message, isLoading: false });
          return;
        }

        // Refresh groups after payment
        await get().fetchGroups();
        set({ isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to record payment',
          isLoading: false 
        });
      }
    },

    updatePaymentStatus: async (groupId: string, status: 'pending' | 'paid') => {
      console.log('💳 === UPDATING PAYMENT STATUS ===');
      set({ isLoading: true, error: null });
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          set({ error: 'User not authenticated', isLoading: false });
          return;
        }

        console.log('💳 Updating payment status for group:', groupId);
        console.log('👤 User ID:', user.id);
        console.log('📊 New status:', status);
        
        // Update the member's payment status
        const { error: updateError } = await supabase
          .from('group_members')
          .update({ 
            contribution_status: status,
            last_payment_date: status === 'paid' ? new Date().toISOString() : null
          })
          .eq('group_id', groupId)
          .eq('user_id', user.id);
          
        if (updateError) {
          console.error('❌ Error updating payment status:', updateError);
          set({ error: 'Failed to update payment status', isLoading: false });
          return;
        }
        
        console.log('✅ Payment status updated successfully');
        
        // Send notification if payment was marked as paid
        if (status === 'paid') {
          try {
            // Get user name and group name for notification
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', user.id)
              .single();
              
            const { data: group } = await supabase
              .from('bhishi_groups')
              .select('name, monthly_amount')
              .eq('id', groupId)
              .single();
              
            if (profile && group) {
              await notifyPaymentMarkedDone(
                groupId,
                profile.name || 'Someone',
                group.name,
                group.monthly_amount
              );
              console.log('📢 Payment marked done notification sent');
            }
          } catch (notificationError) {
            console.error('⚠️ Failed to send payment notification:', notificationError);
            // Don't fail the payment update if notification fails
          }
        }
        
        // Refresh groups to get updated data
        await get().fetchGroups();
        
        // If current group is the one being updated, reload its details
        const currentGroup = get().currentGroup;
        if (currentGroup?.id === groupId) {
          await get().loadGroupDetails(groupId);
        }
        
        set({ isLoading: false });
        
      } catch (error) {
        console.error('💥 Error in updatePaymentStatus:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update payment status',
          isLoading: false 
        });
      }
    },

    loadGroupDetails: async (groupId) => {
      set({ isLoading: true, error: null });
      
      try {
        console.log(`🔍 Loading details for group ${groupId}...`);
        
        // Get current user for debugging
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        console.log('👤 Current user for member lookup:', { id: currentUser?.id, email: currentUser?.email });
        
        // Check if user is authenticated before making RLS-protected calls
        if (!currentUser?.id) {
          console.log('⚠️ User not authenticated - skipping RLS-protected data loading');
          set({ error: 'User not authenticated', isLoading: false });
          return;
        }
        
        // Add small delay to ensure auth context is fully established
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Load group basic info
        const { data: groupData, error: groupError } = await supabase
          .from('bhishi_groups')
          .select('*')
          .eq('id', groupId)
          .single();
        
        if (groupError) {
          console.error('❌ Error loading group:', groupError);
          set({ error: groupError.message, isLoading: false });
          return;
        }
        
        // Load group members
        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', groupId)
          .order('joined_at', { ascending: true });
        
        if (membersError) {
          console.error('❌ Error loading members:', membersError);
        }
        
        // Load winners/draw history (with retry for RLS timing issues)
        let winnersData: any[] = [];
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            const { data, error: winnersError } = await supabase
              .from('draw_history')
              .select('*')
              .eq('group_id', groupId)
              .order('draw_date', { ascending: false });
            
            if (winnersError) {
              if ((winnersError.code === '42501' || winnersError.message?.includes('406')) && retryCount < maxRetries) {
                console.log(`⚠️ RLS policy blocked draw_history access - retrying in 200ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 200));
                continue;
              } else {
                console.log('⚠️ RLS policy blocked draw_history access - continuing without winners data');
                winnersData = [];
                break;
              }
            } else {
              winnersData = data || [];
              break;
            }
          } catch (error) {
            console.error('❌ Error loading draw history:', error);
            winnersData = [];
            break;
          }
        }
        
        // Format members data with payment status
        const formattedMembers = (membersData || []).map((member: any) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          user_id: member.user_id, // CRITICAL: Include user_id for member lookup
          status: member.status || 'active', // Add status field (active/pending)
          hasReceived: member.has_won || false,
          isActive: true, // Assume all members are active for now
          joinedAt: new Date(member.joined_at),
          contributionStatus: member.contribution_status || 'pending',
          lastPaymentDate: member.last_payment_date ? new Date(member.last_payment_date) : null,
          hasWon: member.has_won || false, // Include hasWon for consistency
          isCreator: member.user_id === groupData.created_by // Mark creator/admin
        }));
        
        // Debug payment status visibility
        console.log('💳 Payment Status Debug:');
        formattedMembers.forEach(member => {
          console.log(`👤 ${member.name}: ${member.contributionStatus} ${member.lastPaymentDate ? '(paid on ' + member.lastPaymentDate.toLocaleDateString() + ')' : ''}`);
        });
        
        // Debug member user_id mapping
        console.log('🔍 Members with user_id mapping:');
        formattedMembers.forEach(member => {
          console.log(`👤 ${member.name}: user_id=${member.user_id}, email=${member.email}, isCreator=${member.isCreator}`);
        });
        
        // Format winners data
        const formattedWinners = (winnersData || []).map((winner: any) => ({
          id: winner.id,
          memberId: winner.winner_id,
          memberName: winner.winner_name,
          amount: winner.amount,
          drawDate: new Date(winner.draw_date),
          round: winner.round
        }));
        
        // Calculate next draw date based on draw_date (day of month)
        const today = new Date();
        const drawDayNum = parseInt(groupData.draw_date);
        let nextDraw = new Date(today.getFullYear(), today.getMonth(), drawDayNum);
        
        // If draw day has passed this month, move to next month
        if (nextDraw <= today) {
          nextDraw = new Date(today.getFullYear(), today.getMonth() + 1, drawDayNum);
        }
        
        // Create complete group object
        const completeGroup = {
          id: groupData.id,
          name: groupData.name,
          description: groupData.description,
          monthlyAmount: groupData.monthly_amount,
          totalMembers: groupData.total_members,
          currentMembers: groupData.current_members,
          duration: groupData.total_rounds,
          startDate: new Date(groupData.created_at),
          nextDrawDate: nextDraw,
          drawDay: groupData.draw_date,
          groupType: groupData.group_type || 'lucky_draw',
          status: groupData.status,
          createdBy: groupData.created_by,
          co_admin_id: groupData.co_admin_id, // CRITICAL: Include co_admin_id for admin management
          createdAt: new Date(groupData.created_at),
          members: formattedMembers,
          winners: formattedWinners
        };
        
        console.log(`✅ Loaded group with ${formattedMembers.length} members and ${formattedWinners.length} winners`);
        console.log('👑 Admin Info:', {
          creator: groupData.created_by,
          coAdmin: groupData.co_admin_id || 'none'
        });
        console.log('📊 Formatted members details:');
        formattedMembers.forEach((member, index) => {
          console.log(`  ${index + 1}. ${member.name} (${member.email}) - ${member.contributionStatus}`);
        });
        set({ currentGroup: completeGroup, isLoading: false });
        
      } catch (error) {
        console.error('💥 Error in loadGroupDetails:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load group details',
          isLoading: false 
        });
      }
    },

    setCurrentGroup: (group) => set({ currentGroup: group }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    deleteGroup: async (groupId: string) => {
      console.log('🗑️ === DELETING GROUP ===');
      set({ isLoading: true, error: null });
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          set({ error: 'User not authenticated', isLoading: false });
          return false;
        }

        console.log('🗑️ Deleting group:', groupId);
        
        // Verify user is the group creator
        const { data: group, error: groupError } = await supabase
          .from('bhishi_groups')
          .select('created_by, name, co_admin_id')
          .eq('id', groupId)
          .single();
          
        if (groupError || !group) {
          set({ error: 'Group not found', isLoading: false });
          return false;
        }
        
        if (group.created_by !== user.id && group.co_admin_id !== user.id) {
          set({ error: 'Only group admin can delete the group', isLoading: false });
          return false;
        }
        
        console.log('✅ User verified as group admin');
        
        // Delete in correct order (child tables first)
        console.log('🗑️ Step 1: Deleting draw history...');
        const { error: drawError } = await supabase
          .from('draw_history')
          .delete()
          .eq('group_id', groupId);
          
        if (drawError) {
          console.error('❌ Error deleting draw history:', drawError);
          // Continue anyway, might not have draw history
        } else {
          console.log('✅ Draw history deleted');
        }
        
        console.log('🗑️ Step 2: Deleting group members...');
        const { error: membersError } = await supabase
          .from('group_members')
          .delete()
          .eq('group_id', groupId);
          
        if (membersError) {
          console.error('❌ Error deleting group members:', membersError);
          set({ error: 'Failed to delete group members', isLoading: false });
          return false;
        }
        
        console.log('✅ Group members deleted');
        
        console.log('🗑️ Step 3: Deleting group...');
        const { error: groupDeleteError } = await supabase
          .from('bhishi_groups')
          .delete()
          .eq('id', groupId);
          
        if (groupDeleteError) {
          console.error('❌ Error deleting group:', groupDeleteError);
          set({ error: 'Failed to delete group', isLoading: false });
          return false;
        }
        
        console.log('✅ Group deleted successfully');
        
        // Clear current group if it was the deleted one
        const currentGroup = get().currentGroup;
        if (currentGroup?.id === groupId) {
          set({ currentGroup: null });
        }
        
        // Refresh groups list
        await get().fetchGroups();
        
        set({ isLoading: false });
        return true;
        
      } catch (error) {
        console.error('Error in deleteGroup:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to delete group',
          isLoading: false 
        });
        return false;
      }
    },

    leaveGroup: async (groupId: string) => {
      console.log('🚪 === LEAVING GROUP ===');
      set({ isLoading: true, error: null });
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          set({ error: 'User not authenticated', isLoading: false });
          return false;
        }

        console.log('🚪 Leaving group:', groupId);
        console.log('👤 User ID:', user.id);
        
        // Get group details to verify user is not admin and hasn't won
        const { data: group, error: groupError } = await supabase
          .from('bhishi_groups')
          .select('created_by, co_admin_id, name')
          .eq('id', groupId)
          .single();
          
        if (groupError || !group) {
          set({ error: 'Group not found', isLoading: false });
          return false;
        }
        
        // Prevent creator from leaving (they should delete instead)
        if (group.created_by === user.id) {
          set({ error: 'Group creator cannot leave. Please delete the group instead.', isLoading: false });
          return false;
        }
        
        // If leaving user is co-admin, clear co_admin_id field
        const isCoAdmin = group.co_admin_id === user.id;
        if (isCoAdmin) {
          console.log('🔑 User is co-admin, clearing co_admin_id field');
          const { error: clearError } = await supabase
            .from('bhishi_groups')
            .update({ co_admin_id: null })
            .eq('id', groupId);
            
          if (clearError) {
            console.error('⚠️ Failed to clear co_admin_id:', clearError);
            // Continue with leave process even if this fails
          } else {
            console.log('✅ Co-admin status cleared');
          }
        }
        
        console.log('✅ User verified as non-admin member');
        
        // Check if user has won (winners cannot leave)
        const { data: memberRecord, error: memberError } = await supabase
          .from('group_members')
          .select('id, name, has_won')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .single();
          
        if (memberError || !memberRecord) {
          set({ error: 'You are not a member of this group', isLoading: false });
          return false;
        }
        
        if (memberRecord.has_won) {
          set({ error: 'Winners cannot leave the group', isLoading: false });
          return false;
        }
        
        console.log('✅ Member found and eligible to leave:', memberRecord.name);
        
        // Remove user from group_members table
        const { error: deleteError } = await supabase
          .from('group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', user.id);
          
        if (deleteError) {
          console.error('❌ Error removing member:', deleteError);
          set({ error: 'Failed to leave group', isLoading: false });
          return false;
        }
        
        console.log('✅ Member removed from group_members table');
        
        // Update group current_members count
        const { data: updatedGroup, error: updateError } = await supabase
          .from('bhishi_groups')
          .select('current_members')
          .eq('id', groupId)
          .single();
          
        if (!updateError && updatedGroup) {
          const newMemberCount = Math.max(0, updatedGroup.current_members - 1);
          
          await supabase
            .from('bhishi_groups')
            .update({ current_members: newMemberCount })
            .eq('id', groupId);
            
          console.log(`✅ Group member count updated: ${updatedGroup.current_members} → ${newMemberCount}`);
        }
        
        // Clear current group if it was the one user left
        const currentGroup = get().currentGroup;
        if (currentGroup?.id === groupId) {
          set({ currentGroup: null });
        }
        
        // Refresh groups list to remove the group from user's list
        await get().fetchGroups();
        
        console.log('🎉 Successfully left the group!');
        set({ isLoading: false });
        return true;
        
      } catch (error) {
        console.error('💥 Error in leaveGroup:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to leave group',
          isLoading: false 
        });
        return false;
      }
    },

    removeMemberFromGroup: async (groupId: string, memberId: string) => {
      console.log('🗑️ === REMOVING MEMBER FROM GROUP ===');
      console.log('📋 Group ID:', groupId);
      console.log('👤 Member ID:', memberId);
      
      set({ isLoading: true, error: null });
      
      try {
        // 1. Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('❌ User not authenticated');
          set({ error: 'Not authenticated', isLoading: false });
          return false;
        }
        
        // 2. Verify user is admin of the group
        const { data: groupData, error: groupError } = await supabase
          .from('bhishi_groups')
          .select('created_by, co_admin_id')
          .eq('id', groupId)
          .single();
        
        if (groupError || !groupData) {
          console.error('❌ Group not found:', groupError);
          set({ error: 'Group not found', isLoading: false });
          return false;
        }
        
        const isCreator = groupData.created_by === user.id;
        const isCoAdmin = groupData.co_admin_id === user.id;
        
        if (!isCreator && !isCoAdmin) {
          console.error('❌ User is not an admin');
          set({ error: 'Only group admins can remove members', isLoading: false });
          return false;
        }
        
        console.log('✅ User is authorized (Creator:', isCreator, ', Co-Admin:', isCoAdmin, ')');
        
        // 3. Get member details
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select('name, has_won, user_id')
          .eq('id', memberId)
          .eq('group_id', groupId)
          .single();
        
        if (memberError || !memberData) {
          console.error('❌ Member not found:', memberError);
          set({ error: 'Member not found in this group', isLoading: false });
          return false;
        }
        
        // 4. Check if member has won (cannot remove winners)
        if (memberData.has_won) {
          console.error('❌ Cannot remove winner');
          set({ error: 'Cannot remove members who have already won', isLoading: false });
          return false;
        }
        
        // 5. Prevent admin from removing themselves
        if (memberData.user_id === user.id) {
          console.error('❌ Admin trying to remove themselves');
          set({ error: 'Use "Leave Group" to remove yourself from the group', isLoading: false });
          return false;
        }
        
        console.log('✅ Member eligible for removal:', memberData.name);
        
        // 6. Remove member from group_members table
        const { error: deleteError } = await supabase
          .from('group_members')
          .delete()
          .eq('id', memberId)
          .eq('group_id', groupId);
        
        if (deleteError) {
          console.error('❌ Error deleting member:', deleteError);
          set({ error: 'Failed to remove member from group', isLoading: false });
          return false;
        }
        
        console.log('✅ Member removed from group_members table');
        
        // 7. Update group current_members count
        const { data: updatedGroup, error: countError } = await supabase
          .from('bhishi_groups')
          .select('current_members')
          .eq('id', groupId)
          .single();
        
        if (!countError && updatedGroup) {
          const newMemberCount = Math.max(0, updatedGroup.current_members - 1);
          
          await supabase
            .from('bhishi_groups')
            .update({ current_members: newMemberCount })
            .eq('id', groupId);
          
          console.log(`✅ Member count updated: ${updatedGroup.current_members} → ${newMemberCount}`);
        }
        
        // 8. Reload group details to refresh data
        await get().loadGroupDetails(groupId);
        
        console.log('🎉 Successfully removed member from group!');
        set({ isLoading: false });
        return true;
        
      } catch (error) {
        console.error('💥 Unexpected error removing member:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to remove member',
          isLoading: false 
        });
        return false;
      }
    }
  }),
  {
    name: STORAGE_KEYS.CHIT_STORE,
    storage: {
      getItem: async (name: string) => {
        const value = await AsyncStorage.getItem(name);
        return value ? JSON.parse(value) : null;
      },
      setItem: async (name: string, value: any) => {
        await AsyncStorage.setItem(name, JSON.stringify(value));
      },
      removeItem: async (name: string) => {
        await AsyncStorage.removeItem(name);
      }
    }
  }
));