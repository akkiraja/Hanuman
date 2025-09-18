import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import { ArrowLeft, Calendar, Crown, TrendingDown, Users, Filter } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useBiddingStore } from '../stores/biddingStore';
import { useChitStore } from '../stores/chitStore';
import { Colors } from '../constants/colors';
import { createStyles } from '../styles/pastRoundsScreenStyles';
import { BidRound } from '../types/chitFund';

type PastRoundsScreenProps = {
  navigation: any;
  route: {
    params: {
      groupId: string;
      groupName: string;
    };
  };
};

type FilterType = 'all' | 'completed' | 'active' | 'open';

export default function PastRoundsScreen({ navigation, route }: PastRoundsScreenProps) {
  const { groupId, groupName } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);
  
  const { bidHistory, isLoading, loadBidHistory } = useBiddingStore();
  const { currentGroup } = useChitStore();
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  useEffect(() => {
    loadRoundsData();
  }, [groupId]);
  
  const loadRoundsData = async () => {
    try {
      await loadBidHistory(groupId);
    } catch (error) {
      console.error('Error loading rounds data:', error);
      Alert.alert('Error', 'Failed to load rounds history');
    }
  };
  
  const filteredRounds = bidHistory.filter(round => {
    if (filter === 'all') return true;
    return round.status === filter;
  });
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return Colors.success;
      case 'active': return Colors.warning;
      case 'open': return Colors.primary;
      default: return Colors.textSecondary;
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'active': return 'Active';
      case 'open': return 'Open';
      default: return 'Unknown';
    }
  };
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };
  
  const renderRoundItem = ({ item }: { item: BidRound }) => (
    <TouchableOpacity
      style={[styles.roundItem, Colors.shadow]}
      activeOpacity={0.7}
      onPress={() => {
        // Could navigate to detailed round view or show modal
        console.log('Round pressed:', item.id);
      }}
    >
      <View style={styles.roundHeader}>
        <View style={styles.roundInfo}>
          <Text style={styles.roundNumber}>Round {item.roundNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        <Text style={styles.roundDate}>
          {formatDate(item.startTime)}
        </Text>
      </View>
      
      <View style={styles.roundDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <TrendingDown size={16} color={Colors.money} />
            <Text style={styles.detailLabel}>Prize:</Text>
            <Text style={styles.detailValue}>
              ₹{item.prizeAmount.toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Users size={16} color={Colors.primary} />
            <Text style={styles.detailLabel}>Bids:</Text>
            <Text style={styles.detailValue}>
              {item.totalBids || 0}
            </Text>
          </View>
        </View>
        
        {item.status === 'completed' && item.winningBid && (
          <View style={styles.winningBidRow}>
            <Crown size={16} color={Colors.warning} />
            <Text style={styles.winningBidLabel}>Winning Bid:</Text>
            <Text style={styles.winningBidValue}>
              ₹{item.winningBid.toLocaleString()}
            </Text>
            {item.winnerName && (
              <Text style={styles.winnerName}>by {item.winnerName}</Text>
            )}
          </View>
        )}
        
        {item.endTime && (
          <Text style={styles.roundEndTime}>
            {item.status === 'completed' ? 'Ended' : 'Ends'}: {formatDate(item.endTime)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
  
  const renderFilterButton = (filterType: FilterType, label: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.activeFilterButton
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === filterType && styles.activeFilterButtonText
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );
  
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Calendar size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>
        {filter === 'all' ? 'No Rounds Yet' : `No ${filter} Rounds`}
      </Text>
      <Text style={styles.emptyStateText}>
        {filter === 'all' 
          ? 'Round history will appear here once rounds are created'
          : `No rounds with ${filter} status found`
        }
      </Text>
    </View>
  );
  
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.loadingItem}>
          <View style={styles.loadingHeader}>
            <View style={styles.loadingTitle} />
            <View style={styles.loadingBadge} />
          </View>
          <View style={styles.loadingDetails}>
            <View style={styles.loadingDetail} />
            <View style={styles.loadingDetail} />
          </View>
        </View>
      ))}
    </View>
  );
  
  // Filter counts
  const allCount = bidHistory.length;
  const completedCount = bidHistory.filter(r => r.status === 'completed').length;
  const activeCount = bidHistory.filter(r => r.status === 'active').length;
  const openCount = bidHistory.filter(r => r.status === 'open').length;
  
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
            <Text style={styles.headerTitle}>Past Rounds</Text>
            <Text style={styles.headerSubtitle}>{groupName}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </BlurView>
      
      {/* Filter Buttons */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {renderFilterButton('all', 'All', allCount)}
            {renderFilterButton('completed', 'Completed', completedCount)}
            {renderFilterButton('active', 'Active', activeCount)}
            {renderFilterButton('open', 'Open', openCount)}
          </ScrollView>
        </View>
      )}
      
      {/* Rounds List */}
      <View style={styles.content}>
        {isLoading ? (
          renderLoadingState()
        ) : (
          <FlatList
            data={filteredRounds}
            renderItem={renderRoundItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={filteredRounds.length === 0 ? styles.emptyContainer : styles.listContent}
            refreshing={isLoading}
            onRefresh={loadRoundsData}
          />
        )}
      </View>
    </SafeAreaView>
  );
}