
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Plus, Calendar, IndianRupee, Trophy, RefreshCw, CreditCard, Check, CheckCircle, TestTube } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useChitStore } from '../stores/chitStore';
import { useAuthStore } from '../stores/authStore';
import { ChitGroup } from '../types/chitFund';
import { format } from 'date-fns';
import MemberDrawSpinner from '../components/MemberDrawSpinner';
import { toast } from 'sonner-native';
import CreateBhishiFlow from '../components/CreateBhishiFlow';
import BhishiSuccessModal from '../components/BhishiSuccessModal';
import EmptyDashboard from '../components/EmptyDashboard';
import BhishiNamesSection from '../components/BhishiNamesSection';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../libs/supabase';
import { CashfreeService } from '../services/cashfreeService';

export default function DashboardTestingScreen() {
  const navigation = useNavigation();
  const { groups, createGroup, setCurrentGroup, fetchGroups, getRecentWinner, isDrawInProgress, isLoading, error, updatePaymentStatus } = useChitStore();
  const { user, profile, signOut } = useAuthStore();
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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
      totalMembers: 12, // Maximum allowed by database constraint
      drawDate: data.drawDay.toString()
      });

      setShowCreateFlow(false);
      setShowSuccessModal(true);
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
      toast.success('Groups refreshed!');
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

  const handleCashfreePayment = async (group: any) => {
    try {
      console.log('💳 Starting Cashfree payment for group:', group.name);
      
      // Debug: Log current user and profile data
      console.log('🔍 Debug - Current user data:', {
        userId: user?.id,
        userEmail: user?.email,
        userPhone: user?.phone,
        userMetadata: user?.user_metadata
      });
      
      console.log('🔍 Debug - Current profile data:', {
        profileId: profile?.id,
        profileName: profile?.name,
        profilePhone: profile?.phone,
        profileEmail: profile?.email
      });
      
      // Get customer details
      const customerName = CashfreeService.getCustomerName(user, profile);
      const customerPhone = CashfreeService.getCustomerPhone(user, profile);
      
      console.log('🔍 Debug - Extracted customer details:', {
        customerName,
        customerPhone,
        phoneLength: customerPhone?.length,
        phoneValid: /^[6-9]\d{9}$/.test(customerPhone || '')
      });
      
      // Validate customer details
      if (!customerPhone) {
        Alert.alert(
          'Phone Number Required',
          'Please add your phone number in your profile to make payments.',
          [
            { text: 'OK' }
          ]
        );
        return;
      }
      
      // Validate payment request
      const validationError = CashfreeService.validatePaymentRequest({
        name: customerName,
        phone: customerPhone,
        amount: group.monthlyAmount,
        groupId: group.id,
        groupName: group.name,
        userId: user?.id || '' // Add current user ID for validation
      });
      
      if (validationError) {
        Alert.alert('Validation Error', validationError);
        return;
      }
      
      // Show loading toast
      toast.loading('Creating payment link...');
      
      // Create payment with Cashfree
      const paymentResponse = await CashfreeService.createPayment({
        phone: customerPhone,
        name: customerName,
        amount: group.monthlyAmount,
        groupId: group.id,
        groupName: group.name,
        userId: user?.id || '' // Add current user ID for payment mapping
      });
      
      // Hide loading toast
      toast.dismiss();
      
      console.log('📝 Payment response received:', {
        paymentResponse,
        hasResponse: !!paymentResponse,
        responseType: typeof paymentResponse,
        responseKeys: paymentResponse ? Object.keys(paymentResponse) : 'no response'
      });
      
      if (!paymentResponse || !paymentResponse.success) {
        const errorMsg = paymentResponse?.error || 'Failed to create payment. Please try again.';
        const errorDetails = paymentResponse?.details || 'No additional details';
        
        console.error('❌ Payment failed with details:', {
          error: errorMsg,
          details: errorDetails,
          fullResponse: paymentResponse
        });
        
        Alert.alert(
          'Payment Error', 
          `${errorMsg}\n\nDetails: ${errorDetails}`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      console.log('✅ Payment link created:', paymentResponse.payment_link);
      
      // Open payment link
      const canOpen = await Linking.canOpenURL(paymentResponse.payment_link);
      
      if (canOpen) {
        await Linking.openURL(paymentResponse.payment_link);
        toast.success('Opening Cashfree payment...');
      } else {
        // Fallback: Show payment details
        Alert.alert(
          'Payment Link Created',
          `Order ID: ${paymentResponse.order_id}\nAmount: ${CashfreeService.formatAmount(paymentResponse.amount)}\n\nPlease copy the payment link to complete your payment.`,
          [
            { text: 'Copy Link', onPress: () => {
              // Note: Would need expo-clipboard for actual copying
              toast.success('Payment link: ' + paymentResponse.payment_link);
            }},
            { text: 'OK' }
          ]
        );
      }
      
    } catch (error) {
      toast.dismiss(); // Hide any loading toasts
      console.error('Cashfree payment error:', error);
      Alert.alert('Payment Error', 'Failed to initiate payment. Please try again.');
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'forming': return Colors.warning;
      case 'active': return Colors.success;
      case 'completed': return Colors.textSecondary;
      default: return Colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'forming': return 'Forming';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Fixed outside ScrollView */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Dashboard Testing</Text>
            <View style={styles.testingBadge}>
              <TestTube size={16} color={Colors.warning} />
              <Text style={styles.testingText}>TESTING</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>🧪 Cashfree Payment Gateway Testing Environment</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowCreateFlow(true)}
          >
            <Plus size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Active Draw Spinners */}
        {activeDraws.length > 0 && (
        <>
        {activeDraws.map((group) => (
        <MemberDrawSpinner
        key={group.id}
        groupName={group.name}
        visible={true}
        onComplete={() => handleDrawSpinnerComplete(group.id)}
        />
        ))}
        </>
        )}

        {/* Winner Announcements */}
        {recentWinners.length > 0 && (
          <View style={styles.announcementsContainer}>
            {recentWinners.map((winner, index) => (
              <View key={`${winner.group_id}-${winner.id}`} style={[styles.winnerAnnouncementCard, Colors.shadow]}>
                <View style={styles.announcementRow}>
                  <View style={styles.announcementIconWrapper}>
                    <Trophy size={24} color={Colors.warning} />
                  </View>
                  <View style={styles.announcementTextContainer}>
                    <Text style={styles.announcementTitleText}>🎉 Congratulations!</Text>
                    <Text style={styles.announcementMessageText}>
                      <Text style={styles.winnerNameHighlight}>{winner.winner_name}</Text> won ₹{winner.amount.toLocaleString()} in {winner.groupName}!
                    </Text>
                    <Text style={styles.announcementTimeText}>
                      {new Date(winner.draw_date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View style={styles.celebrationIconWrapper}>
                    <Text style={styles.celebrationEmojiText}>🎆</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, Colors.shadow]}>
            <Users size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>{groups.length}</Text>
            <Text style={styles.statLabel}>Total Groups</Text>
          </View>
          <View style={[styles.statCard, Colors.shadow]}>
            <Trophy size={24} color={Colors.success} />
            <Text style={styles.statNumber}>
              {groups.filter(g => g.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active Groups</Text>
          </View>
        </View>



        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading your groups...</Text>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={[styles.errorCard, Colors.shadow]}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
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
                {/* Educational Section for existing users - moved above Your Groups heading */}
                <BhishiNamesSection title="What do you call it in your state?" />
                
                {/* Your Groups heading - only show when user has groups */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Your Groups</Text>
                
                {groups.map((group) => (
                  <View key={group.id} style={[styles.groupCard, Colors.shadow]}>
                <TouchableOpacity
                  style={styles.groupCardContent}
                  onPress={() => {
                    setCurrentGroup(group);
                    navigation.navigate('GroupDetail' as never);
                  }}
                >
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(group.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(group.status) }]}>
                        {getStatusText(group.status)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.groupDescription}>{group.description}</Text>
                  
                  <View style={styles.groupDetails}>
                    <View style={styles.detailItem}>
                      <IndianRupee size={16} color={Colors.money} />
                      <Text style={styles.detailText}>₹{group.monthlyAmount.toLocaleString()}/month</Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <Users size={16} color={Colors.primary} />
                      <Text style={styles.detailText}>{group.currentMembers}/40 members</Text>
                    </View>
                    
                    {group.status === 'active' && (
                      <View style={styles.detailItem}>
                        <Calendar size={16} color={Colors.warning} />
                        <Text style={styles.detailText}>Next: {format(new Date(group.nextDrawDate), 'MMM dd')}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                
                {/* Payment Section - Show for all members in active groups during payment window */}
                {group.status === 'active' && 
                 isInPaymentWindow(group.drawDay) && (
                  <View style={styles.groupActions}>
                    {/* Payment Status Toggle - Show for all members */}
                    <TouchableOpacity
                      style={[
                        styles.paymentStatusToggle,
                        groupPaymentStatus[group.id] === 'paid' && styles.paymentStatusPaid
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handlePaymentStatusToggle(group.id, groupPaymentStatus[group.id] || 'pending');
                      }}
                    >
                      {groupPaymentStatus[group.id] === 'paid' ? (
                        <CheckCircle size={20} color={Colors.success} />
                      ) : (
                        <View style={styles.uncheckedCircle} />
                      )}
                      <Text style={[
                        styles.paymentStatusText,
                        groupPaymentStatus[group.id] === 'paid' && styles.paymentStatusTextPaid
                      ]}>
                        {groupPaymentStatus[group.id] === 'paid' ? 'Payment Completed' : 'Mark as Paid'}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Cashfree Payment Button - Only show for non-admin members if not paid */}
                    {user?.id !== group.createdBy && groupPaymentStatus[group.id] !== 'paid' && (
                      <TouchableOpacity
                        style={styles.cashfreePaymentButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCashfreePayment(group);
                        }}
                      >
                        <CreditCard size={18} color={Colors.background} />
                        <Text style={styles.cashfreePaymentButtonText}>Pay with Cashfree ₹{group.monthlyAmount.toLocaleString()}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                {/* Payment Window Info - Show when outside payment window for all members */}
                {group.status === 'active' && 
                 !isInPaymentWindow(group.drawDay) && (
                  <View style={styles.paymentWindowInfo}>
                    <Calendar size={16} color={Colors.textSecondary} />
                    <Text style={styles.paymentWindowText}>
                      Payment window opens 5 days before draw date
                    </Text>
                  </View>
                )}
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

              {/* Success Modal */}
              <BhishiSuccessModal
                visible={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                userName={profile?.name || user?.user_metadata?.name || 'Aapke dost'}
              />
            </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  testingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
    gap: 4,
  },
  testingText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  groupsContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },

  groupCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  groupCardContent: {
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  groupDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  groupDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  errorCard: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  groupActions: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background + '50',
  },
  paymentButton: {
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  paymentButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  cashfreePaymentButton: {
    backgroundColor: '#FF6B35', // Cashfree brand color
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  cashfreePaymentButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  paymentStatusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    marginBottom: 8,
    gap: 8,
  },
  paymentStatusPaid: {
    backgroundColor: Colors.success + '20',
  },
  paymentStatusText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  paymentStatusTextPaid: {
    color: Colors.success,
    fontWeight: '600',
  },
  uncheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
    backgroundColor: 'transparent',
  },
  paymentWindowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  paymentWindowText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  // Winner Announcement Styles
  activeDrawsContainer: {
    marginTop: 8,
  },
  announcementsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  winnerAnnouncementCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    overflow: 'hidden',
  },
  announcementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  announcementIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  announcementTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  announcementTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  announcementMessageText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },
  winnerNameHighlight: {
    fontWeight: '600',
    color: Colors.primary,
  },
  announcementTimeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    opacity: 0.8,
  },
  celebrationIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  celebrationEmojiText: {
    fontSize: 24,
  },

});
