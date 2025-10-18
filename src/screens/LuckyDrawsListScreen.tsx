import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Trophy, Clock, IndianRupee, AlertCircle, Sparkles } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { supabase } from '../libs/supabase';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner-native';

interface ActiveDraw {
  id: string;
  group_id: string;
  group_name: string;
  start_timestamp: string;
  duration_seconds: number;
  prize_amount: number;
  winner_name: string | null;
  revealed: boolean;
}

export default function LuckyDrawsListScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [activeDraws, setActiveDraws] = useState<ActiveDraw[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 10000; // 10 seconds cache

  const fetchActiveDraws = async () => {
    if (!user?.id) return;

    try {
      // Get user's groups
      const { data: memberGroups, error: groupsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (groupsError) throw groupsError;

      if (!memberGroups || memberGroups.length === 0) {
        setActiveDraws([]);
        setLastFetchTime(Date.now());
        return;
      }

      const groupIds = memberGroups.map(g => g.group_id);

      // Fetch active draws for these groups
      const { data: draws, error: drawsError } = await supabase
        .from('draws')
        .select(`
          id,
          group_id,
          start_timestamp,
          duration_seconds,
          prize_amount,
          winner_name,
          revealed,
          bhishi_groups!inner(name)
        `)
        .in('group_id', groupIds)
        .eq('revealed', false)
        .order('start_timestamp', { ascending: false });

      if (drawsError) throw drawsError;

      // Transform data
      const activeDrawsList = (draws || []).map((draw: any) => {
        // Supabase returns bhishi_groups as array with !inner, so get first element
        const groupData = Array.isArray(draw.bhishi_groups) ? draw.bhishi_groups[0] : draw.bhishi_groups;
        return {
          id: draw.id,
          group_id: draw.group_id,
          group_name: groupData?.name || 'Unknown Group',
          start_timestamp: draw.start_timestamp,
          duration_seconds: draw.duration_seconds,
          prize_amount: draw.prize_amount,
          winner_name: draw.winner_name,
          revealed: draw.revealed,
        };
      });

      // Filter out expired draws (client-side validation)
      const now = Date.now();
      const validDraws = activeDrawsList.filter(draw => {
        const startTime = new Date(draw.start_timestamp).getTime();
        const endTime = startTime + (draw.duration_seconds * 1000);
        return now < endTime;
      });

      setActiveDraws(validDraws);
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error('❌ Error fetching active draws:', error);
      toast.error('Failed to load active draws');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch on screen focus with caching
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime;
      
      // Only fetch if cache is stale (>10 seconds old) or no data
      if (timeSinceLastFetch > CACHE_DURATION || activeDraws.length === 0) {
        console.log('🔄 Cache stale, loading lucky draws');
        setIsLoading(true);
        fetchActiveDraws();
      } else {
        console.log('✨ Using cached data (age:', Math.round(timeSinceLastFetch / 1000), 's)');
      }
    }, [user?.id])
  );

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    fetchActiveDraws();
  };

  const getTimeRemaining = (draw: ActiveDraw) => {
    const now = Date.now();
    const startTime = new Date(draw.start_timestamp).getTime();
    const endTime = startTime + (draw.duration_seconds * 1000);
    const remainingMs = endTime - now;

    if (remainingMs <= 0) return 'Ended';

    const minutes = Math.floor(remainingMs / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const handleDrawPress = (drawId: string) => {
    navigation.navigate('LuckyDraw' as never, { drawId } as never);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lucky Draws</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading active draws...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Trophy size={24} color={Colors.primary} />
          <Text style={styles.headerTitle}>Lucky Draws</Text>
        </View>
        <Text style={styles.headerSubtitle}>Active draws in your groups</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeDraws.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Sparkles size={64} color={Colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Live Draws Right Now</Text>
            <Text style={styles.emptyDescription}>
              When an admin starts a lucky draw, it will appear here.
              You'll also get a notification!
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('Home' as never)}
            >
              <Text style={styles.browseButtonText}>Browse Groups</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.drawsList}>
            {activeDraws.map(draw => (
              <TouchableOpacity
                key={draw.id}
                style={[styles.drawCard, Colors.shadow]}
                onPress={() => handleDrawPress(draw.id)}
                activeOpacity={0.8}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Trophy size={20} color={Colors.warning} />
                    <Text style={styles.groupName} numberOfLines={1}>
                      {draw.group_name}
                    </Text>
                  </View>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                  <View style={styles.infoRow}>
                    <Clock size={18} color={Colors.textSecondary} />
                    <Text style={styles.infoLabel}>Time Left:</Text>
                    <Text style={styles.infoValue}>{getTimeRemaining(draw)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <IndianRupee size={18} color={Colors.money} />
                    <Text style={styles.infoLabel}>Prize:</Text>
                    <Text style={styles.prizeValue}>
                      ₹{draw.prize_amount.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Action */}
                <View style={styles.cardAction}>
                  <Text style={styles.actionText}>Join Draw →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
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
  },
  content: {
    flex: 1,
  },
  emptyState: {
    paddingHorizontal: 40,
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 24,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  browseButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  drawsList: {
    padding: 20,
    gap: 16,
  },
  drawCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: Colors.warning + '10',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.error,
    letterSpacing: 0.5,
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  prizeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.money,
  },
  cardAction: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
});
