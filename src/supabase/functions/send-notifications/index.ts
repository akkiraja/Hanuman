// @verify_jwt: true
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: any;
}

interface PaymentReminderData {
  groupId: string;
  groupName: string;
  amount: number;
  drawDate: string;
  daysUntilDraw?: number;
}

interface LuckyDrawData {
  groupId: string;
  winnerId: string;
}

interface PaymentMarkedDoneData {
  groupId: string;
  payerName: string;
  groupName: string;
  amount: number;
}

interface DrawCompletedData {
  groupId: string;
  groupName: string;
}

interface GroupJoinedData {
  groupId: string;
  groupName: string;
  newMemberName: string;
  newMemberId: string;
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, data } = await req.json();

    if (type === 'payment_reminder') {
      return await sendPaymentReminders(supabaseClient, data);
    } else if (type === 'single_notification') {
      return await sendSingleNotification(data);
    } else if (type === 'group_notification') {
      return await sendGroupNotification(data);
    } else if (type === 'lucky_draw') {
      return await sendLuckyDrawNotifications(supabaseClient, data);
    } else if (type === 'payment_marked_done') {
      return await sendPaymentMarkedDoneNotifications(supabaseClient, data);
    } else if (type === 'draw_completed') {
      return await sendDrawCompletedNotifications(supabaseClient, data);
    } else if (type === 'group_joined') {
      return await sendGroupJoinedNotifications(supabaseClient, data);
    } else {
      return new Response('Invalid notification type', { status: 400 });
    }
  } catch (error) {
    console.error('Error in send-notifications function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Send payment reminder notifications to group members
 */
async function sendPaymentReminders(supabaseClient: any, data: PaymentReminderData) {
  try {
    const { groupId, groupName, amount, drawDate, daysUntilDraw } = data;

    // Get all group members who haven't paid yet
    console.log(`🔍 Looking for pending members in group: ${groupId}`);
    const { data: members, error: membersError } = await supabaseClient
      .from('group_members')
      .select(`
        user_id,
        name,
        contribution_status,
        profiles!inner(id)
      `)
      .eq('group_id', groupId)
      .eq('contribution_status', 'pending');
    
    console.log(`📊 Found ${members?.length || 0} pending members:`, members?.map(m => ({ name: m.name, user_id: m.user_id })));

    if (membersError) {
      throw new Error(`Failed to fetch group members: ${membersError.message}`);
    }

    if (!members || members.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending members found for payment reminders' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get push tokens for these users
    const userIds = members.map(member => member.user_id);
    console.log(`🔑 Looking for push tokens for user IDs:`, userIds);
    const { data: pushTokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds);
    
    console.log(`📱 Found ${pushTokens?.length || 0} push tokens:`, pushTokens?.map(t => ({ user_id: t.user_id, token: t.token.substring(0, 20) + '...' })));

    if (tokensError) {
      throw new Error(`Failed to fetch push tokens: ${tokensError.message}`);
    }

    if (!pushTokens || pushTokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push tokens found for group members' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification messages
    console.log(`🔄 Creating notifications for ${pushTokens.length} push tokens...`);
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => {
      const member = members.find(m => m.user_id === tokenData.user_id);
      console.log(`👤 Creating notification for member: ${member?.name} (${member?.user_id}) with token: ${tokenData.token.substring(0, 20)}...`);
      
      // Create urgency-based message based on days until draw
      const daysText = daysUntilDraw ? `${daysUntilDraw} day${daysUntilDraw > 1 ? 's' : ''}` : 'soon';
      const urgencyEmoji = daysUntilDraw === 1 ? '⚠️' : daysUntilDraw === 2 ? '🔔' : '📅';
      
      const notification = {
        to: tokenData.token,
        title: `💸 Payment Due – ₹${amount}`,
        body: `Hey ${member?.name}! You owe ₹${amount} for **"${groupName}"**.
${urgencyEmoji} Draw in ${daysText}: ${new Date(drawDate).toLocaleDateString()}
Tap to pay now.`,
        data: {
          type: 'payment_reminder',
          groupId,
          groupName,
          amount,
          drawDate,
          daysUntilDraw,
        },
      };
      
      console.log(`📧 Notification created: "${notification.title}" for ${member?.name}`);
      return notification;
    });
    
    console.log(`📤 About to send ${notifications.length} notifications via Expo Push API...`);

    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.length} payment reminder notifications`,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending payment reminders:', error);
    throw error;
  }
}

/**
 * Send a single notification
 */
async function sendSingleNotification(payload: NotificationPayload) {
  try {
    const results = await sendExpoPushNotifications([payload]);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification sent successfully',
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending single notification:', error);
    throw error;
  }
}

/**
 * Send lucky draw notifications to all group members
 */
async function sendLuckyDrawNotifications(supabaseClient: any, data: LuckyDrawData) {
  try {
    const { groupId, winnerId } = data;
    console.log(`🎲 Sending lucky draw notifications for group: ${groupId}, winner: ${winnerId}`);

    // Get group details
    const { data: group, error: groupError } = await supabaseClient
      .from('bhishi_groups')
      .select('name, monthly_amount, current_members')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      throw new Error(`Failed to fetch group details: ${groupError?.message}`);
    }

    // Get winner details
    const { data: winner, error: winnerError } = await supabaseClient
      .from('group_members')
      .select('name')
      .eq('user_id', winnerId)
      .eq('group_id', groupId)
      .single();

    if (winnerError || !winner) {
      throw new Error(`Failed to fetch winner details: ${winnerError?.message}`);
    }

    // Get all group members
    const { data: members, error: membersError } = await supabaseClient
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (membersError || !members || members.length === 0) {
      throw new Error(`Failed to fetch group members: ${membersError?.message}`);
    }

    // Get push tokens for all members
    const userIds = members.map(m => m.user_id);
    console.log(`🔑 Looking for push tokens for ${userIds.length} group members`);
    
    const { data: pushTokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    if (tokensError) {
      throw new Error(`Failed to fetch push tokens: ${tokensError.message}`);
    }

    if (!pushTokens || pushTokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push tokens found for group members' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Found ${pushTokens.length} push tokens for lucky draw notification`);

    // Calculate prize amount
    const prizeAmount = group.monthly_amount * group.current_members;

    // Prepare notification messages
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => ({
      to: tokenData.token,
      title: `🏆 Winner: ${winner.name}!`,
      body: `🎊 Congrats! ${winner.name} has won today's draw in "${group.name}".\nAmount: ₹${prizeAmount.toLocaleString()} 🎁\nTap to send wishes!`,
      data: {
        type: 'lucky_draw',
        groupId,
        groupName: group.name,
        winnerName: winner.name,
        winnerId,
        amount: prizeAmount,
      },
    }));

    console.log(`📤 Sending ${notifications.length} lucky draw notifications...`);

    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.length} lucky draw notifications`,
        results,
        groupName: group.name,
        winnerName: winner.name,
        amount: prizeAmount,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending lucky draw notifications:', error);
    throw error;
  }
}

/**
 * Send payment marked done notifications to all group members except payer
 */
async function sendPaymentMarkedDoneNotifications(supabaseClient: any, data: PaymentMarkedDoneData) {
  try {
    const { groupId, payerName, groupName, amount } = data;
    console.log(`💳 Sending payment marked done notifications for group: ${groupId}, payer: ${payerName}`);

    // Get all group members
    const { data: members, error: membersError } = await supabaseClient
      .from('group_members')
      .select('user_id, name')
      .eq('group_id', groupId);

    if (membersError || !members || members.length === 0) {
      throw new Error(`Failed to fetch group members: ${membersError?.message}`);
    }

    // Get push tokens for all members
    const userIds = members.map(m => m.user_id);
    console.log(`🔑 Looking for push tokens for ${userIds.length} group members`);
    
    const { data: pushTokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    if (tokensError) {
      throw new Error(`Failed to fetch push tokens: ${tokensError.message}`);
    }

    if (!pushTokens || pushTokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push tokens found for group members' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Found ${pushTokens.length} push tokens for payment marked done notification`);

    // Prepare notification messages
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => ({
      to: tokenData.token,
      title: `✅ Payment Received – ₹${amount.toLocaleString()}`,
      body: `${payerName} has paid ₹${amount.toLocaleString()} for "${groupName}".\nYour records are updated 📒\nTap to view group details.`,
      data: {
        type: 'payment_marked_done',
        groupId,
        groupName,
        payerName,
        amount,
      },
    }));

    console.log(`📤 Sending ${notifications.length} payment marked done notifications...`);

    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.length} payment marked done notifications`,
        results,
        groupName,
        payerName,
        amount,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending payment marked done notifications:', error);
    throw error;
  }
}

/**
 * Send draw completed notifications to all group members when admin starts draw
 */
async function sendDrawCompletedNotifications(supabaseClient: any, data: DrawCompletedData) {
  try {
    const { groupId, groupName } = data;
    console.log(`🎲 Sending draw completed notifications for group: ${groupId}`);

    // Get all group members
    const { data: members, error: membersError } = await supabaseClient
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (membersError || !members || members.length === 0) {
      throw new Error(`Failed to fetch group members: ${membersError?.message}`);
    }

    // Get push tokens for all members
    const userIds = members.map(m => m.user_id);
    console.log(`🔑 Looking for push tokens for ${userIds.length} group members`);
    
    const { data: pushTokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    if (tokensError) {
      throw new Error(`Failed to fetch push tokens: ${tokensError.message}`);
    }

    if (!pushTokens || pushTokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push tokens found for group members' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Found ${pushTokens.length} push tokens for draw completed notification`);

    // Prepare notification messages
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => ({
      to: tokenData.token,
      title: '🎉 Lucky Draw Started!',
      body: `Admin has started the lucky draw for "${groupName}".\nFingers crossed 🤞 – best of luck!\nTap to view live draw.`,
      data: {
        type: 'draw_completed',
        groupId,
        groupName,
      },
    }));

    console.log(`📤 Sending ${notifications.length} draw completed notifications...`);

    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.length} draw completed notifications`,
        results,
        groupName,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending draw completed notifications:', error);
    throw error;
  }
}

/**
 * Send group joined notifications to new member when added to group
 */
async function sendGroupJoinedNotifications(supabaseClient: any, data: GroupJoinedData) {
  try {
    const { groupId, groupName, newMemberName, newMemberId } = data;
    console.log(`👥 Sending group joined notification for new member: ${newMemberName} in group: ${groupId}`);

    // Get push token for the new member
    const { data: pushTokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('user_id, token')
      .eq('user_id', newMemberId);

    if (tokensError) {
      throw new Error(`Failed to fetch push token: ${tokensError.message}`);
    }

    if (!pushTokens || pushTokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push token found for new member' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Found push token for new member: ${newMemberName}`);

    // Get group details for notification
    const { data: group, error: groupError } = await supabaseClient
      .from('bhishi_groups')
      .select('monthly_amount, draw_date, current_members')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      throw new Error(`Failed to fetch group details: ${groupError?.message}`);
    }

    // Prepare notification message
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => ({
      to: tokenData.token,
      title: `🎉 Welcome to "${groupName}"!`,
      body: `You've been added to the bhishi group "${groupName}".\n💰 Monthly: ₹${group.monthly_amount.toLocaleString()}\n📅 Next Draw: ${new Date(group.draw_date).toLocaleDateString()}\nTap to view group details.`,
      data: {
        type: 'group_joined',
        groupId,
        groupName,
        monthlyAmount: group.monthly_amount,
        drawDate: group.draw_date,
        currentMembers: group.current_members,
      },
    }));

    console.log(`📤 Sending group joined notification to ${newMemberName}...`);

    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent group joined notification to ${newMemberName}`,
        results,
        groupName,
        newMemberName,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending group joined notification:', error);
    throw error;
  }
}

// Send notification to multiple users (group notification)
async function sendGroupNotification(data: any) {
  try {
    const { tokens, title, body, data: notificationData } = data;
    
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tokens provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create notification payloads for all tokens
    const notifications: NotificationPayload[] = tokens.map(token => ({
      to: token,
      title,
      body,
      data: notificationData,
    }));
    
    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${notifications.length} group notifications`,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending group notification:', error);
    throw error;
  }
}

/**
 * Send notifications using Expo Push API
 */
async function sendExpoPushNotifications(notifications: NotificationPayload[]) {
  const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
  
  console.log(`🚀 Starting to send ${notifications.length} notifications to Expo Push API...`);
  const results = [];
  
  // Send notifications in batches of 100 (Expo limit)
  for (let i = 0; i < notifications.length; i += 100) {
    const batch = notifications.slice(i, i + 100);
    console.log(`📦 Sending batch ${Math.floor(i/100) + 1}: ${batch.length} notifications`);
    
    // Log the tokens being sent to (first 20 chars for privacy)
    batch.forEach((notif, idx) => {
      console.log(`  📱 [${idx + 1}] Token: ${notif.to.substring(0, 20)}... | Title: ${notif.title}`);
    });
    
    try {
      const response = await fetch(expoPushUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      console.log(`📶 Expo API Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Expo Push API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Expo Push API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`📊 Expo API Response:`, JSON.stringify(result, null, 2));
      
      // Log individual notification results
      result.data.forEach((notifResult: any, idx: number) => {
        if (notifResult.status === 'ok') {
          console.log(`  ✅ [${idx + 1}] SUCCESS: ${notifResult.id}`);
        } else {
          console.error(`  ❌ [${idx + 1}] FAILED: ${notifResult.status} - ${notifResult.message}`);
        }
      });
      
      results.push(...result.data);
      
      console.log(`✅ Sent batch of ${batch.length} notifications successfully`);
    } catch (error) {
      console.error(`❌ Error sending notification batch:`, error);
      results.push({ status: 'error', message: error.message });
    }
  }
  
  // Summary of results
  const successCount = results.filter(r => r.status === 'ok').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  console.log(`📊 FINAL SUMMARY: ${successCount} successful, ${errorCount} failed out of ${results.length} total`);
  
  return results;
}

/**
 * Cron job function to check for upcoming draws and send reminders
 * Call this function daily to check for payment reminders
 * Now sends reminders 3, 2, and 1 days prior to draw date
 */
export async function checkPaymentReminders() {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get groups with draw dates in the next 3 days (3, 2, 1 days prior)
    const today = new Date();
    const reminderDates = [];
    
    // Create array of dates: 1, 2, 3 days from today
    for (let i = 1; i <= 3; i++) {
      const reminderDate = new Date(today);
      reminderDate.setDate(today.getDate() + i);
      reminderDates.push(reminderDate.toISOString().split('T')[0]); // YYYY-MM-DD format
    }

    console.log('🔍 Checking for payment reminders on dates:', reminderDates);

    const { data: groups, error: groupsError } = await supabaseClient
      .from('bhishi_groups')
      .select('id, name, monthly_amount, draw_date')
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
      
      await sendPaymentReminders(supabaseClient, {
        groupId: group.id,
        groupName: group.name,
        amount: group.monthly_amount,
        drawDate: group.draw_date,
        daysUntilDraw, // Pass days until draw for better messaging
      });
    }

    console.log(`✅ Processed payment reminders for ${groups.length} groups`);
  } catch (error) {
    console.error('Error in checkPaymentReminders:', error);
  }
}