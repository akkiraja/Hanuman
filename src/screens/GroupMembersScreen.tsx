import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import { ArrowLeft, Search, Users, Crown, UserPlus, Phone, Mail, Clock } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useChitStore } from '../stores/chitStore';
import { useAuthStore } from '../stores/authStore';
import { Colors } from '../constants/colors';
import { createStyles } from '../styles/groupMembersScreenStyles';

type GroupMembersScreenProps = {
  navigation: any;
  route: {
    params: {
      groupId: string;
      groupName: string;
    };
  };
};

export default function GroupMembersScreen({ navigation, route }: GroupMembersScreenProps) {
  const { groupId, groupName } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);
  
  const { currentGroup, loadGroupDetails } = useChitStore();
  const { user } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  
  useEffect(() => {
    loadGroupData();
  }, [groupId]);
  
  const loadGroupData = async () => {
    try {
      setIsLoading(true);
      await loadGroupDetails(groupId);
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('Error', 'Failed to load group members');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (currentGroup?.members) {
      setMembers(currentGroup.members);
    }
  }, [currentGroup]);
  
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.phone && member.phone.includes(searchQuery)) ||
    (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const isAdmin = user?.id === currentGroup?.createdBy;
  
  const renderMemberItem = (member: any, index: number) => {
    const isCreator = member.user_id === currentGroup?.createdBy;
    const hasWon = member.hasWon || false;
    const isPending = member.status === 'pending';
    
    return (
      <View key={member.id || index} style={[
        styles.memberItem,
        hasWon && styles.winnerMemberItem,
        isCreator && styles.creatorMemberItem,
        isPending && styles.pendingMemberItem
      ]}>
        <View style={styles.memberInfo}>
          <View style={styles.memberHeader}>
            <Text style={styles.memberName}>{member.name}</Text>
            <View style={styles.memberBadges}>
              {isCreator && (
                <View style={styles.creatorBadge}>
                  <Crown size={12} color={Colors.warning} />
                  <Text style={styles.badgeText}>Admin</Text>
                </View>
              )}
              {hasWon && (
                <View style={styles.winnerBadge}>
                  <Crown size={12} color={Colors.success} />
                  <Text style={styles.winnerBadgeText}>Winner</Text>
                </View>
              )}
              {isPending && (
                <View style={styles.pendingBadge}>
                  <Clock size={12} color={Colors.warning} />
                  <Text style={styles.pendingBadgeText}>Pending Invite</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.memberDetails}>
            {member.phone && (
              <View style={styles.contactDetail}>
                <Phone size={14} color={Colors.textSecondary} />
                <Text style={styles.contactText}>{member.phone}</Text>
              </View>
            )}
            {member.email && (
              <View style={styles.contactDetail}>
                <Mail size={14} color={Colors.textSecondary} />
                <Text style={styles.contactText}>{member.email}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.memberStats}>
            <Text style={styles.memberStatsText}>
              Joined {new Date(member.joinedAt || Date.now()).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Users size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>No Members Found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery ? 'No members match your search criteria' : 'This group has no members yet'}
      </Text>
    </View>
  );
  
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.loadingItem}>
          <View style={styles.loadingAvatar} />
          <View style={styles.loadingContent}>
            <View style={styles.loadingName} />
            <View style={styles.loadingContact} />
            <View style={styles.loadingStats} />
          </View>
        </View>
      ))}
    </View>
  );
  
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
            <Text style={styles.headerTitle}>Group Members</Text>
            <Text style={styles.headerSubtitle}>{groupName}</Text>
          </View>
          
          <View style={styles.memberCount}>
            <Users size={20} color={Colors.primary} />
            <Text style={styles.memberCountText}>{filteredMembers.length}</Text>
          </View>
        </View>
      </BlurView>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members by name, phone, or email..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      
      {/* Members List */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          renderLoadingState()
        ) : filteredMembers.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.membersList}>
            <View style={styles.membersHeader}>
              <Text style={styles.membersTitle}>
                {searchQuery ? `${filteredMembers.length} members found` : `All Members (${filteredMembers.length})`}
              </Text>
            </View>
            
            {filteredMembers.map((member, index) => renderMemberItem(member, index))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}