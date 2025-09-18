
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Trophy, Sparkles, AlertCircle, RefreshCw, TrendingUp, Clock, Calendar } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useTranslation } from '../constants/translations';
import ModernStatsCard from '../components/ui/ModernStatsCard';
import InsightCard from '../components/ui/InsightCard';
import WinnerAnnouncementCard from '../components/ui/WinnerAnnouncementCard';
import ModernHeader from '../components/ui/ModernHeader';
import EmptyDashboard from '../components/EmptyDashboard';
import ModernGroupCard from '../components/ui/ModernGroupCard';
import MemberDrawSpinner from '../components/MemberDrawSpinner';
import CreateBhishiFlow from '../components/CreateBhishiFlow';
import { getNextContributionDue, getNextLuckyDraw, formatDueDate, formatDrawDate } from '../utils/dateCalculations';
import { useNavigation } from '@react-navigation/native';
import { useChitStore } from '../stores/chitStore';
import { useAuthStore } from '../stores/authStore';
import { useBiddingStore } from '../stores/biddingStore';
import { supabase } from '../libs/supabase';
import { toast } from 'sonner-native';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { groups, createGroup, setCurrentGroup, fetchGroups, getRecentWinner, isDrawInProgress, isLoading, error, updatePaymentStatus } = useChitStore();
  const { user, profile, signOut } = useAuthStore();
  const { loadCurrentRound, loadUserBids } = useBiddingStore();
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [groupPaymentStatus, setGroupPaymentStatus] = useState<{[key: string]: string}>({});
  const [activeDraws, setActiveDraws] = useState<any[]>([]);
  const [recentWinners, setRecentWinners] = useState<any[]>([]);

  // Fetch payment status and recent winners when groups are loaded
  useEffect(() => {
    if (groups.length > 0 && user?.id) {
      fetchPaymentStatus();
      fetchRecentWinners();
      checkActiveDraws();
    }
  }, [groups.length, user?.id]);
  
  // Fetch recent winners for all groups
  const fetchRecentWinners = async () => {
    if (!user?.id || groups.length === 0) return;
    
    try {
      console.log('🎉 Fetching recent winners for', groups.length, 'groups');
      
      const winners = [];
      
      for (const group of groups) {
        const winner = await getRecentWinner(group.id);
        if (winner) {
          winners.push({
            ...winner,
            groupName: group.name
          });
        }
      }
      
      console.log('✅ Recent winners fetched:', winners.length);
      setRecentWinners(winners);
      
    } catch (error) {
      console.error('❌ Error fetching recent winners:', error);
    }
  };
  
  const checkActiveDraws = () => {
    if (groups.length === 0) return;
    
    const activeDrawsList = groups.filter(group => isDrawInProgress(group));
    console.log('🎲 Active draws found:', activeDrawsList.length);
    setActiveDraws(activeDrawsList);
  };
  
  // Real-time listener for lucky draw updates
  useEffect(() => {
    if (groups.length === 0) return;
    
    console.log('🔄 Setting up real-time listeners for', groups.length, 'groups');
    
    // Create channels for all user's groups
    const channels = groups.map(group => {
      const channel = supabase
        .channel(`group-draws-${group.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bhishi_groups',
            filter: `id=eq.${group.id}`,
          },
          async (payload) => {
            console.log('🎲 Real-time group update received:', payload);
            const updatedGroup = payload.new;
            
            // Check if draw_started_at was updated
            if (updatedGroup.draw_started_at) {
              console.log(`🎲 Draw started for group ${updatedGroup.name}!`);
              
              // Refresh groups to get updated data with draw_started_at
              await fetchGroups();
              
              // Refresh active draws to show new spinner
              setTimeout(() => {
                checkActiveDraws();
              }, 100);
            }
          }
        )
        .subscribe();
        
      return channel;
    });
    
    // Polling fallback for slow networks (every 5 seconds)
    const pollInterval = setInterval(() => {
      console.log('🔄 Polling fallback: Checking active draws');
      checkActiveDraws();
    }, 5000);
    
    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up real-time listeners and polling');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      clearInterval(pollInterval);
    };
  }, [groups.length]); // Re-setup when groups change
  
  const handleDrawSpinnerComplete = (groupId: string) => {
    console.log('⏰ Draw spinner completed for group:', groupId);
    // Remove from active draws
    setActiveDraws(prev => prev.filter(group => group.id !== groupId));
    // Refresh groups to get updated data
    handleRefresh();
  };

  const handleCreateBhishi = async (data: any) => {
    try {
      console.log('🚀 === STARTING GROUP CREATION FROM UI ===');
      console.log('📝 Form data received:', data);
      
      await createGroup({
        name: data.name,
        description: `Monthly contribution: ₹${data.monthlyAmount.toLocaleString()}`,
        monthlyAmount: data.monthlyAmount,
        totalMembers: 40, // Maximum allowed by database constraint
        drawDate: data.drawDay.toString(),
        groupType: data.groupType, // Include group type selection
        upiId: data.upiId // Include UPI ID for profile update
      });

      Alert.alert(t('success'), 'Bhishi created successfully!', [
        { text: t('ok'), onPress: () => setShowCreateFlow(false) }
      ]);
      toast.success('Bhishi created and saved to database!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create bhishi. Please try again.');
      console.error('Create bhishi error:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await fetchGroups();
      await fetchPaymentStatus();
      await fetchRecentWinners();
      checkActiveDraws();
      toast.success(t('refreshGroups'));
    } catch (error) {
      toast.error('Failed to refresh groups');
    }
  };

  const fetchPaymentStatus = async () => {
    if (!user?.id || groups.length === 0) return;
    
    try {
      console.log('📊 Fetching payment status for', groups.length, 'groups');
      
      const statusMap: {[key: string]: string} = {};
      
      for (const group of groups) {
        const { data: memberData, error } = await supabase
          .from('group_members')
          .select('contribution_status')
          .eq('group_id', group.id)
          .eq('user_id', user.id)
          .single();
          
        if (!error && memberData) {
          statusMap[group.id] = memberData.contribution_status || 'pending';
        } else {
          statusMap[group.id] = 'pending';
        }
      }
      
      console.log('✅ Payment status fetched:', statusMap);
      setGroupPaymentStatus(statusMap);
      
    } catch (error) {
      console.error('Error fetching payment status:', error);
    }
  };

  const handlePaymentStatusToggle = async (groupId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    
    try {
      await updatePaymentStatus(groupId, newStatus);
      
      // Update local state immediately for better UX
      setGroupPaymentStatus(prev => ({
        ...prev,
        [groupId]: newStatus
      }));
      
      toast.success(newStatus === 'paid' ? 'Payment marked as completed!' : 'Payment marked as pending');
      
    } catch (error) {
      toast.error('Failed to update payment status');
      console.error('Payment status toggle error:', error);
    }
  };

  // Check if we're in the 5-day payment window before draw date
  const isInPaymentWindow = (drawDay: string) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const drawDayNum = parseInt(drawDay);
    
    // Calculate this month's draw date
    let drawDate = new Date(currentYear, currentMonth, drawDayNum);
    
    // If draw day has passed this month, consider next month's draw
    if (drawDate < today) {
      drawDate = new Date(currentYear, currentMonth + 1, drawDayNum);
    }
    
    // Calculate payment window start (5 days before draw date)
    const paymentWindowStart = new Date(drawDate);
    paymentWindowStart.setDate(drawDate.getDate() - 5);
    
    // Payment window is from 5 days before until draw date
    const isInWindow = today >= paymentWindowStart && today <= drawDate;
    
    console.log(`🗓️ Payment Window Check for draw day ${drawDay}:`);
    console.log(`📅 Today: ${today.toDateString()}`);
    console.log(`🎯 Next Draw: ${drawDate.toDateString()}`);
    console.log(`⏰ Window Start: ${paymentWindowStart.toDateString()}`);
    console.log(`✅ In Window: ${isInWindow}`);
    
    return isInWindow;
  };

  const handlePayment = async (group: any) => {
    try {
      console.log('🏦 Starting payment for group:', group.name);
      
      // Get admin's UPI ID
      const { data: adminProfile, error } = await supabase
        .from('profiles')
        .select('upi_id, name')
        .eq('id', group.createdBy)
        .single();
        
      if (error || !adminProfile) {
        Alert.alert('Error', 'Could not find admin details for payment');
        return;
      }
      
      if (!adminProfile.upi_id) {
        Alert.alert(
          'Payment Not Available', 
          'The group admin has not set up their UPI ID yet. Please contact them to add their UPI ID.'
        );
        return;
      }
      
      // Create UPI payment URL
      const upiUrl = `upi://pay?pa=${adminProfile.upi_id}&pn=${encodeURIComponent(adminProfile.name || 'Group Admin')}&am=${group.monthlyAmount}&cu=INR&tn=${encodeURIComponent(`Payment for ${group.name} - Monthly Contribution`)}`;
      
      console.log('🔗 Opening UPI URL:', upiUrl);
      
      // Try to open UPI payment app
      const canOpen = await Linking.canOpenURL(upiUrl);
      
      if (canOpen) {
        await Linking.openURL(upiUrl);
        toast.success('Opening payment app...');
      } else {
        // Fallback: Show UPI ID for manual payment
        Alert.alert(
          'Payment Details',
          `UPI ID: ${adminProfile.upi_id}\nAmount: ₹${group.monthlyAmount.toLocaleString()}\nNote: Payment for ${group.name}\n\nPlease use any UPI app to make the payment.`,
          [
            { text: 'Copy UPI ID', onPress: () => {
              // Note: Clipboard functionality would need expo-clipboard
              toast.success('UPI ID details shown above');
            }},
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Failed to initiate payment. Please try again.');
    }
  };





  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
      <ModernHeader
        userName={profile?.name || user?.user_metadata?.name}
        onCreateGroup={() => setShowCreateFlow(true)}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />
      
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Active Draw Spinners */}
        {activeDraws.length > 0 && (
          <View>
            {activeDraws.map((group) => (
              <View key={group.id}>
                <MemberDrawSpinner
                  groupName={group.name}
                  visible={true}
                  onComplete={() => handleDrawSpinnerComplete(group.id)}
                />
              </View>
            ))}
          </View>
        )}

        {/* Winner Announcements with Section Title */}
        {recentWinners.length > 0 && (
          <View style={styles.announcementsSection}>
            <View style={styles.sectionHeader}>
              <Sparkles size={20} color={Colors.warning} />
              <Text style={styles.sectionHeaderTitle}>{t('recentWinners')}</Text>
            </View>
            <View style={styles.announcementsContainer}>
              {recentWinners.map((winner, index) => (
                <View key={`${winner.group_id}-${winner.id}`}>
                  <WinnerAnnouncementCard winner={winner} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Insights Section with Actionable Information */}
        {groups.length > 0 && (
          <View style={styles.statsSection}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color={Colors.primary} />
              <Text style={styles.sectionHeaderTitle}>{t('overview')}</Text>
            </View>
            <View style={styles.statsContainer}>
              {/* Active Groups Count */}
              <InsightCard
                icon={Users}
                title={t('activeGroups')}
                value={groups.filter(g => g.status === 'active').length.toString()}
                subtitle=""
                color={Colors.success}
                backgroundColor="#F0FDF4"
              />
              
              {/* Next Contribution Due */}
              {(() => {
                const nextDue = getNextContributionDue(groups, user?.id || '', groupPaymentStatus);
                return (
                  <InsightCard
                    icon={Clock}
                    title={t('nextContributionDue')}
                    value={nextDue ? `₹${nextDue.amount.toLocaleString()}` : t('noPaymentsDue')}
                    subtitle={nextDue ? formatDueDate(nextDue.dueDate) : ''}
                    color={Colors.warning}
                    backgroundColor="#FFF7ED"
                  />
                );
              })()}
              
              {/* Next Lucky Draw */}
              {(() => {
                const nextDraw = getNextLuckyDraw(groups);
                return (
                  <InsightCard
                    icon={Calendar}
                    title={t('nextLuckyDraw')}
                    value={nextDraw ? formatDrawDate(nextDraw.date) : t('noUpcomingDraws')}
                    subtitle={nextDraw ? nextDraw.groupName : ''}
                    color={Colors.primary}
                    backgroundColor="#EFF6FF"
                  />
                );
              })()}
            </View>
          </View>
        )}



        {/* Enhanced Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingContent}>
              <Text style={styles.loadingEmoji}>⏳</Text>
              <ActivityIndicator size="large" color={Colors.primary} style={styles.loadingSpinner} />
              <Text style={styles.loadingTitle}>{t('loadingGroups')}</Text>
              <Text style={styles.loadingSubtitle}>Getting your latest group updates...</Text>
            </View>
          </View>
        )}

        {/* Enhanced Error State */}
        {error && (
          <View style={[styles.errorCard, Colors.shadow]}>
            <View style={styles.errorHeader}>
              <AlertCircle size={24} color={Colors.error} />
              <Text style={styles.errorTitle}>{t('error')}</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <RefreshCw size={16} color={Colors.background} />
              <Text style={styles.retryButtonText}>{t('tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Groups List */}
        {!isLoading && !error && (
          <View style={styles.groupsContainer}>
            {groups.length === 0 ? (
              <EmptyDashboard 
                onCreateGroup={() => setShowCreateFlow(true)}
                userName={user?.user_metadata?.name}
              />
            ) : (
              <View>
                {/* Enhanced Groups Section Header */}
                <View style={styles.groupsSectionHeader}>
                  <View style={styles.sectionHeader}>
                    <Users size={20} color={Colors.primary} />
                    <Text style={styles.sectionHeaderTitle}>{t('yourGroups')}</Text>
                  </View>
                  <Text style={styles.sectionSubtitle}>Manage your active and completed groups</Text>
                </View>
                
                {groups.map((group) => (
                  <View key={group.id}>
                    <ModernGroupCard
                      group={group}
                      paymentStatus={groupPaymentStatus[group.id] || 'pending'}
                      isAdmin={user?.id === group.createdBy}
                      isInPaymentWindow={isInPaymentWindow(group.drawDay)}
                      onPress={() => {
                      setCurrentGroup(group);
                      // Navigate to appropriate screen based on group type
                        if (group.groupType === 'bidding') {
                                                  navigation.navigate('BiddingGroupDetail' as never, { groupId: group.id } as never);
                                                } else {
                                                  navigation.navigate('GroupDetail' as never);
                                                }
                                              }}
                      onPayment={() => handlePayment(group)}
                      onTogglePaymentStatus={() => handlePaymentStatusToggle(group.id, groupPaymentStatus[group.id] || 'pending')}
                      // Bidding-related props (will be handled by BiddingGroupCard internally)
                      currentRound={undefined}
                      userHasBid={false}
                      userBidAmount={undefined}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Bhishi Flow */}
      <CreateBhishiFlow
        visible={showCreateFlow}
        onClose={() => setShowCreateFlow(false)}
        onComplete={handleCreateBhishi}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  // Enhanced Section Styles
  statsSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 16,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  
  // Groups Section
  groupsContainer: {
    paddingHorizontal: 20,
  },
  groupsSectionHeader: {
    marginBottom: 20,
  },
  
  // Winner Announcements
  announcementsSection: {
    marginBottom: 32,
  },
  announcementsContainer: {
    paddingHorizontal: 20,
  },
  
  // Enhanced Loading State
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  loadingContent: {
    alignItems: 'center',
    maxWidth: 280,
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Enhanced Error State
  errorCard: {
    backgroundColor: Colors.card,
    padding: 24,
    borderRadius: 16,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.error,
  },
  errorText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    maxWidth: 280,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
