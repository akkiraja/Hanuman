import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { isGroupAdmin } from '../utils/adminHelpers';
import { useChitStore } from '../stores/chitStore';
import { useBiddingStore } from '../stores/biddingStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../libs/supabase';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'react-native';
import { toast } from 'sonner-native';
import BidChatFeed from '../components/bidding/BidChatFeed';
import ChatInputBar from '../components/bidding/ChatInputBar';
import CompactRoomInfo from '../components/bidding/CompactRoomInfo';
import FloatingAdminControls from '../components/bidding/FloatingAdminControls';

interface BiddingRoundScreenProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
      roundId: string;
    };
  };
}

export default function BiddingRoundScreen({ navigation, route }: BiddingRoundScreenProps) {
  const { groupId, roundId } = route.params;
  
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL LOGIC
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const { currentGroup } = useChitStore();
  const { user } = useAuthStore();
  const { 
    currentRound,
    bidHistory,
    loadCurrentRound,
    subscribeToRound,
    unsubscribeFromRound,
    placeBid,
    updateBid,
    startBidRound,
    closeBidRound,
    userBids,
    isLoading
  } = useBiddingStore();
  
  const [bidAmount, setBidAmount] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClosingRound, setIsClosingRound] = useState(false);
  
  // Load round data and subscribe to real-time updates
  useEffect(() => {
    console.log('🔄 BiddingRoundScreen mounted with params:', { groupId, roundId });
    
    if (groupId && roundId) {
      console.log('📊 Loading round data...');
      loadCurrentRound(groupId);
    }
    
    // Subscribe to real-time updates
    if (roundId) {
      console.log('🔊 Subscribing to round:', roundId);
      subscribeToRound(roundId);
    }
    
    // Polling fallback for APK reliability - refresh bids every 8 seconds during active bidding
    // This ensures users see bids even if WebSocket connection is unreliable
    let pollInterval: NodeJS.Timeout | null = null;
    
    if (groupId && currentRound?.status === 'active') {
      console.log('⏱️ Starting polling fallback for active bidding (8s interval)');
      pollInterval = setInterval(() => {
        console.log('🔄 Polling fallback: Refreshing bid data');
        loadCurrentRound(groupId);
      }, 8000); // 8 seconds - frequent enough for live bidding
    }
    
    return () => {
      console.log('🔌 Unsubscribing from round updates');
      unsubscribeFromRound();
      
      if (pollInterval) {
        console.log('⏹️ Stopping polling fallback');
        clearInterval(pollInterval);
      }
    };
  }, [groupId, roundId, currentRound?.status]);
  
  // Debug logging useEffect - MUST be with other hooks
  useEffect(() => {
    if (currentGroup && currentRound) {
    const isAdmin = isGroupAdmin(user?.id, currentGroup);

    // Check if user has already won a previous round in this group
    const hasUserAlreadyWon = bidHistory?.some(round => 
    round.status === 'completed' && round.winnerId === user?.id
    ) || false;

            const canPlaceBid = currentRound.status === 'active' && !hasUserAlreadyWon;
      
      console.log('🔄 BiddingRoundScreen state update:', {
        groupId: currentGroup?.id,
        roundId: currentRound?.id,
        roundStatus: currentRound?.status,
        isAdmin,
        canPlaceBid,
        userBidsCount: userBids.length,
        currentRoundBidsCount: currentRound.bids?.length || 0,
        currentLowestBid: currentRound.currentLowestBid,
        bidsData: currentRound.bids?.map(bid => ({
          id: bid.id,
          memberName: bid.memberName,
          amount: bid.bidAmount,
          time: bid.bidTime.toLocaleTimeString()
        })) || []
      });
    }
  }, [currentGroup, currentRound, user, userBids]);
  
  // Memoize onTimeUp callback to prevent infinite re-renders - MUST be with other hooks
  const handleTimeUp = useCallback(() => {
    console.log('Round time expired');
    if (currentGroup && currentRound?.id) {
      const isAdmin = isGroupAdmin(user?.id, currentGroup);
      if (isAdmin) {
        handleCloseRound();
      }
    }
  }, [currentGroup, currentRound?.id, user]);
  
  // Handle close round with navigation
  const handleCloseRound = async () => {
    if (!currentRound?.id) return;
    
    console.log('🏁 Admin closing round:', currentRound.id);
    setIsClosingRound(true);
    
    try {
      await closeBidRound(currentRound.id);
      console.log('✅ Round closed successfully');
      toast.success('Round closed successfully!');
      
      // Navigate back to previous screen
      setTimeout(() => {
      navigation.goBack();
      }, 500);
      
    } catch (error) {
      console.error('❌ Failed to close round:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to close round: ${errorMessage}`);
    } finally {
      setIsClosingRound(false);
    }
  };
  
  // CONDITIONAL LOGIC COMES AFTER ALL HOOKS
  if (!currentGroup || !currentRound) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading round...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const isAdmin = isGroupAdmin(user?.id, currentGroup);
  const userCurrentBid = userBids.find(bid => bid.roundId === currentRound.id);

      // Check if user has already won a previous round in this group
      const hasUserAlreadyWon = bidHistory?.some(round => 
        round.status === 'completed' && round.winnerId === user?.id
      ) || false;

      const canPlaceBid = currentRound.status === 'active' && !hasUserAlreadyWon;
  const canStartRound = isAdmin && currentRound.status === 'open';
  const canCloseRound = isAdmin && currentRound.status === 'active';
  
  const handleRefresh = async () => {
    if (!currentGroup?.id || isRefreshing) return;
    
    console.log('🔄 Manual refresh triggered');
    setIsRefreshing(true);
    
    try {
      await loadCurrentRound(currentGroup.id);
      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handlePlaceBid = async () => {
    if (!bidAmount || !currentRound || !user) return;
    
    const amount = parseInt(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid bid amount.');
      return;
    }
    
    // For updates, ensure new bid is lower than current bid
    if (userCurrentBid && amount >= userCurrentBid.bidAmount) {
      Alert.alert(
        'Invalid Update', 
        `Your new bid must be lower than your current bid of ₹${userCurrentBid.bidAmount.toLocaleString()}`
      );
      return;
    }
    
    setIsPlacingBid(true);
    
    try {
      if (userCurrentBid) {
        // UPDATE EXISTING BID
        console.log('🔄 Updating existing bid:', {
          bidId: userCurrentBid.id,
          oldAmount: userCurrentBid.bidAmount,
          newAmount: amount
        });
        
        await updateBid(userCurrentBid.id, amount);
        setBidAmount('');
        console.log('✅ Bid updated successfully!');
        Alert.alert('Success', 'Bid updated successfully!');
        
      } else {
        // PLACE NEW BID
        // Get member record for this user in this group
        const { data: memberRecord, error: memberError } = await supabase
          .from('group_members')
          .select('id, user_id, name, group_id')
          .eq('group_id', currentGroup.id)
          .eq('user_id', user.id)
          .single();
          
        if (memberError || !memberRecord) {
          console.error('❌ Member record not found for user:', user.id);
          console.error('❌ Member error:', memberError);
          console.error('❌ This user is not a member of this group');
          Alert.alert(
            'Access Denied', 
            'You are not a member of this bidding group. Please contact the group admin to be added.'
          );
          return;
        }
        
        console.log('✅ Member record found, placing new bid:', {
          roundId: currentRound.id,
          memberId: memberRecord.id,
          amount,
          userName: memberRecord.name
        });
        
        await placeBid(currentRound.id, memberRecord.id, amount);
        setBidAmount('');
        console.log('✅ Bid placed successfully!');
        Alert.alert('Success', 'Bid placed successfully!');
      }
    } catch (error) {
      console.error('💥 Failed to place/update bid:', error);
      console.error('💥 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Error', `Failed to ${userCurrentBid ? 'update' : 'place'} bid: ${errorMessage}`);
    } finally {
      setIsPlacingBid(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Simple Header */}
      <BlurView
        style={styles.headerBlur}
        tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
        intensity={100}
      >
        <View style={[styles.headerOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(248,250,252,0.5)' }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{currentGroup.name}</Text>
              <Text style={styles.headerSubtitle}>Round {currentRound.roundNumber}</Text>
            </View>
          </View>
        </View>
      </BlurView>
      
      {/* Compact Room Info */}
      <CompactRoomInfo
        currentRound={currentRound}
        currentLowestBid={currentRound.currentLowestBid}
        totalMembers={currentGroup.members?.length || 0}
        activeBidders={currentRound.bids?.length || 0}
        onTimeUp={handleTimeUp}
      />
      
      {/* KeyboardAvoidingView for Feed and Input */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Chat-style Bidding Feed */}
        <BidChatFeed
          bids={currentRound.bids || []}
          currentUserId={user?.id}
          currentLowestBid={currentRound.currentLowestBid}
          isLoading={isLoading}
        />
        
        {/* Chat-style Input Bar */}
        <ChatInputBar
          bidAmount={bidAmount}
          setBidAmount={setBidAmount}
          userCurrentBid={userCurrentBid}
          currentRound={currentRound}
          isPlacingBid={isPlacingBid}
          onPlaceBid={handlePlaceBid}
          canPlaceBid={canPlaceBid}
          isDisabledForWinner={hasUserAlreadyWon}
        />
      </KeyboardAvoidingView>
      
      {/* Floating Admin Controls */}
      <FloatingAdminControls
        isAdmin={isAdmin}
        canStartRound={canStartRound}
        canCloseRound={canCloseRound && !isClosingRound}
        onStartRound={() => startBidRound(currentRound.id)}
        onCloseRound={handleCloseRound}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerBlur: {
    paddingTop: 0,
    zIndex: 100,
  },
  headerOverlay: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface + '80',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});