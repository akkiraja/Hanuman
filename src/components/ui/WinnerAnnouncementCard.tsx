import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trophy, Sparkles } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useTranslation } from '../../constants/translations';

interface WinnerAnnouncementCardProps {
  winner: {
    id: string;
    winner_name: string;
    amount: number;
    groupName: string;
    draw_date: string;
    group_id: string;
  };
}

export default function WinnerAnnouncementCard({ winner }: WinnerAnnouncementCardProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.card, Colors.shadow]}>
      <View style={styles.content}>
        <View style={styles.iconSection}>
          <View style={styles.iconWrapper}>
            <Trophy size={26} color={Colors.warning} />
          </View>
          <View style={styles.sparkleWrapper}>
            <Sparkles size={16} color={Colors.warning} />
          </View>
        </View>
        
        <View style={styles.textSection}>
          <Text style={styles.title}>🎉 {t('congratulations')}!</Text>
          <Text style={styles.message}>
            <Text style={styles.winnerName}>{winner.winner_name}</Text> {t('wonAmount')} ₹{winner.amount.toLocaleString()} in {winner.groupName}!
          </Text>
          <Text style={styles.timestamp}>
            {new Date(winner.draw_date).toLocaleDateString('en-IN', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    marginBottom: 16,
    borderLeftWidth: 5,
    borderLeftColor: Colors.warning,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    padding: 24,
    alignItems: 'center',
  },
  iconSection: {
    alignItems: 'center',
    marginRight: 20,
    position: 'relative',
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.warning + '30',
  },
  sparkleWrapper: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSection: {
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  winnerName: {
    fontWeight: '700',
    color: Colors.primary,
    fontSize: 16,
  },
  timestamp: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    opacity: 0.9,
  },
});