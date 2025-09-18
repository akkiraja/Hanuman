import { supabase } from '../libs/supabase';

/**
 * Trigger payment reminder notifications for a specific group
 */
export async function triggerPaymentReminder(groupId: string): Promise<boolean> {
  try {
    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('bhishi_groups')
      .select('name, monthly_amount, draw_date')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      console.error('Error fetching group for payment reminder:', groupError);
      return false;
    }

    // Call the edge function to send notifications
    const { data, error } = await supabase.functions.invoke('send-notifications', {
      body: {
        type: 'payment_reminder',
        data: {
          groupId,
          groupName: group.name,
          amount: group.monthly_amount,
          drawDate: group.draw_date,
        },
      },
    });

    if (error) {
      console.error('Error sending payment reminder:', error);
      return false;
    }

    console.log('Payment reminder sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in triggerPaymentReminder:', error);
    return false;
  }
}

/**
 * Send a custom notification to a specific user
 */
export async function sendCustomNotification(
  userId: string,
  title: string,
  body: string,
  data?: any
): Promise<boolean> {
  try {
    // Get user's push token
    const { data: pushTokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (tokenError || !pushTokens || pushTokens.length === 0) {
      console.error('No push tokens found for user:', userId);
      return false;
    }

    // Send notification to all user's devices
    for (const tokenData of pushTokens) {
      const { error } = await supabase.functions.invoke('send-notifications', {
        body: {
          type: 'single_notification',
          data: {
            to: tokenData.token,
            title,
            body,
            data,
          },
        },
      });

      if (error) {
        console.error('Error sending custom notification:', error);
      }
    }

    return true;
  } catch (error) {
    console.error('Error in sendCustomNotification:', error);
    return false;
  }
}

/**
 * Check if payment reminders should be sent for all active groups
 * This function can be called manually or scheduled
 */
export async function checkAndSendPaymentReminders(): Promise<void> {
  try {
    // Get all active groups with draw dates in the next 3 days (3, 2, 1 days prior)
    const today = new Date();
    const reminderDates = [];
    
    // Create array of dates: 1, 2, 3 days from today
    for (let i = 1; i <= 3; i++) {
      const reminderDate = new Date(today);
      reminderDate.setDate(today.getDate() + i);
      reminderDates.push(reminderDate.toISOString().split('T')[0]); // YYYY-MM-DD format
    }

    console.log('🔍 Checking for payment reminders on dates:', reminderDates);

    const { data: groups, error: groupsError } = await supabase
      .from('bhishi_groups')
      .select('id, name, draw_date')
      .eq('status', 'active')
      .in('draw_date', reminderDates);

    if (groupsError) {
      console.error('Error fetching groups for payment reminders:', groupsError);
      return;
    }

    if (!groups || groups.length === 0) {
      console.log('No groups with draw dates in the next 3 days');
      return;
    }

    console.log(`📬 Found ${groups.length} groups with upcoming draw dates`);

    // Send payment reminders for each group
    for (const group of groups) {
      // Calculate days until draw
      const drawDate = new Date(group.draw_date);
      const daysUntilDraw = Math.ceil((drawDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`📅 Group "${group.name}" - Draw in ${daysUntilDraw} days`);
      
      const success = await triggerPaymentReminder(group.id);
      if (success) {
        console.log(`✅ Payment reminder sent for group: ${group.name}`);
      } else {
        console.error(`❌ Failed to send payment reminder for group: ${group.name}`);
      }
    }
  } catch (error) {
    console.error('Error in checkAndSendPaymentReminders:', error);
  }
}

/**
 * Notification types for different events
 */
export const NOTIFICATION_TYPES = {
  PAYMENT_REMINDER: 'payment_reminder',
  PAYMENT_MARKED_DONE: 'payment_marked_done',
  DRAW_COMPLETED: 'draw_completed',
  WINNER_ANNOUNCED: 'winner_announced',
  GROUP_JOINED: 'group_joined',
  GROUP_FULL: 'group_full',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

/**
 * Send notification to all group members when someone marks payment as done
 */
export async function notifyPaymentMarkedDone(
  groupId: string,
  payerName: string,
  groupName: string,
  amount?: number
): Promise<boolean> {
  try {
    console.log('📢 Sending payment marked done notification for group:', groupId);
    
    // Get all group members except the payer
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id, name')
      .eq('group_id', groupId);

    if (membersError || !members || members.length === 0) {
      console.error('No group members found:', membersError);
      return false;
    }

    // Get push tokens for all members
    const userIds = members.map(m => m.user_id);
    const { data: pushTokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    if (tokensError || !pushTokens || pushTokens.length === 0) {
      console.error('No push tokens found for group members:', tokensError);
      return false;
    }

    // Send notification via dedicated payment_marked_done endpoint
    const { data, error } = await supabase.functions.invoke('send-notifications', {
      body: {
        type: 'payment_marked_done',
        data: {
          groupId,
          payerName,
          groupName,
          amount: amount || 0,
        },
      },
    });

    if (error) {
      console.error('Error sending payment marked done notification:', error);
      return false;
    }

    console.log('✅ Payment marked done notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error in notifyPaymentMarkedDone:', error);
    return false;
  }
}

/**
 * Send notification to all group members when draw is conducted
 */
export async function notifyDrawConducted(
  groupId: string,
  groupName: string
): Promise<boolean> {
  try {
    console.log('📢 Sending draw conducted notification for group:', groupId);
    
    // Get all group members
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (membersError || !members || members.length === 0) {
      console.error('No group members found:', membersError);
      return false;
    }

    // Get push tokens for all members
    const userIds = members.map(m => m.user_id);
    const { data: pushTokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', userIds);

    if (tokensError || !pushTokens || pushTokens.length === 0) {
      console.error('No push tokens found for group members:', tokensError);
      return false;
    }

    // Send notification via dedicated draw_completed endpoint
    const { data, error } = await supabase.functions.invoke('send-notifications', {
      body: {
        type: 'draw_completed',
        data: {
          groupId,
          groupName,
        },
      },
    });

    if (error) {
      console.error('Error sending draw conducted notification:', error);
      return false;
    }

    console.log('✅ Draw conducted notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error in notifyDrawConducted:', error);
    return false;
  }
}

/**
 * Send notification to all group members when winner is announced
 */
export async function notifyWinnerAnnounced(
  groupId: string,
  groupName: string,
  winnerName: string,
  amount: number
): Promise<boolean> {
  try {
    console.log('📢 Sending winner announced notification for group:', groupId);
    
    // Get all group members
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (membersError || !members || members.length === 0) {
      console.error('No group members found:', membersError);
      return false;
    }

    // Get push tokens for all members
    const userIds = members.map(m => m.user_id);
    const { data: pushTokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', userIds);

    if (tokensError || !pushTokens || pushTokens.length === 0) {
      console.error('No push tokens found for group members:', tokensError);
      return false;
    }

    // Send notification via edge function
    const { data, error } = await supabase.functions.invoke('send-notifications', {
      body: {
        type: 'group_notification',
        data: {
          tokens: pushTokens.map(t => t.token),
          title: `🏆 Winner: ${winnerName}!`,
          body: `🎊 Congrats! ${winnerName} has won today's draw in **"${groupName}"**.
Amount: ₹${amount.toLocaleString()} 🎁
Tap to send wishes!`,
          data: {
            type: 'winner_announced',
            groupId,
            groupName,
            winnerName,
            amount,
          },
        },
      },
    });

    if (error) {
      console.error('Error sending winner announced notification:', error);
      return false;
    }

    console.log('✅ Winner announced notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error in notifyWinnerAnnounced:', error);
    return false;
  }
}

/**
 * Send lucky draw notification to all group members using dedicated endpoint
 * This replaces the separate notifyDrawConducted and notifyWinnerAnnounced calls
 */
export async function sendLuckyDrawNotification(groupId: string, winnerId: string): Promise<boolean> {
  try {
    console.log(`🎲 Sending lucky draw notification for group: ${groupId}, winner: ${winnerId}`);
    
    // Call the dedicated lucky_draw endpoint
    const { data, error } = await supabase.functions.invoke('send-notifications', {
      body: {
        type: 'lucky_draw',
        data: {
          groupId,
          winnerId,
        },
      },
    });

    if (error) {
      console.error('Error sending lucky draw notification:', error);
      return false;
    }

    console.log('Lucky draw notification sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in sendLuckyDrawNotification:', error);
    return false;
  }
}

/**
 * Send group joined notification to new member when added to group
 */
export async function notifyGroupJoined(
  groupId: string,
  groupName: string,
  newMemberName: string,
  newMemberId: string
): Promise<boolean> {
  try {
    console.log(`👥 Sending group joined notification for new member: ${newMemberName} in group: ${groupId}`);
    
    // Call the dedicated group_joined endpoint
    const { data, error } = await supabase.functions.invoke('send-notifications', {
      body: {
        type: 'group_joined',
        data: {
          groupId,
          groupName,
          newMemberName,
          newMemberId,
        },
      },
    });

    if (error) {
      console.error('Error sending group joined notification:', error);
      return false;
    }

    console.log('Group joined notification sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in notifyGroupJoined:', error);
    return false;
  }
}