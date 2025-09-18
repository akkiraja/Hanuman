
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../libs/supabase';
import { STORAGE_KEYS } from '../constants';
import { ChitGroup, Member, WinnerRecord, Payment } from '../types/chitFund';
import { notifyPaymentMarkedDone, notifyDrawConducted, notifyWinnerAnnounced, sendLuckyDrawNotification, notifyGroupJoined } from '../utils/notificationUtils';

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
    groupType?: 'lucky_draw' | 'bidding'; // Group type selection
    members?: { name: string; email: string; phone: string; userId?: string }[]; // Optional for new 4-step flow
    upiId?: string;
  }) => Promise<void>;
  fetchGroups: () => Promise<void>;
  joinGroup: (groupId: string, member: { name: string; email: string; phone: string }) => Promise<void>;
  setCurrentGroup: (group: ChitGroup | null) => void;
  loadGroupDetails: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  leaveGroup: (groupId: string) => Promise<boolean>;
  
  // Lucky draw
  conductLuckyDraw: (groupId: string) => Promise<WinnerRecord>;
  conductLuckyDrawWithWinner: (groupId: string) => Promise<any>;
  finalizeLuckyDraw: (winnerInfo: any) => Promise<WinnerRecord>;
  selectManualWinner: (groupId: string, memberId: string) => Promise<WinnerRecord>;
  addMembersToGroup: (groupId: string, members: AddMemberData[]) => Promise<{ addedCount: number; skippedCount: number; }>;
  getRecentWinner: (groupId: string) => Promise<any | null>;
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

    // New method for spinner-based lucky draw
    conductLuckyDrawWithWinner: async (groupId) => {
      console.log('🎲 === CONDUCTING LUCKY DRAW WITH SPINNER ===');
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
        
        // Verify user is group admin
        if (group.created_by !== user.id) {
          throw new Error('Only group admin can conduct lucky draw');
        }
        
        console.log('✅ Group found:', group.name);
        
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
        
        // Update group with draw start timestamp for member dashboard widgets
        const { error: updateDrawError } = await supabase
          .from('bhishi_groups')
          .update({ 
            draw_started_at: new Date().toISOString()
          })
          .eq('id', groupId);
          
        if (updateDrawError) {
          console.error('⚠️ Failed to update draw start time:', updateDrawError);
          // Don't fail the draw if this update fails
        } else {
          console.log('⏰ Draw start time updated for member widgets');
        }
        
        // Send immediate "draw started" notification to all members
        try {
          await notifyDrawConducted(groupId, group.name);
          console.log('🎲 Draw started notification sent immediately');
        } catch (notificationError) {
          console.error('⚠️ Failed to send draw started notification:', notificationError);
          // Don't fail the draw if notification fails
        }
        
        // Return winner info for spinner, but don't save to database yet
        const winnerInfo = {
          memberId: winner.user_id,
          memberName: winner.name,
          amount: prizeAmount,
          groupId: groupId,
          groupName: group.name,
          winner: winner // Full winner object for database operations
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
        const { data: drawRecord, error: drawError } = await supabase
          .from('draw_history')
          .insert({
            group_id: groupId,
            round: nextRound,
            winner_id: winner.user_id,
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
      
      // Show spinner if draw started within last 45 seconds
      const isActive = timeDiff >= 0 && timeDiff <= 45;
      
      if (isActive) {
        console.log(`🎲 Draw in progress for ${group.name}: ${Math.round(45 - timeDiff)}s remaining`);
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
        
        // Verify user is group admin
        if (group.created_by !== user.id) {
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
        const { data: drawRecord, error: drawError } = await supabase
          .from('draw_history')
          .insert({
            group_id: groupId,
            round: nextRound,
            winner_id: winner.user_id,
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
        
        // Verify user is group admin
        if (group.created_by !== user.id) {
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
        const { data: drawRecord, error: drawError } = await supabase
          .from('draw_history')
          .insert({
            group_id: groupId,
            round: nextRound,
            winner_id: selectedMember.user_id,
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
      console.log('👥 === ADDING MEMBERS TO EXISTING GROUP ===');
      
      // Input validation (Issue #4)
      if (!groupId || !members?.length) {
        throw new Error('Invalid input: groupId and members array are required');
      }
      
      console.log('Adding members:', members.length); // Enhanced logging (Issue #5)
      set({ isLoading: true, error: null });
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        console.log('👤 Supabase user ID:', user.id);
        console.log('🎯 Group ID:', groupId);
        console.log('👤 Admin ID:', user.id);
        console.log('👥 Members to add:', members.length);
        
        // Get group details
        const { data: group, error: groupError } = await supabase
          .from('bhishi_groups')
          .select('*')
          .eq('id', groupId)
          .single();
          
        if (groupError || !group) {
          throw new Error('Group not found');
        }
        
        // Verify user is group admin
        if (group.created_by !== user.id) {
          throw new Error('Only group admin can add members');
        }
        console.log('🏷️ Group created_by:', group.created_by);
        
        console.log('✅ Group found:', group.name);
        
        // Get existing members to avoid duplicates
        const { data: existingMembers, error: existingError } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId);
          
        if (existingError) {
          throw new Error('Failed to fetch existing members');
        }
        
        const existingUserIds = existingMembers.map(m => m.user_id);
        console.log('👥 Existing member IDs:', existingUserIds);
        
        console.log('📌 Existing Members:', existingMembers);
        console.log('📌 Selected Users:', members);
        console.log('🔍 Checking if selected user already exists...');
        members.forEach(user => {
          const match = existingMembers.find(m => m.user_id === user.userId);
          console.log(`👤 ${user.name} (${user.userId}) - Match found:`, !!match);
        });
        
        let addedCount = 0;
        const addedMembers = [];
        
        // Fix group limit if it's too low (legacy groups)
        if (group.total_members < 30) {
          console.log(`🔧 Fixing low group limit: ${group.total_members} → 40`);
          await supabase
            .from('bhishi_groups')
            .update({ total_members: 40 })
            .eq('id', groupId);
        }
        
        // Add each member
        for (const member of members) {
          // Skip if member is already in group
          console.log(`🔍 Checking duplicate for ${member.name}: userId=${member.userId}, existingIds=[${existingUserIds.join(', ')}]`);
          if (existingUserIds.includes(member.userId)) {
            console.log(`⚠️ Skipping ${member.name} - already in group`);
            continue;
          }
          
          try {
            console.log(`🔍 Processing member: ${member.name} (${member.userId})`);
            
            // CRITICAL: Verify user exists in profiles table (foreign key constraint)
            const { data: userProfile, error: profileError } = await supabase
              .from('profiles')
              .select('id, name, email, phone')
              .eq('id', member.userId)
              .single();
              
            // Fix error handling - PGRST116 is normal "no rows found" (Issue #2)
            if (profileError && profileError.code !== 'PGRST116') {
              console.error(`❌ Database error for ${member.name}:`, profileError);
              continue;
            }
            
            if (!userProfile) {
              console.error(`❌ User profile not found for ${member.name} (${member.userId}):`, profileError);
              console.log(`🔧 Creating missing profile for ${member.name}...`);
              
              // Create missing profile to satisfy foreign key constraint
              const { data: newProfile, error: createProfileError } = await supabase
                .from('profiles')
                .insert({
                  id: member.userId,
                  name: member.name,
                  email: member.email || null, // Support OTP users
                  phone: member.phone || ''
                })
                .select()
                .single();
                
              if (createProfileError) {
                console.error(`❌ Failed to create profile for ${member.name}:`, createProfileError);
                continue;
              }
              
              console.log(`✅ Created profile for ${member.name}:`, newProfile);
            } else {
              console.log(`✅ Profile exists for ${member.name}:`, userProfile);
            }
            
            // Now insert into group_members with verified user_id
            console.log('📝 Attempting to insert member:', member);
            console.log(`📝 Inserting ${member.name} into group_members...`);
            const { data: addedMember, error: memberError } = await supabase
              .from('group_members')
              .insert({
                group_id: groupId,
                user_id: member.userId,
                name: member.name,
                email: member.email || null, // Support OTP users without email
                phone: member.phone || '',
                contribution_status: 'pending',
                has_won: false // Add missing has_won field (Issue #3)
              })
              .select()
              .single();
              
            console.log('Member insert result:', addedMember); // Enhanced logging (Issue #5)
              
            if (memberError) {
              console.error('❌ Supabase insert failed for member:', member.name, memberError);
              console.error(`❌ Failed to add ${member.name} to group_members:`, memberError);
              console.error(`❌ Error details:`, {
                code: memberError.code,
                message: memberError.message,
                details: memberError.details,
                hint: memberError.hint
              });
              continue;
            }
            
            console.log(`✅ Added member: ${addedMember.name}`);
            console.log(`📊 Member details:`, {
              id: addedMember.id,
              name: addedMember.name,
              email: addedMember.email,
              phone: addedMember.phone,
              user_id: addedMember.user_id,
              group_id: addedMember.group_id
            });
            addedMembers.push(addedMember);
            addedCount++;
            
            // Send group joined notification to the new member
            try {
              await notifyGroupJoined(
                groupId,
                group.name,
                addedMember.name,
                addedMember.user_id
              );
              console.log(`👥 Group joined notification sent to ${addedMember.name}`);
            } catch (notificationError) {
              console.error(`⚠️ Failed to send group joined notification to ${addedMember.name}:`, notificationError);
              // Don't fail member addition if notification fails
            }
            
          } catch (error) {
            console.error(`❌ Error adding ${member.name}:`, error);
            continue;
          }
        }
        
        if (addedCount === 0) {
          console.log('⚠️ No new members added - all selected members are already in the group');
          // Don't throw error - return success with 0 count
          set({ isLoading: false });
          return {
            addedCount: 0,
            skippedCount: members.length
          };
        }
        
        // Update group member counts
        const newCurrentMembers = group.current_members + addedCount;
        const newTotalMembers = Math.max(group.total_members, newCurrentMembers);
        
        const { error: updateGroupError } = await supabase
          .from('bhishi_groups')
          .update({ 
            current_members: newCurrentMembers,
            total_members: newTotalMembers,
            total_rounds: newTotalMembers // Update total rounds to match new member count
          })
          .eq('id', groupId);
          
        if (updateGroupError) {
          console.error('❌ Group update error:', updateGroupError);
          throw new Error('Failed to update group member count');
        }
        
        console.log(`✅ Group updated: ${newCurrentMembers}/${newTotalMembers} members`);
        
        // Refresh groups list (for dashboard)
        console.log('🔄 Refreshing groups list...');
        await get().fetchGroups();
        
        // Refresh current group details (for GroupDetailScreen)
        console.log('🔄 Refreshing current group details...');
        if (get().currentGroup?.id === groupId) {
          await get().loadGroupDetails(groupId);
          console.log('✅ Current group details refreshed with updated members');
        }
        
        console.log(`🎉 Successfully added ${addedCount} member${addedCount > 1 ? 's' : ''} to group!`);
        set({ isLoading: false });
        
        return {
          addedCount,
          skippedCount: members.length - addedCount
        };
        
      } catch (error) {
        console.error('💥 Top-level error in addMembersToGroup:', error);
        console.error('💥 Add members failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to add members',
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
          createdAt: new Date(groupData.created_at),
          members: formattedMembers,
          winners: formattedWinners
        };
        
        console.log(`✅ Loaded group with ${formattedMembers.length} members and ${formattedWinners.length} winners`);
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
          .select('created_by, name')
          .eq('id', groupId)
          .single();
          
        if (groupError || !group) {
          set({ error: 'Group not found', isLoading: false });
          return false;
        }
        
        if (group.created_by !== user.id) {
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
          .select('created_by, name')
          .eq('id', groupId)
          .single();
          
        if (groupError || !group) {
          set({ error: 'Group not found', isLoading: false });
          return false;
        }
        
        // Prevent admin from leaving (they should delete instead)
        if (group.created_by === user.id) {
          set({ error: 'Group admin cannot leave. Please delete the group instead.', isLoading: false });
          return false;
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
