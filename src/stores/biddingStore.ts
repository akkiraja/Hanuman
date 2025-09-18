import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../libs/supabase';
import { BidRound, MemberBid, BiddingStats } from '../types/chitFund';

interface BiddingState {
  currentRound: BidRound | null;
  bidHistory: BidRound[];
  userBids: MemberBid[];
  biddingStats: BiddingStats | null;
  isLoading: boolean;
  error: string | null;
  realTimeSubscription: any;
}

interface BiddingActions {
  // Round Management (Admin)
  createBidRound: (groupId: string, endTime?: Date, minimumBid?: number) => Promise<BidRound>;
  startBidRound: (roundId: string) => Promise<void>;
  closeBidRound: (roundId: string) => Promise<BidRound>;
  extendBidRound: (roundId: string, newEndTime: Date) => Promise<void>;
  
  // Bidding Actions (Members)
  placeBid: (roundId: string, memberId: string, bidAmount: number) => Promise<MemberBid>;
  updateBid: (bidId: string, newAmount: number) => Promise<MemberBid>;
  withdrawBid: (bidId: string) => Promise<void>;
  
  // Data Fetching
  loadCurrentRound: (groupId: string) => Promise<void>;
  loadBidHistory: (groupId: string) => Promise<void>;
  loadUserBids: (groupId: string, userId: string) => Promise<void>;
  loadBiddingStats: (groupId: string, userId: string) => Promise<void>;
  
  // Real-time Updates
  subscribeToRound: (roundId: string) => void;
  unsubscribeFromRound: () => void;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetState: () => void;
}

type BiddingStore = BiddingState & BiddingActions;

export const useBiddingStore = create<BiddingStore>()(persist(
  (set, get) => ({
    // Initial state
    currentRound: null,
    bidHistory: [],
    userBids: [],
    biddingStats: null,
    isLoading: false,
    error: null,
    realTimeSubscription: null,

    // Round Management Actions (Admin Only)
    createBidRound: async (groupId: string, endTime?: Date, minimumBid = 0) => {
      console.log('🎯 === CREATING NEW BID ROUND ===');
      set({ isLoading: true, error: null });
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Get group details
        const { data: group, error: groupError } = await supabase
          .from('bhishi_groups')
          .select('*, current_round')
          .eq('id', groupId)
          .single();
          
        if (groupError || !group) {
          throw new Error('Group not found');
        }
        
        // Verify user is group admin and group is bidding type
        if (group.created_by !== user.id) {
          throw new Error('Only group admin can create bid rounds');
        }
        
        if (group.group_type !== 'bidding') {
          throw new Error('This group is not a bidding group');
        }
        
        const nextRound = group.current_round + 1;
        const prizeAmount = group.monthly_amount * group.current_members;
        
        console.log(`🎯 Creating round ${nextRound} for group ${group.name}`);
        console.log(`💰 Prize amount: ₹${prizeAmount.toLocaleString()}`);
        
        // Create new bid round
        const { data: bidRound, error: roundError } = await supabase
          .from('bid_rounds')
          .insert({
            group_id: groupId,
            round_number: nextRound,
            status: 'open',
            start_time: new Date().toISOString(),
            end_time: endTime?.toISOString() || null,
            minimum_bid: minimumBid,
            prize_amount: prizeAmount
          })
          .select()
          .single();
          
        if (roundError) {
          console.error('❌ Error creating bid round:', roundError);
          throw new Error('Failed to create bid round');
        }
        
        console.log('✅ Bid round created:', bidRound.id);
        
        // Update the group's current_round field
        const { error: updateError } = await supabase
          .from('bhishi_groups')
          .update({ current_round: nextRound })
          .eq('id', groupId);
          
        if (updateError) {
          console.error('⚠️ Warning: Failed to update group current_round:', updateError);
          // Don't throw error as the round was created successfully
        } else {
          console.log(`✅ Updated group current_round to ${nextRound}`);
        }
        
        // Format round data
        const formattedRound: BidRound = {
          id: bidRound.id,
          groupId: bidRound.group_id,
          roundNumber: bidRound.round_number,
          status: bidRound.status,
          startTime: new Date(bidRound.start_time),
          endTime: bidRound.end_time ? new Date(bidRound.end_time) : undefined,
          minimumBid: bidRound.minimum_bid,
          prizeAmount: bidRound.prize_amount,
          totalBids: 0,
          bids: [],
          createdAt: new Date(bidRound.created_at),
          updatedAt: new Date(bidRound.updated_at)
        };
        
        set({ currentRound: formattedRound, isLoading: false });
        return formattedRound;
        
      } catch (error) {
        console.error('💥 Create bid round failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to create bid round',
          isLoading: false 
        });
        throw error;
      }
    },

    startBidRound: async (roundId: string) => {
      console.log('🚀 === STARTING BID ROUND ===');
      set({ isLoading: true, error: null });
      
      try {
        const { error } = await supabase
          .from('bid_rounds')
          .update({ 
            status: 'active',
            start_time: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', roundId);
          
        if (error) {
          throw new Error('Failed to start bid round');
        }
        
        console.log('✅ Bid round started');
        
        // Update local state
        const currentRound = get().currentRound;
        if (currentRound && currentRound.id === roundId) {
          set({
            currentRound: {
              ...currentRound,
              status: 'active',
              startTime: new Date()
            },
            isLoading: false
          });
        }
        
      } catch (error) {
        console.error('💥 Start bid round failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to start bid round',
          isLoading: false 
        });
        throw error;
      }
    },

    closeBidRound: async (roundId: string) => {
      console.log('🏁 === CLOSING BID ROUND ===');
      set({ isLoading: true, error: null });
      
      try {
        // Get current round data with bids
        const { data: roundData, error: roundError } = await supabase
          .from('bid_rounds')
          .select(`
            *,
            member_bids (
              *,
              group_members!inner (
                name,
                user_id
              )
            )
          `)
          .eq('id', roundId)
          .single();
          
        if (roundError || !roundData) {
          throw new Error('Bid round not found');
        }
        
        // Find winner (lowest bid)
        const activeBids = roundData.member_bids.filter((bid: any) => bid.is_active);
        
        if (activeBids.length === 0) {
          // Handle round with no bids - close it without winner
          const { error: updateError } = await supabase
            .from('bid_rounds')
            .update({
              status: 'completed',
              winner_id: null,
              winning_bid: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', roundId);
            
          if (updateError) {
            throw new Error('Failed to close round with no bids');
          }
          
          console.log('✅ Round closed with no bids');
          
          // Return completed round without winner
          const completedRound: BidRound = {
            id: roundData.id,
            groupId: roundData.group_id,
            roundNumber: roundData.round_number,
            status: 'completed',
            startTime: new Date(roundData.start_time),
            endTime: roundData.end_time ? new Date(roundData.end_time) : undefined,
            minimumBid: roundData.minimum_bid,
            prizeAmount: roundData.prize_amount,
            totalBids: 0,
            bids: [],
            createdAt: new Date(roundData.created_at),
            updatedAt: new Date()
          };
          
          set({ currentRound: completedRound, isLoading: false });
          return completedRound;
        }
        
        // Find lowest bid (winner)
        const winningBid = activeBids.reduce((lowest: any, current: any) => {
          return current.bid_amount < lowest.bid_amount ? current : lowest;
        });
        
        console.log(`🏆 Winner: ${winningBid.group_members.name} with bid ₹${winningBid.bid_amount}`);
        
        // Update round with winner
        const { error: updateError } = await supabase
          .from('bid_rounds')
          .update({
            status: 'completed',
            winner_id: winningBid.member_id,
            winning_bid: winningBid.bid_amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', roundId);
          
        if (updateError) {
          throw new Error('Failed to update round with winner');
        }
        
        // Mark winner as having received payout
        const { error: memberError } = await supabase
          .from('group_members')
          .update({ has_won: true })
          .eq('id', winningBid.member_id);
          
        if (memberError) {
          console.error('⚠️ Failed to mark member as winner:', memberError);
        }
        
        // Format completed round
        const completedRound: BidRound = {
          id: roundData.id,
          groupId: roundData.group_id,
          roundNumber: roundData.round_number,
          status: 'completed',
          startTime: new Date(roundData.start_time),
          endTime: roundData.end_time ? new Date(roundData.end_time) : undefined,
          minimumBid: roundData.minimum_bid,
          winnerId: winningBid.member_id,
          winnerName: winningBid.group_members.name,
          winningBid: winningBid.bid_amount,
          prizeAmount: roundData.prize_amount,
          totalBids: activeBids.length,
          bids: activeBids.map((bid: any) => ({
            id: bid.id,
            roundId: bid.round_id,
            memberId: bid.member_id,
            memberName: bid.group_members.name,
            bidAmount: bid.bid_amount,
            bidTime: new Date(bid.bid_time),
            isActive: bid.is_active,
            isWinning: bid.id === winningBid.id
          })),
          createdAt: new Date(roundData.created_at),
          updatedAt: new Date()
        };
        
        console.log('✅ Bid round completed successfully');
        set({ currentRound: completedRound, isLoading: false });
        return completedRound;
        
      } catch (error) {
        console.error('💥 Close bid round failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to close bid round',
          isLoading: false 
        });
        throw error;
      }
    },

    extendBidRound: async (roundId: string, newEndTime: Date) => {
      console.log('⏰ === EXTENDING BID ROUND ===');
      set({ isLoading: true, error: null });
      
      try {
        const { error } = await supabase
          .from('bid_rounds')
          .update({ 
            end_time: newEndTime.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', roundId);
          
        if (error) {
          throw new Error('Failed to extend bid round');
        }
        
        console.log('✅ Bid round extended');
        
        // Update local state
        const currentRound = get().currentRound;
        if (currentRound && currentRound.id === roundId) {
          set({
            currentRound: {
              ...currentRound,
              endTime: newEndTime
            },
            isLoading: false
          });
        }
        
      } catch (error) {
        console.error('💥 Extend bid round failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to extend bid round',
          isLoading: false 
        });
        throw error;
      }
    },

    // Member Bidding Actions
    placeBid: async (roundId: string, memberId: string, bidAmount: number) => {
      console.log('💰 === PLACING BID ===');
      set({ isLoading: true, error: null });
      
      try {
        // Validate bid amount
        const currentRound = get().currentRound;
        if (!currentRound) {
          throw new Error('No active round found');
        }
        
        if (currentRound.status !== 'active') {
          throw new Error('Bidding round is not active');
        }
        
        if (bidAmount < currentRound.minimumBid) {
          throw new Error(`Bid must be at least ₹${currentRound.minimumBid}`);
        }
        
        // Check if user already has an active bid
        const { data: existingBids, error: checkError } = await supabase
          .from('member_bids')
          .select('*')
          .eq('round_id', roundId)
          .eq('member_id', memberId)
          .eq('is_active', true);
          
        if (checkError) {
          throw new Error('Failed to check existing bids');
        }
        
        if (existingBids && existingBids.length > 0) {
          throw new Error('You already have an active bid. Please update your existing bid.');
        }
        
        console.log(`💰 Placing bid of ₹${bidAmount.toLocaleString()}`);
        console.log('🔍 Bid placement details:', {
          roundId,
          memberId,
          bidAmount,
          currentUserId: (await supabase.auth.getUser()).data.user?.id
        });
        
        // Get current user for user_id field
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('User not authenticated');
        }
        
        // Insert new bid with proper headers and user_id
        const { data: bidData, error: bidError } = await supabase
          .from('member_bids')
          .insert({
            round_id: roundId,
            member_id: memberId,
            user_id: user.id,
            bid_amount: bidAmount,
            is_active: true,
            bid_time: new Date().toISOString()
          })
          .select(`
            *,
            group_members!inner (
              name
            )
          `)
          .single();
          
        if (bidError) {
          console.error('❌ Error placing bid:', bidError);
          console.error('❌ Bid error details:', {
            code: bidError.code,
            message: bidError.message,
            details: bidError.details,
            hint: bidError.hint,
            statusCode: bidError.code
          });
          
          // Handle specific error codes
          if (bidError.code === '406' || bidError.message?.includes('406')) {
            throw new Error('Invalid request format. Please try again.');
          } else if (bidError.code === '23505') {
            throw new Error('You already have an active bid for this round.');
          } else if (bidError.code === '42501' || bidError.message?.includes('row-level security')) {
            throw new Error('Access denied. You must be a member of this group to place bids.');
          } else if (bidError.message?.includes('violates row-level security policy')) {
            throw new Error('You are not authorized to place bids in this group. Please contact the group admin.');
          } else {
            throw new Error(`Failed to place bid: ${bidError.message || 'Unknown error'}`);
          }
        }
        
        console.log('✅ Bid placed successfully');
        
        const newBid: MemberBid = {
          id: bidData.id,
          roundId: bidData.round_id,
          memberId: bidData.member_id,
          memberName: bidData.group_members.name,
          bidAmount: bidData.bid_amount,
          bidTime: new Date(bidData.bid_time),
          isActive: bidData.is_active
        };
        
        // Update local state
        const updatedUserBids = [...get().userBids, newBid];
        set({ userBids: updatedUserBids, isLoading: false });
        
        return newBid;
        
      } catch (error) {
        console.error('💥 Place bid failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to place bid',
          isLoading: false 
        });
        throw error;
      }
    },

    updateBid: async (bidId: string, newAmount: number) => {
      console.log('🔄 === UPDATING BID ===');
      set({ isLoading: true, error: null });
      
      try {
        const { error } = await supabase
          .from('member_bids')
          .update({ 
            bid_amount: newAmount,
            bid_time: new Date().toISOString()
          })
          .eq('id', bidId);
          
        if (error) {
          throw new Error('Failed to update bid');
        }
        
        console.log('✅ Bid updated successfully');
        
        // Update local state
        const updatedUserBids = get().userBids.map(bid => 
          bid.id === bidId 
            ? { ...bid, bidAmount: newAmount, bidTime: new Date() }
            : bid
        );
        
        const updatedBid = updatedUserBids.find(bid => bid.id === bidId)!;
        set({ userBids: updatedUserBids, isLoading: false });
        
        return updatedBid;
        
      } catch (error) {
        console.error('💥 Update bid failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update bid',
          isLoading: false 
        });
        throw error;
      }
    },

    withdrawBid: async (bidId: string) => {
      console.log('❌ === WITHDRAWING BID ===');
      set({ isLoading: true, error: null });
      
      try {
        const { error } = await supabase
          .from('member_bids')
          .update({ is_active: false })
          .eq('id', bidId);
          
        if (error) {
          throw new Error('Failed to withdraw bid');
        }
        
        console.log('✅ Bid withdrawn successfully');
        
        // Update local state
        const updatedUserBids = get().userBids.filter(bid => bid.id !== bidId);
        set({ userBids: updatedUserBids, isLoading: false });
        
      } catch (error) {
        console.error('💥 Withdraw bid failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to withdraw bid',
          isLoading: false 
        });
        throw error;
      }
    },

    // Data Loading Functions
    loadCurrentRound: async (groupId: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const { data, error } = await supabase
          .from('bid_rounds')
          .select(`
            *,
            member_bids (
              *,
              group_members!inner (
                name,
                user_id
              )
            )
          `)
          .eq('group_id', groupId)
          .in('status', ['open', 'active'])
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (error) {
          throw new Error('Failed to load current round');
        }
        
        if (!data || data.length === 0) {
          set({ currentRound: null, isLoading: false });
          return;
        }
        
        const roundData = data[0];
        const bids = roundData.member_bids
          .filter((bid: any) => bid.is_active)
          .map((bid: any) => ({
            id: bid.id,
            roundId: bid.round_id,
            memberId: bid.member_id,
            memberName: bid.group_members.name,
            bidAmount: bid.bid_amount,
            bidTime: new Date(bid.bid_time),
            isActive: bid.is_active
          }));
        
        const currentLowestBid = bids.length > 0 
          ? Math.min(...bids.map(bid => bid.bidAmount))
          : undefined;
        
        const formattedRound: BidRound = {
          id: roundData.id,
          groupId: roundData.group_id,
          roundNumber: roundData.round_number,
          status: roundData.status,
          startTime: new Date(roundData.start_time),
          endTime: roundData.end_time ? new Date(roundData.end_time) : undefined,
          minimumBid: roundData.minimum_bid,
          prizeAmount: roundData.prize_amount,
          totalBids: bids.length,
          currentLowestBid,
          bids,
          createdAt: new Date(roundData.created_at),
          updatedAt: new Date(roundData.updated_at)
        };
        
        set({ currentRound: formattedRound, isLoading: false });
        
      } catch (error) {
        console.error('💥 Load current round failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load current round',
          isLoading: false 
        });
      }
    },

    loadBidHistory: async (groupId: string) => {
      try {
        const { data, error } = await supabase
          .from('bid_rounds')
          .select(`
            *,
            member_bids (
              *,
              group_members!inner (
                name
              )
            )
          `)
          .eq('group_id', groupId)
          .eq('status', 'completed')
          .order('round_number', { ascending: false });
          
        if (error) {
          throw new Error('Failed to load bid history');
        }
        
        const history = (data || []).map((roundData: any) => {
          const bids = roundData.member_bids.map((bid: any) => ({
            id: bid.id,
            roundId: bid.round_id,
            memberId: bid.member_id,
            memberName: bid.group_members.name,
            bidAmount: bid.bid_amount,
            bidTime: new Date(bid.bid_time),
            isActive: bid.is_active,
            isWinning: bid.member_id === roundData.winner_id
          }));
          
          return {
            id: roundData.id,
            groupId: roundData.group_id,
            roundNumber: roundData.round_number,
            status: roundData.status,
            startTime: new Date(roundData.start_time),
            endTime: roundData.end_time ? new Date(roundData.end_time) : undefined,
            minimumBid: roundData.minimum_bid,
            winnerId: roundData.winner_id,
            winningBid: roundData.winning_bid,
            prizeAmount: roundData.prize_amount,
            totalBids: bids.length,
            bids,
            createdAt: new Date(roundData.created_at),
            updatedAt: new Date(roundData.updated_at)
          };
        });
        
        set({ bidHistory: history });
        
      } catch (error) {
        console.error('💥 Load bid history failed:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to load bid history' });
      }
    },

    loadUserBids: async (groupId: string, userId: string) => {
      try {
        // Get user's member ID first
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .single();
          
        if (memberError || !memberData) {
          set({ userBids: [] });
          return;
        }
        
        // Get user's bids
        const { data, error } = await supabase
          .from('member_bids')
          .select(`
            *,
            bid_rounds!inner (
              group_id
            ),
            group_members!inner (
              name
            )
          `)
          .eq('member_id', memberData.id)
          .eq('bid_rounds.group_id', groupId)
          .eq('is_active', true)
          .order('bid_time', { ascending: false });
          
        if (error) {
          throw new Error('Failed to load user bids');
        }
        
        const userBids = (data || []).map((bid: any) => ({
          id: bid.id,
          roundId: bid.round_id,
          memberId: bid.member_id,
          memberName: bid.group_members.name,
          bidAmount: bid.bid_amount,
          bidTime: new Date(bid.bid_time),
          isActive: bid.is_active
        }));
        
        set({ userBids });
        
      } catch (error) {
        console.error('💥 Load user bids failed:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to load user bids' });
      }
    },

    loadBiddingStats: async (groupId: string, userId: string) => {
      try {
        // Implementation for bidding statistics
        // This would calculate various metrics for the user
        set({ biddingStats: null }); // TODO: Implement
      } catch (error) {
        console.error('💥 Load bidding stats failed:', error);
      }
    },

    // Real-time subscriptions
    subscribeToRound: (roundId: string) => {
      console.log('🔊 === SUBSCRIBING TO REAL-TIME UPDATES ===');
      console.log('📡 Round ID:', roundId);
      
      // Unsubscribe from any existing subscription
      get().unsubscribeFromRound();
      
      const channel = supabase
        .channel(`bid-round-${roundId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'member_bids',
            filter: `round_id=eq.${roundId}`,
          },
          async (payload) => {
            console.log('🆕 Real-time NEW BID inserted:', payload);
            
            try {
              const newBidData = payload.new;
              
              // Get member name for the new bid
              const { data: memberData, error: memberError } = await supabase
                .from('group_members')
                .select('name')
                .eq('id', newBidData.member_id)
                .single();
                
              if (memberError) {
                console.error('❌ Failed to get member name:', memberError);
                return;
              }
              
              // Create new bid object
              const newBid: MemberBid = {
                id: newBidData.id,
                roundId: newBidData.round_id,
                memberId: newBidData.member_id,
                memberName: memberData.name,
                bidAmount: newBidData.bid_amount,
                bidTime: new Date(newBidData.bid_time),
                isActive: newBidData.is_active
              };
              
              console.log('✨ Adding new bid to feed:', {
                memberName: newBid.memberName,
                amount: newBid.bidAmount,
                time: newBid.bidTime.toLocaleTimeString()
              });
              
              // Update current round with new bid
              set((state) => {
                if (!state.currentRound || state.currentRound.id !== roundId) {
                  return state;
                }
                
                const updatedBids = [...state.currentRound.bids, newBid];
                const newLowestBid = Math.min(...updatedBids.map(bid => bid.bidAmount));
                
                console.log('📊 Updated lowest bid:', newLowestBid);
                
                return {
                  ...state,
                  currentRound: {
                    ...state.currentRound,
                    bids: updatedBids,
                    totalBids: updatedBids.length,
                    currentLowestBid: newLowestBid
                  }
                };
              });
              
            } catch (error) {
              console.error('💥 Error processing real-time bid:', error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'member_bids',
            filter: `round_id=eq.${roundId}`,
          },
          async (payload) => {
            console.log('🔄 Real-time BID UPDATED:', payload);
            
            try {
              const updatedBidData = payload.new;
              
              // Get member name for the updated bid
              const { data: memberData, error: memberError } = await supabase
                .from('group_members')
                .select('name')
                .eq('id', updatedBidData.member_id)
                .single();
                
              if (memberError) {
                console.error('❌ Failed to get member name for update:', memberError);
                return;
              }
              
              console.log('🔄 Updating existing bid:', {
                bidId: updatedBidData.id,
                newAmount: updatedBidData.bid_amount,
                memberName: memberData.name
              });
              
              // Update existing bid in current round
              set((state) => {
                if (!state.currentRound || state.currentRound.id !== roundId) {
                  return state;
                }
                
                const updatedBids = state.currentRound.bids.map(bid => 
                  bid.id === updatedBidData.id 
                    ? {
                        ...bid,
                        bidAmount: updatedBidData.bid_amount,
                        bidTime: new Date(updatedBidData.bid_time),
                        isActive: updatedBidData.is_active
                      }
                    : bid
                ).filter(bid => bid.isActive); // Remove inactive bids
                
                const newLowestBid = updatedBids.length > 0 
                  ? Math.min(...updatedBids.map(bid => bid.bidAmount))
                  : undefined;
                
                console.log('📊 Updated lowest bid after update:', newLowestBid);
                
                return {
                  ...state,
                  currentRound: {
                    ...state.currentRound,
                    bids: updatedBids,
                    totalBids: updatedBids.length,
                    currentLowestBid: newLowestBid
                  }
                };
              });
              
            } catch (error) {
              console.error('💥 Error processing real-time bid update:', error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bid_rounds',
            filter: `id=eq.${roundId}`,
          },
          (payload) => {
            console.log('🔄 Real-time ROUND STATUS update:', payload);
            
            const updatedRound = payload.new;
            
            // Update round status and metadata
            set((state) => ({
              ...state,
              currentRound: state.currentRound ? {
                ...state.currentRound,
                status: updatedRound.status,
                endTime: updatedRound.end_time ? new Date(updatedRound.end_time) : undefined,
                winnerId: updatedRound.winner_id,
                winningBid: updatedRound.winning_bid
              } : null
            }));
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to real-time updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time subscription error');
          }
        });
        
      set({ realTimeSubscription: channel });
      console.log('🔊 Real-time subscription established');
    },

    unsubscribeFromRound: () => {
      console.log('🔌 === UNSUBSCRIBING FROM REAL-TIME UPDATES ===');
      
      const subscription = get().realTimeSubscription;
      if (subscription) {
        console.log('🔌 Removing subscription channel:', subscription.topic);
        supabase.removeChannel(subscription);
        set({ realTimeSubscription: null });
        console.log('✅ Real-time subscription cleaned up');
      } else {
        console.log('📝 No active subscription to remove');
      }
    },

    // Utility functions
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setError: (error: string | null) => set({ error }),
    clearError: () => set({ error: null }),
    resetState: () => set({
      currentRound: null,
      bidHistory: [],
      userBids: [],
      biddingStats: null,
      error: null
    })
  }),
  {
    name: 'bidding-store',
    partialize: (state) => ({
      bidHistory: state.bidHistory,
      biddingStats: state.biddingStats
    })
  }
));

export default useBiddingStore;