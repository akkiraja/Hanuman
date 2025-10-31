import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TrendingDown, Crown, Clock, User, RefreshCw } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { MemberBid } from '../../types/chitFund';

interface LiveBiddingFeedProps {
  bids: MemberBid[];
  currentLowestBid?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

interface BidFeedItem extends MemberBid {
  isLowest: boolean;
  isUpdated: boolean;
  previousAmount?: number;
  animatedValue?: Animated.Value;
}

export default function LiveBiddingFeed({ bids, currentLowestBid, isLoading = false, onRefresh, isRefreshing = false }: LiveBiddingFeedProps) {
  const [animatedBids, setAnimatedBids] = useState<BidFeedItem[]>([]);
  const bidAnimations = useRef<Map<string, Animated.Value>>(new Map()).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('🔄 LiveBiddingFeed: Processing bids update:', {
      bidsCount: bids.length,
      currentLowestBid,
      bidsData: bids.map(bid => ({
        id: bid.id,
        memberName: bid.memberName,
        amount: bid.bidAmount,
        time: bid.bidTime.toLocaleTimeString()
      }))
    });
    
    // Track existing bid IDs to detect new ones
    const existingBidIds = new Set(animatedBids.map(b => b.id));
    
    // Process bids to add metadata
    const processedBids = bids.map(bid => {
      const isNew = !existingBidIds.has(bid.id);
      
      // Create or get animation value for this bid
      if (!bidAnimations.has(bid.id)) {
        bidAnimations.set(bid.id, new Animated.Value(isNew ? 0 : 1));
      }
      
      return {
        ...bid,
        isLowest: bid.bidAmount === currentLowestBid,
        isUpdated: false,
        animatedValue: bidAnimations.get(bid.id)!
      };
    }).sort((a, b) => {
      // Sort by: lowest bid first, then by timestamp
      if (a.bidAmount !== b.bidAmount) {
        return a.bidAmount - b.bidAmount;
      }
      return new Date(b.bidTime).getTime() - new Date(a.bidTime).getTime();
    });

    console.log('✨ LiveBiddingFeed: Processed bids:', {
      processedCount: processedBids.length,
      sortedBids: processedBids.map(bid => ({
        memberName: bid.memberName,
        amount: bid.bidAmount,
        isLowest: bid.isLowest
      }))
    });

    setAnimatedBids(processedBids);

    // Animate in new bids with stagger effect
    const newBids = processedBids.filter(bid => !existingBidIds.has(bid.id));
    if (newBids.length > 0) {
      const animations = newBids.map((bid, index) => 
        Animated.timing(bid.animatedValue!, {
          toValue: 1,
          duration: 400,
          delay: index * 100, // Stagger each new bid by 100ms
          useNativeDriver: true,
        })
      );
      Animated.parallel(animations).start();
    }
  }, [bids, currentLowestBid]);

  // Pulse animation for the lowest bid
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

  const renderBidItem = ({ item, index }: { item: BidFeedItem; index: number }) => {
    const getBidIcon = () => {
      if (item.isLowest) {
        return <Crown size={16} color={Colors.warning} />;
      }
      return <TrendingDown size={16} color={Colors.primary} />;
    };

    const getBidStyle = () => {
      if (item.isLowest) {
        return [styles.bidItem, styles.lowestBidItem];
      }
      return styles.bidItem;
    };

    const formatTime = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(date));
    };

    // Individual animation for this bid
    const bidOpacity = item.animatedValue || new Animated.Value(1);
    const slideDistance = item.isLowest ? 0 : 20; // Lowest bid doesn't slide

    return (
      <Animated.View 
        style={[
          getBidStyle(),
          {
            opacity: bidOpacity,
            transform: [
              {
                translateY: bidOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-slideDistance, 0],
                }),
              },
              {
                scale: item.isLowest ? pulseAnim : 1, // Pulse effect for lowest bid
              },
            ],
          },
        ]}
      >
        <View style={styles.bidHeader}>
          <View style={styles.bidInfo}>
            {getBidIcon()}
            <Text style={styles.memberName}>
              {item.memberName || 'Member'}
            </Text>
            {item.isLowest && (
              <View style={styles.lowestBadge}>
                <Text style={styles.lowestBadgeText}>LOWEST</Text>
              </View>
            )}
          </View>
          <Text style={styles.bidTime}>
            {formatTime(item.bidTime)}
          </Text>
        </View>
        
        <View style={styles.bidContent}>
          <Text style={[
            styles.bidAmount,
            item.isLowest && styles.lowestBidAmount
          ]}>
            ₹{item.bidAmount.toLocaleString()}
          </Text>
          
          {item.isUpdated && item.previousAmount && (
            <Text style={styles.previousAmount}>
              Previous: ₹{item.previousAmount.toLocaleString()}
            </Text>
          )}
        </View>
        
        {index === 0 && item.isLowest && (
          <View style={styles.winningIndicator}>
            <Text style={styles.winningText}>🏆 Currently Winning</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <TrendingDown size={48} color={Colors.textSecondary} />
      <Text style={styles.emptyStateText}>No bids placed yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Be the first to place a bid and win the round!
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.loadingItem}>
          <View style={styles.loadingHeader}>
            <View style={styles.loadingAvatar} />
            <View style={styles.loadingText} />
          </View>
          <View style={styles.loadingAmount} />
        </View>
      ))}
    </View>
  );

  if (isLoading) {
    return renderLoadingState();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Bidding Feed</Text>
        <View style={styles.headerActions}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          {onRefresh && (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <RefreshCw size={16} color={Colors.primary} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <FlatList
        data={animatedBids}
        renderItem={renderBidItem}
        keyExtractor={(item) => `${item.id}-${item.bidTime.getTime()}`}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={animatedBids.length === 0 ? styles.emptyContainer : undefined}
        style={styles.feedList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  feedList: {
    flex: 1,
  },
  bidItem: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lowestBidItem: {
    backgroundColor: Colors.warning + '10',
    borderColor: Colors.warning + '50',
    borderWidth: 2,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  lowestBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowestBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.background,
  },
  bidTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bidContent: {
    alignItems: 'flex-start',
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.money,
  },
  lowestBidAmount: {
    color: Colors.warning,
  },
  previousAmount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  winningIndicator: {
    backgroundColor: Colors.success + '20',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  winningText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingState: {
    gap: 12,
  },
  loadingItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  loadingAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  loadingText: {
    width: 80,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.border,
  },
  loadingAmount: {
    width: 120,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.border,
  },
});