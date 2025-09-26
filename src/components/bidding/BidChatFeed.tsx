import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated } from 'react-native';
import { TrendingDown } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { MemberBid } from '../../types/chitFund';
import BidChatBubble from './BidChatBubble';

interface BidChatFeedProps {
  bids: MemberBid[];
  currentUserId?: string;
  currentLowestBid?: number;
  isLoading?: boolean;
}

interface ProcessedBid extends MemberBid {
  isCurrentUser: boolean;
  isLowestBid: boolean;
  showMemberName: boolean;
  isLastInSequence: boolean;
}

export default function BidChatFeed({ 
  bids, 
  currentUserId, 
  currentLowestBid, 
  isLoading = false 
}: BidChatFeedProps) {
  const flatListRef = useRef<FlatList>(null);
  const [processedBids, setProcessedBids] = useState<ProcessedBid[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sort bids chronologically (oldest first for chat-like experience)
    const sortedBids = [...bids].sort((a, b) => 
      new Date(a.bidTime).getTime() - new Date(b.bidTime).getTime()
    );

    // Process bids to add chat-specific metadata
    // Show ALL bids as separate bubbles (no grouping) for transparent history
    const processed = sortedBids.map((bid, index) => {
      const isCurrentUser = bid.memberId === currentUserId;
      // Only active bids can be the lowest bid
      const isLowestBid = bid.isActive && bid.bidAmount === currentLowestBid;
      
      // Show member name on EVERY bid for complete transparency
      const showMemberName = true;
      
      // Every bid is treated as last in sequence (separate bubble)
      const isLastInSequence = true;

      return {
        ...bid,
        isCurrentUser,
        isLowestBid,
        showMemberName,
        isLastInSequence,
      };
    });

    setProcessedBids(processed);

    // Auto-scroll to bottom when new bids arrive
    if (processed.length > 0) {
      // Use multiple timeouts to ensure reliable auto-scroll
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Additional scroll attempt for better reliability
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 300);
    }

    // Animate in new content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [bids, currentUserId, currentLowestBid]);

  const renderBidItem = ({ item }: { item: ProcessedBid }) => (
    <BidChatBubble
      bid={item}
      isCurrentUser={item.isCurrentUser}
      isLowestBid={item.isLowestBid}
      showMemberName={item.showMemberName}
      isLastInSequence={item.isLastInSequence}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <TrendingDown size={48} color={Colors.textSecondary} />
      <Text style={styles.emptyStateText}>No bids yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Start the conversation by placing the first bid! 💬
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.loadingBubble, i % 2 === 0 ? styles.loadingBubbleRight : styles.loadingBubbleLeft]}>
          <View style={styles.loadingContent} />
        </View>
      ))}
    </View>
  );

  if (isLoading) {
    return renderLoadingState();
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.feedContainer, { opacity: fadeAnim }]}>
        <FlatList
          ref={flatListRef}
          data={processedBids}
          renderItem={renderBidItem}
          keyExtractor={(item) => `${item.id}-${item.bidTime.getTime()}-${item.isActive ? 'active' : 'inactive'}`}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.feedContent,
            processedBids.length === 0 && styles.emptyContainer
          ]}
          onContentSizeChange={() => {
            // Auto-scroll to bottom when content changes
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          onLayout={() => {
            // Auto-scroll on layout changes (e.g., keyboard open/close)
            if (processedBids.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 200);
            }
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  feedContainer: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 120, // Add bottom padding to prevent overlap with input bar
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingState: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  loadingBubble: {
    maxWidth: '70%',
    height: 40,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    opacity: 0.6,
  },
  loadingBubbleLeft: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  loadingBubbleRight: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    backgroundColor: Colors.primary + '40',
  },
  loadingContent: {
    flex: 1,
    margin: 8,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
});