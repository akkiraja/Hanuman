import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../../constants/colors';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonItem({ width = '100%', height = 20, borderRadius = 8, style }: LoadingSkeletonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, []);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.surface, Colors.border],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
}

export function BiddingGroupSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <SkeletonItem width={40} height={40} borderRadius={20} />
        <View style={styles.headerContent}>
          <SkeletonItem width={150} height={20} />
          <SkeletonItem width={100} height={16} style={{ marginTop: 4 }} />
        </View>
        <SkeletonItem width={40} height={40} borderRadius={20} />
      </View>
      
      {/* Stats Skeleton */}
      <View style={styles.statsContainer}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.statCard}>
            <SkeletonItem width={24} height={24} borderRadius={12} />
            <SkeletonItem width={80} height={24} style={{ marginTop: 8 }} />
            <SkeletonItem width={60} height={16} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
      
      {/* Round Card Skeleton */}
      <View style={styles.roundCard}>
        <View style={styles.roundHeader}>
          <View>
            <SkeletonItem width={100} height={20} />
            <SkeletonItem width={80} height={16} style={{ marginTop: 4 }} />
          </View>
          <SkeletonItem width={80} height={24} borderRadius={12} />
        </View>
        
        <View style={styles.roundStats}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.roundStat}>
              <SkeletonItem width={40} height={16} />
              <SkeletonItem width={60} height={20} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>
      </View>
      
      {/* Action Button Skeleton */}
      <View style={styles.actionContainer}>
        <SkeletonItem width={150} height={48} borderRadius={12} />
      </View>
      
      {/* Bids List Skeleton */}
      <View style={styles.bidsContainer}>
        <View style={styles.bidsHeader}>
          <SkeletonItem width={120} height={20} />
          <SkeletonItem width={80} height={16} />
        </View>
        
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.bidItem}>
            <View>
              <SkeletonItem width={100} height={16} />
              <SkeletonItem width={80} height={14} style={{ marginTop: 4 }} />
            </View>
            <SkeletonItem width={80} height={20} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function MemberListSkeleton() {
  return (
    <View style={styles.memberContainer}>
      <View style={styles.memberHeader}>
        <SkeletonItem width={120} height={20} />
        <View style={styles.memberStats}>
          <SkeletonItem width={60} height={24} borderRadius={12} />
          <SkeletonItem width={60} height={24} borderRadius={12} />
        </View>
      </View>
      
      {[1, 2, 3, 4].map((item) => (
        <View key={item} style={styles.memberItem}>
          <View style={styles.memberInfo}>
            <SkeletonItem width={120} height={16} />
            <SkeletonItem width={100} height={14} style={{ marginTop: 4 }} />
          </View>
          <SkeletonItem width={60} height={24} borderRadius={8} />
        </View>
      ))}
    </View>
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
    padding: 16,
    gap: 12,
  },
  headerContent: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...Colors.shadow,
  },
  roundCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    margin: 16,
    padding: 16,
    ...Colors.shadow,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  roundStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  roundStat: {
    alignItems: 'center',
  },
  actionContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  bidsContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    margin: 16,
    padding: 16,
    ...Colors.shadow,
  },
  bidsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bidItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    margin: 16,
    ...Colors.shadow,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberStats: {
    flexDirection: 'row',
    gap: 8,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberInfo: {
    flex: 1,
  },
});