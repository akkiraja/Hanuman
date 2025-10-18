import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Users, Crown, Shield, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { createStyles } from '../../styles/membersPreviewSectionStyles';
import { ChitGroup } from '../../types/chitFund';
import { isGroupAdmin } from '../../utils/adminHelpers';

type Member = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  user_id?: string;
  hasWon?: boolean;
  isCreator?: boolean;
  joinedAt?: string;
};

type MembersPreviewSectionProps = {
  members: Member[];
  totalCount: number;
  onViewAll: () => void;
  isAdmin?: boolean;
  currentGroup: ChitGroup | null;
};

export default function MembersPreviewSection({ 
  members, 
  totalCount, 
  onViewAll,
  isAdmin = false,
  currentGroup 
}: MembersPreviewSectionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);
  
  // Show only first 3-4 members for preview
  const previewMembers = members.slice(0, 4);
  const remainingCount = Math.max(0, totalCount - previewMembers.length);
  
  const renderMemberPreview = (member: Member, index: number) => {
    // Use isGroupAdmin helper to check if member is admin (creator OR co-admin)
    const isMemberAdmin = isGroupAdmin(member.user_id, currentGroup);
    const hasWon = member.hasWon || false;
    
    return (
      <View key={member.id || index} style={[
        styles.memberPreviewItem,
        hasWon && styles.winnerMemberItem,
        isMemberAdmin && styles.creatorMemberItem,
        { marginBottom: 8 }
      ]}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.name}
          </Text>
          <View style={styles.memberBadges}>
            {isMemberAdmin && (
              <View style={styles.creatorBadge}>
                <Shield size={10} color={Colors.primary} />
                <Text style={styles.badgeText}>Admin</Text>
              </View>
            )}
            {hasWon && (
              <View style={styles.winnerBadge}>
                <Crown size={10} color={Colors.success} />
                <Text style={styles.winnerBadgeText}>Winner</Text>
              </View>
            )}
          </View>
        </View>
        
        {member.phone && (
          <Text style={styles.memberContact} numberOfLines={1}>
            {member.phone}
          </Text>
        )}
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Users size={20} color={Colors.primary} />
          <Text style={[styles.title, { marginLeft: 8 }]}>Group Members</Text>
        </View>
        <View style={styles.memberCount}>
          <Text style={styles.memberCountText}>{totalCount}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        {previewMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={32} color={Colors.textSecondary} />
            <Text style={styles.emptyStateText}>No members yet</Text>
          </View>
        ) : (
          <>
            <View style={[styles.membersList, { marginBottom: 12 }]}>
              {previewMembers.map((member, index) => renderMemberPreview(member, index))}
            </View>
            
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={onViewAll}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>
                {remainingCount > 0 ? `View All ${totalCount} Members` : `View Members (${totalCount})`}
              </Text>
              <ChevronRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}