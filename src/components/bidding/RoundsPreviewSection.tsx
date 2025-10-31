import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Calendar, Crown, TrendingDown, Users, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { createStyles } from '../../styles/roundsPreviewSectionStyles';
import { BidRound } from '../../types/chitFund';

type RoundsPreviewSectionProps = {
  rounds: BidRound[];
  onViewAll: () => void;
  onRoundPress?: (round: BidRound) => void;
};

export default function RoundsPreviewSection({ 
  rounds, 
  onViewAll,
  onRoundPress 
}: RoundsPreviewSectionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);
  
  // Show only latest 2-3 completed rounds for preview (newest first)
  const completedRounds = rounds
    .filter(round => round.status === 'completed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sort by newest first
  
  const previewRounds = completedRounds.slice(0, 3); // First 3 rounds (newest)
  const remainingCount = Math.max(0, completedRounds.length - previewRounds.length);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return Colors.success;
      case 'active': return Colors.warning;
      case 'open': return Colors.primary;
      default: return Colors.textSecondary;
    }
  };
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };
  
  const renderRoundPreview = (round: BidRound) => {
    console.log('🔍 RoundsPreviewSection: Rendering round:', {
      id: round.id,
      roundNumber: round.roundNumber,
      status: round.status,
      startTime: round.startTime,
      startTimeFormatted: new Date(round.startTime).toLocaleDateString()
    });
    
    return (
      <TouchableOpacity
        key={round.id}
        style={[styles.roundPreviewItem, Colors.shadow, { marginBottom: 8 }]}
        onPress={() => onRoundPress?.(round)}
        activeOpacity={0.7}
      >
        <View style={styles.roundHeader}>
          <View style={styles.roundInfo}>
            <Text style={[styles.roundNumber, { marginRight: 8 }]}>Round {round.roundNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(round.status) }]}>
            <Text style={styles.statusText}>Completed</Text>
          </View>
        </View>
        <Text style={styles.roundDate}>
          {formatDate(round.startTime)}
        </Text>
      </View>
      
      <View style={[styles.roundDetails, { marginTop: 8 }]}>
        <View style={styles.detailItem}>
          <TrendingDown size={14} color={Colors.money} />
          <Text style={styles.detailLabel}>Prize:</Text>
          <Text style={styles.detailValue}>
            ₹{round.prizeAmount.toLocaleString()}
          </Text>
        </View>
        
        {round.winningBid && (
          <View style={styles.detailItem}>
            <Crown size={14} color={Colors.warning} />
            <Text style={styles.detailLabel}>Won at:</Text>
            <Text style={[styles.detailValue, { color: Colors.warning }]}>
              ₹{round.winningBid.toLocaleString()}
            </Text>
          </View>
        )}
        
        <View style={styles.detailItem}>
          <Users size={14} color={Colors.primary} />
          <Text style={styles.detailLabel}>Bids:</Text>
          <Text style={styles.detailValue}>
            {round.totalBids || 0}
          </Text>
        </View>
      </View>
      
      {round.winnerId && round.winnerName && (
        <View style={styles.winnerSection}>
          <Crown size={12} color={Colors.warning} />
          <Text style={styles.winnerText}>
            Winner: {round.winnerName}
          </Text>
        </View>
      )}
    </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Calendar size={20} color={Colors.primary} />
          <Text style={[styles.title, { marginLeft: 8 }]}>Past Rounds</Text>
        </View>
        <View style={styles.roundCount}>
          <Text style={styles.roundCountText}>{completedRounds.length}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        {previewRounds.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={32} color={Colors.textSecondary} />
            <Text style={styles.emptyStateText}>
              {rounds.length === 0 ? 'No rounds yet' : 'No completed rounds yet'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {rounds.length === 0 ? 'Round history will appear here once you create and complete rounds' : 'Round history will appear here once rounds are completed'}
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.roundsList, { marginBottom: 12 }]}>
              {previewRounds.map(round => renderRoundPreview(round))}
            </View>
            
            {(remainingCount > 0 || completedRounds.length > 3) && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={onViewAll}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>
                  View All {completedRounds.length} Rounds
                </Text>
                <ChevronRight size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}