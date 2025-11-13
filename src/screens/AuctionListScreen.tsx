import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Gavel, Clock, Trophy, TrendingDown, AlertCircle } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useBiddingStore } from '../stores/biddingStore';
import { useAuthStore } from '../stores/authStore';

interface AuctionListScreenProps {
  navigation: any;
}

export default function AuctionListScreen({ navigation }: AuctionListScreenProps) {
  const { user } = useAuthStore();
  const { activeRounds, fetchActiveRoundsForUser, isLoading, error, clearError } = useBiddingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 10000; // 10 seconds cache

  // Load active rounds when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 AuctionListScreen focused');
      if (user?.id) {
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTime;
        
        // Only fetch if cache is stale (>10 seconds old) or no data
        if (timeSinceLastFetch > CACHE_DURATION || activeRounds.length === 0) {
          console.log('🔄 Cache stale, loading active rounds');
          loadActiveRounds();
        } else {
          console.log('✨ Using cached data (age:', Math.round(timeSinceLastFetch / 1000), 's)');
        }
      }
      return () => {
        clearError();
      };
    }, [user?.id])
  );

  const loadActiveRounds = async () => {
    if (!user?.id) return;
    
    try {
      await fetchActiveRoundsForUser(user.id);
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error('Failed to load active rounds:', error);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    await loadActiveRounds();
    setRefreshing(false);
  };

  const handleRoundPress = (round: any) => {
    console.log('📍 Navigating to BiddingRound:', round.id);
    navigation.navigate('BiddingRound' as never, {
      groupId: round.groupId,
      roundId: round.id
    } as never);
  };

  const getTimeRemaining = (endTime: Date | null): string => {
    if (!endTime) return 'No time limit';
    
    const now = new Date();
    const end = new Date(endTime);
    const diffMs = end.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Ended';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
    return `${diffMins}m`;
  };

  // Memoized card component
  const AuctionCard = memo(({ item }: { item: any }) => {
    const timeLeft = getTimeRemaining(item.endTime);
    const isUrgent = item.endTime && (new Date(item.endTime).getTime() - new Date().getTime()) < 3600000; // < 1 hour
    
    return (
      <TouchableOpacity
        style={[styles.card, isUrgent && styles.cardUrgent]}
        onPress={() => handleRoundPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Gavel size={24} color={Colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.groupName} numberOfLines={1}>
              {item.groupName}
            </Text>
            <Text style={styles.roundNumber}>Round {item.roundNumber}</Text>
          </View>
          <View style={[styles.timeBadge, isUrgent && styles.timeBadgeUrgent]}>
            <Clock size={14} color={isUrgent ? Colors.error : Colors.textSecondary} />
            <Text style={[styles.timeText, isUrgent && styles.timeTextUrgent]}>{timeLeft}</Text>
          </View>
        </View>

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Trophy size={16} color={Colors.textSecondary} />
            <Text style={styles.statLabel}>Prize</Text>
            <Text style={styles.statValue}>₹{item.prizeAmount?.toLocaleString() || '0'}</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <TrendingDown size={16} color={Colors.textSecondary} />
            <Text style={styles.statLabel}>Lowest Bid</Text>
            <Text style={styles.statValue}>
              {item.currentLowestBid ? `₹${item.currentLowestBid.toLocaleString()}` : 'No bids'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.viewButton}>Join Live Bidding →</Text>
        </View>
      </TouchableOpacity>
    );
  });
  
  // Render function for FlatList
  const renderAuctionCard = ({ item }: { item: any }) => <AuctionCard item={item} />;
  
  // Add keyExtractor for better performance
  const keyExtractor = (item: any) => item.id;

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Gavel size={64} color={Colors.textSecondary} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>No live auctions right now</Text>
      <Text style={styles.emptySubtitle}>
        Check back later or browse your groups to start live bidding.
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => navigation.navigate('Home' as never)}
      >
        <Text style={styles.browseButtonText}>Browse Groups</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <AlertCircle size={48} color={Colors.error} />
      <Text style={styles.errorTitle}>Failed to load auctions</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={loadActiveRounds}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading && !refreshing && activeRounds.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Auctions</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading auctions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Auctions</Text>
        {activeRounds.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{activeRounds.length}</Text>
          </View>
        )}
      </View>

      {error && !refreshing ? (
        renderErrorState()
      ) : activeRounds.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={activeRounds}
          renderItem={renderAuctionCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Colors.shadow,
  },
  cardUrgent: {
    borderColor: Colors.error + '40',
    backgroundColor: Colors.error + '05',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  roundNumber: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.textSecondary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  timeBadgeUrgent: {
    backgroundColor: Colors.error + '15',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  timeTextUrgent: {
    color: Colors.error,
  },
  cardStats: {
    flexDirection: 'row',
    backgroundColor: Colors.textSecondary + '08',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  cardFooter: {
    alignItems: 'center',
  },
  viewButton: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.textSecondary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
