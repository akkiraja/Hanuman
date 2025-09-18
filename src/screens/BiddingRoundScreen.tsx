import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, TrendingDown, Users, Zap, Crown, AlertCircle } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useChitStore } from '../stores/chitStore';
import { useBiddingStore } from '../stores/biddingStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../libs/supabase';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'react-native';
import LiveBiddingFeed from '../components/bidding/LiveBiddingFeed';
import CountdownTimer from '../components/bidding/CountdownTimer';
import StickyBidEntry from '../components/bidding/StickyBidEntry';
import AdminControlsSection from '../components/bidding/AdminControlsSection';
import FooterStatusSection from '../components/bidding/FooterStatusSection';

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
    
    return () => {
      console.log('🔌 Unsubscribing from round updates');
      unsubscribeFromRound();
    };
  }, [groupId, roundId]);
  
  // Debug logging useEffect - MUST be with other hooks
  useEffect(() => {
    if (currentGroup && currentRound) {
      const isAdmin = user?.id === currentGroup.createdBy;
      const canPlaceBid = currentRound.status === 'active';
      
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
  
  const isAdmin = user?.id === currentGroup.createdBy;
  const userCurrentBid = userBids.find(bid => bid.roundId === currentRound.id);
  const canPlaceBid = currentRound.status === 'active';
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
    
    if (amount < currentRound.minimumBid) {
      Alert.alert(
        'Bid Too Low', 
        `Minimum bid is ₹${currentRound.minimumBid.toLocaleString()}`
      );
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
  
  const getStatusColor = () => {
    switch (currentRound.status) {
      case 'open': return Colors.warning;
      case 'active': return Colors.success;
      case 'completed': return Colors.textSecondary;
      default: return Colors.textSecondary;
    }
  };
  
  const getStatusText = () => {
    switch (currentRound.status) {
      case 'open': return 'Open';
      case 'active': return 'Active';
      case 'completed': return 'Closed';
      default: return 'Unknown';
    }
  };
  
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
            <Text style={styles.groupName}>{currentGroup.name}</Text>
            <Text style={styles.roundInfo}>Round {currentRound.roundNumber} • ₹{currentRound.prizeAmount.toLocaleString()}</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
      </BlurView>
      
      <View style={styles.content}>
        {/* 1. Minimal Timer & Lowest Bid Header */}
        <View style={styles.topSection}>
          {currentRound.status === 'active' && currentRound.endTime && (
            <View style={styles.timerContainer}>
              <CountdownTimer
                endTime={currentRound.endTime}
                size="small"
                showIcon={false}
                onTimeUp={() => {
                  console.log('Round time expired');
                  if (isAdmin) {
                    closeBidRound(currentRound.id);
                  }
                }}
              />
            </View>
          )}
          
          {/* Current Lowest Bid - Compact */}
          <View style={styles.lowestBidBanner}>
            <Crown size={16} color={Colors.warning} />
            <Text style={styles.lowestBidLabel}>Lowest:</Text>
            {currentRound.currentLowestBid ? (
              <Text style={styles.lowestBidValue}>
                ₹{currentRound.currentLowestBid.toLocaleString()}
              </Text>
            ) : (
              <Text style={styles.noBidsValue}>No bids yet</Text>
            )}
          </View>
        </View>
        
        {/* 2. Live Bidding Feed - Main Focus */}
        <View style={styles.mainFeedContainer}>
          <LiveBiddingFeed
            bids={currentRound.bids || []}
            currentLowestBid={currentRound.currentLowestBid}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        </View>
        
        {/* 3. Admin Controls - Minimal */}
        <AdminControlsSection
          isAdmin={isAdmin}
          canStartRound={canStartRound}
          canCloseRound={canCloseRound}
          onStartRound={() => startBidRound(currentRound.id)}
          onCloseRound={() => closeBidRound(currentRound.id)}
        />
      </View>
      
      {/* Sticky Bid Entry at Bottom */}
      <StickyBidEntry
        bidAmount={bidAmount}
        setBidAmount={setBidAmount}
        userCurrentBid={userCurrentBid}
        currentRound={currentRound}
        isPlacingBid={isPlacingBid}
        onPlaceBid={handlePlaceBid}
        canPlaceBid={canPlaceBid}
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    marginLeft: 16,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  roundInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
  content: {
    flex: 1,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  timerContainer: {
    flex: 1,
  },
  lowestBidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warning + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  lowestBidLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
  },
  lowestBidValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.warning,
  },
  noBidsValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  mainFeedContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  feedPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  feedPlaceholderText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  feedPlaceholderNote: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});