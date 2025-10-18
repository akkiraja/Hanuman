import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Crown, TrendingDown } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { MemberBid } from '../../types/chitFund';

interface BidChatBubbleProps {
  bid: MemberBid;
  isCurrentUser: boolean;
  isLowestBid: boolean;
  showMemberName: boolean; // Only show for first bubble in a sequence
  isLastInSequence: boolean; // For timestamp positioning
}

export default function BidChatBubble({ 
  bid, 
  isCurrentUser, 
  isLowestBid, 
  showMemberName,
  isLastInSequence 
}: BidChatBubbleProps) {
  
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getBubbleStyle = (): ViewStyle[] => {
    const baseStyles: ViewStyle[] = [
      styles.bubble,
      isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
    ];
    
    // Add inactive bid styling
    if (!bid.isActive) {
      baseStyles.push(styles.inactiveBubble);
    }
    
    // Add lowest bid styling (only for active bids)
    if (isLowestBid && bid.isActive) {
      baseStyles.push(styles.lowestBidBubble);
    }
    
    return baseStyles;
  };

  const getTextColor = () => {
    // Inactive bids have muted text color
    if (!bid.isActive) {
      return Colors.textSecondary;
    }
    
    if (isLowestBid) return Colors.warning;
    return isCurrentUser ? Colors.background : Colors.text;
  };

  return (
    <View style={[styles.container, isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer]}>
      {/* Member name - show for all bubbles now for transparency */}
      {showMemberName && !isCurrentUser && (
        <Text style={[styles.memberName, !bid.isActive && styles.inactiveText]}>
          {bid.memberName || 'Member'}
          {!bid.isActive && ' (updated)'}
        </Text>
      )}
      
      {/* Chat bubble */}
      <View style={getBubbleStyle()}>
        {/* Crown icon for lowest bid (only active bids) */}
        {isLowestBid && bid.isActive && (
          <View style={styles.crownContainer}>
            <Crown size={14} color={Colors.warning} />
            <Text style={styles.lowestText}>LOWEST</Text>
          </View>
        )}
        
        {/* Inactive bid indicator */}
        {!bid.isActive && (
          <View style={styles.inactiveContainer}>
            <Text style={styles.inactiveLabel}>UPDATED</Text>
          </View>
        )}
        
        {/* Bid amount */}
        <View style={styles.bidContent}>
          <TrendingDown size={16} color={getTextColor()} />
          <Text style={[styles.bidAmount, { color: getTextColor() }]}>
            ₹{bid.bidAmount.toLocaleString()}
          </Text>
        </View>
      </View>
      
      {/* Timestamp - show for all bubbles now */}
      {isLastInSequence && (
        <Text style={[
          styles.timestamp, 
          isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp,
          !bid.isActive && styles.inactiveText
        ]}>
          {formatTime(bid.bidTime)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
  },
  currentUserContainer: {
    alignItems: 'flex-end',
    marginLeft: 60,
  },
  otherUserContainer: {
    alignItems: 'flex-start',
    marginRight: 60,
  },
  memberName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 4,
    marginLeft: 12,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lowestBidBubble: {
    borderWidth: 2,
    borderColor: Colors.warning,
    backgroundColor: Colors.warning + '15',
  },
  crownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  lowestText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  bidContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  currentUserTimestamp: {
    marginRight: 12,
  },
  otherUserTimestamp: {
    marginLeft: 12,
  },
  inactiveBubble: {
    opacity: 0.6,
    borderStyle: 'dashed' as 'dashed',
  },
  inactiveText: {
    opacity: 0.7,
  },
  inactiveContainer: {
    marginBottom: 4,
  },
  inactiveLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
});