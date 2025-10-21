// @verify_jwt: true
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: any;
  priority?: 'default' | 'normal' | 'high';
  sound?: 'default' | null;
  android?: {
    channelId?: string;
    priority?: 'default' | 'low' | 'min' | 'high' | 'max';
  };
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

interface LuckyDrawStartedData {
  groupId: string;
  groupName: string;
  adminName: string;
  timestamp: string;
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
  adminName?: string;
  nextDrawDate?: string;
}

interface BidRoundStartData {
  groupId: string;
  groupName: string;
  roundNumber: number;
}

interface BidPlacedData {
  groupId: string;
  groupName: string;
  roundNumber: number;
  bidderName: string;
  bidderId: string;
  bidAmount: number;
}

interface BidUpdatedData {
  groupId: string;
  groupName: string;
  roundNumber: number;
  bidderName: string;
  bidderId: string;
  bidAmount: number;
}

interface WinnerDeclaredData {
  groupId: string;
  groupName: string;
  roundNumber: number;
  winnerName: string;
  winnerId: string;
  winningAmount: number;
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
    } else if (type === 'lucky_draw_started') {
      return await sendLuckyDrawStartedNotifications(supabaseClient, data);
    } else if (type === 'payment_marked_done') {
      return await sendPaymentMarkedDoneNotifications(supabaseClient, data);
    } else if (type === 'draw_completed') {
      return await sendDrawCompletedNotifications(supabaseClient, data);
    } else if (type === 'group_joined') {
      return await sendGroupJoinedNotifications(supabaseClient, data);
    } else if (type === 'bid_round_start') {
      return await sendBidRoundStartNotifications(supabaseClient, data);
    } else if (type === 'bid_placed') {
      return await sendBidPlacedNotifications(supabaseClient, data);
    } else if (type === 'bid_updated') {
      return await sendBidUpdatedNotifications(supabaseClient, data);
    } else if (type === 'winner_declared') {
      return await sendWinnerDeclaredNotifications(supabaseClient, data);
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
    console.log(`💰 Sending payment reminders for group: ${groupId}, drawDate: ${drawDate}`);

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

    // Prepare notification messages with NEW Hinglish templates
    console.log(`🔄 Creating notifications for ${pushTokens.length} push tokens...`);
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => {
      const member = members.find(m => m.user_id === tokenData.user_id);
      
      // Determine priority based on urgency
      const isUrgent = daysUntilDraw === 0 || daysUntilDraw === 1;
      
      // NEW: High-energy Hinglish templates based on days until draw
      let title, body;
      if (daysUntilDraw === 1) {
        title = 'Payment Due Tomorrow ⏳';
        body = `Kal payment due hai for ${groupName} — quick pay to stay eligible.`;
      } else if (daysUntilDraw === 0) {
        title = 'Payment Due — Today! 🚨';
        body = `Aaj draw hai — payment ₹${amount.toLocaleString()} due. Jaldi pay karo to join live.`;
      } else {
        title = 'Payment Due Soon 🔔';
        body = `${groupName} ka payment ₹${amount.toLocaleString()} due in ${daysUntilDraw || 'few'} day(s). Don't miss the fun — pay now! 💳`;
      }
      
      return {
        to: tokenData.token,
        title: title,
        body: body,
        priority: isUrgent ? 'high' : 'normal',
        sound: 'default',
        android: {
          channelId: 'default',
          priority: isUrgent ? 'max' : 'high',
        },
        data: {
          type: 'payment_reminder',
          groupId,
          groupName,
          amount,
          drawDate,
          daysUntilDraw,
        },
      };
    });
    
    console.log(`📤 About to send ${notifications.length} notifications via Expo Push API...`);

    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);

    // ⚠️ SMS removed for payment_reminder (not essential)
    // Only push notifications are sent for payment reminders

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.length} payment reminder notifications`,
        results,
        groupName,
        daysUntilDraw,
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
      body: `🎊 Congrats! ${winner.name} has won today's draw in "${group.name}".
Amount: ₹${prizeAmount.toLocaleString()} 🎁
Tap to send wishes!`,
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

    // Prepare notification messages with NEW Hinglish template
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => ({
      to: tokenData.token,
      title: 'Payment Received ✅',
      body: `Got it — ₹${amount.toLocaleString()} received for ${groupName}. You're good to go! 🙌`,
      priority: 'normal',
      sound: 'default',
      android: {
        channelId: 'default',
        priority: 'high',
      },
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

    // Prepare notification messages with NEW Hinglish template
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => ({
      to: tokenData.token,
      title: '🎉 Lucky Draw Live!',
      body: `🎉 Hey! Admin ne Lucky Draw start kiya hai in ${groupName}. Aaiye aur crowd ke saath enjoy karo — best of luck!`,
      priority: 'high',
      sound: 'default',
      android: {
        channelId: 'default',
        priority: 'max',
      },
      data: {
        type: 'draw_completed',
        groupId,
        groupName,
      },
    }));

    console.log(`📤 Sending ${notifications.length} draw completed notifications...`);

    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);

    // ⚠️ SMS removed for lucky_draw_started (not essential)
    // Only push notifications are sent when draw starts

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
    const { groupId, groupName, newMemberName, newMemberId, adminName, nextDrawDate } = data;
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

    // Prepare notification message with NEW Hinglish template
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => ({
      to: tokenData.token,
      title: "You're In! 🎉",
      body: `Welcome to ${groupName} — ${adminName || 'Admin'} ne aapko add kiya. Next draw: ${nextDrawDate || 'TBD'}. Explore app now ✨`,
      priority: 'normal',
      sound: 'default',
      android: {
        channelId: 'default',
        priority: 'high',
      },
      data: {
        type: 'group_joined',
        groupId,
        groupName,
        newMemberName,
      },
    }));

    console.log(`📤 Sending group joined notification to ${newMemberName}...`);

    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);

    // ✅ Send welcome SMS only to unregistered members (user_id = null)
    try {
      console.log(`📱 Checking if welcome SMS needed for new member...`);
      
      // Get new member profile to check if registered
      const { data: memberProfile } = await supabaseClient
        .from('profiles')
        .select('phone')
        .eq('id', newMemberId)
        .single();
      
      // Only send SMS if member is NOT registered (no profile found)
      if (!memberProfile?.phone) {
        console.log(`📨 Member is unregistered - fetching phone from group_members...`);
        
        // Fetch the most recently added unregistered member's phone number
        const { data: unregisteredMember, error: memberError } = await supabaseClient
          .from('group_members')
          .select('phone')
          .eq('group_id', groupId)
          .is('user_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (memberError) {
          console.log(`⚠️ Error fetching unregistered member phone:`, memberError.message);
        } else if (unregisteredMember?.phone) {
          console.log(`📨 Sending welcome SMS to unregistered member:`, unregisteredMember.phone);
          
          // Build the SMS message template (matching send-sms format)
          const smsMessage = `${adminName || 'Admin'} has added you to the Bhishi group '${groupName}'. Download Bhishi to join: https://bit.ly/Bhishi`;
          
          // Send SMS directly using send-sms edge function with single_sms type
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          
          if (supabaseUrl && supabaseServiceKey) {
            const smsUrl = `${supabaseUrl}/functions/v1/send-sms`;
            const smsResponse = await fetch(smsUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'single_sms',
                data: {
                  to: unregisteredMember.phone,
                  message: smsMessage
                }
              }),
            });
            
            if (smsResponse.ok) {
              console.log(`✅ Welcome SMS sent successfully to unregistered member`);
            } else {
              const errorText = await smsResponse.text();
              console.warn(`⚠️ Failed to send SMS:`, errorText);
            }
          }
        } else {
          console.log(`⚠️ No phone found for unregistered member in group:`, groupId);
        }
      } else {
        console.log(`✅ Member is registered - skipping SMS (push notification sent instead)`);
      }
    } catch (smsError) {
      console.warn(`⚠️ SMS notification failed for group joined, continuing with push notifications:`, smsError.message);
    }

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
 * Send SMS notification by calling the send-sms function
 */
async function sendSMSNotification(data: any) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration for SMS service');
    }

    const smsUrl = `${supabaseUrl}/functions/v1/send-sms`;
    
    const response = await fetch(smsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'group_sms',
        data,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SMS service error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📱 SMS service response:', result);
    return result;
  } catch (error) {
    console.error('❌ Error calling SMS service:', error);
    throw error;
  }
}

/**
 * Send bid round start notifications to all group members
 */
async function sendBidRoundStartNotifications(supabaseClient: any, data: BidRoundStartData) {
  try {
    const { groupId, groupName, roundNumber } = data;
    console.log(`⚡ Sending bid round start notifications for group: ${groupId}, round: ${roundNumber}`);

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

    console.log(`📱 Found ${pushTokens.length} push tokens for bid round start notification`);

    // Prepare notification messages with NEW Hinglish template
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => ({
      to: tokenData.token,
      title: 'Bidding Live — Join Now ⚡',
      body: `Quick! Round ${roundNumber} live hai — bids tez ho rahe hain. Jaldi aao aur participate karo 🔥`,
      priority: 'high',
      sound: 'default',
      android: {
        channelId: 'default',
        priority: 'max',
      },
      data: {
        type: 'live_bidding_started',
        groupId,
        groupName,
        roundNumber,
      },
    }));

    console.log(`📤 Sending ${notifications.length} bid round start notifications...`);

    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);

    // Also send SMS notifications (with fallback) - UPDATE EVENT NAME
    try {
      console.log(`📱 Attempting to send SMS for bidding start...`);
      await sendSMSNotification({
        groupId,
        event: 'live_bidding_started', // UPDATED from 'bidding_start'
        groupName,
        roundNumber,
        app_link: 'https://bhishi.app'
      });
      console.log(`✅ SMS notifications sent successfully for bidding start`);
    } catch (smsError) {
      console.warn(`⚠️ SMS notification failed for bidding start, continuing with push notifications:`, smsError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.length} bid round start notifications`,
        results,
        groupName,
        roundNumber,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending bid round start notifications:', error);
    throw error;
  }
}

/**
 * Send bid placed notifications to all group members except the bidder
 */
async function sendBidPlacedNotifications(supabaseClient: any, data: BidPlacedData) {
  try {
    const { groupId, groupName, roundNumber, bidderName, bidderId, bidAmount } = data;
    console.log(`💰 Sending bid placed notifications for group: ${groupId}, bidder: ${bidderName}, amount: ${bidAmount}`);

    // Get all group members EXCEPT the bidder
    const { data: members, error: membersError } = await supabaseClient
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .neq('user_id', bidderId);

    if (membersError || !members) {
      throw new Error(`Failed to fetch group members: ${membersError?.message}`);
    }

    if (members.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No other members to notify' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get push tokens for members (excluding bidder)
    const userIds = members.map(m => m.user_id);
    console.log(`🔑 Looking for push tokens for ${userIds.length} group members (excluding bidder)`);
    
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

    console.log(`📱 Found ${pushTokens.length} push tokens for bid placed notification`);

    // Prepare notification messages with NEW Hinglish template
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => ({
      to: tokenData.token,
      title: 'New Bid Alert 💸',
      body: `${bidderName} ne ₹${bidAmount.toLocaleString()} lagaaya — ab aapki move! Dekho aur compete karo 🚀`,
      priority: 'normal',
      sound: 'default',
      android: {
        channelId: 'default',
        priority: 'high',
      },
      data: {
        type: 'bid_placed',
        groupId,
        groupName,
        roundNumber,
        bidderName,
        bidderId,
        bidAmount,
      },
    }));

    console.log(`📤 Sending ${notifications.length} bid placed notifications...`);

    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);

    // ⚠️ SMS removed for bid_placed (not essential)
    // Only push notifications are sent when individual bids are placed

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.length} bid placed notifications`,
        results,
        groupName,
        bidderName,
        bidAmount,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending bid placed notifications:', error);
    throw error;
  }
}

/**
 * Send bid updated notifications to all group members except the bidder
 */
async function sendBidUpdatedNotifications(supabaseClient: any, data: BidUpdatedData) {
  try {
    const { groupId, groupName, roundNumber, bidderName, bidderId, bidAmount } = data;
    console.log(`🔄 Sending bid updated notifications for group: ${groupId}, bidder: ${bidderName}`);

    // Get all group members EXCEPT the bidder
    const { data: members, error: membersError } = await supabaseClient
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .neq('user_id', bidderId);

    if (membersError || !members) {
      throw new Error(`Failed to fetch group members: ${membersError?.message}`);
    }

    if (members.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No other members to notify' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get push tokens for members (excluding bidder)
    const userIds = members.map(m => m.user_id);
    console.log(`🔑 Looking for push tokens for ${userIds.length} group members (excluding bidder)`);
    
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

    console.log(`📱 Found ${pushTokens.length} push tokens for bid updated notification`);

    // Prepare notification messages with NEW Hinglish template
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => ({
      to: tokenData.token,
      title: 'Bid Updated 🔄',
      body: `${bidderName} ne bid update ki — Round ${roundNumber}. Aap ready ho? Open app! ⚔️`,
      priority: 'normal',
      sound: 'default',
      android: {
        channelId: 'default',
        priority: 'high',
      },
      data: {
        type: 'bid_updated',
        groupId,
        groupName,
        roundNumber,
        bidderName,
        bidderId,
        bidAmount,
      },
    }));

    console.log(`📤 Sending ${notifications.length} bid updated notifications...`);

    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.length} bid updated notifications`,
        results,
        groupName,
        bidderName,
        bidAmount,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending bid updated notifications:', error);
    throw error;
  }
}

/**
 * Send winner declared notifications to all group members
 */
async function sendWinnerDeclaredNotifications(supabaseClient: any, data: WinnerDeclaredData) {
  try {
    const { groupId, groupName, roundNumber, winnerName, winnerId, winningAmount } = data;
    console.log(`🏆 Sending winner declared notifications for group: ${groupId}, winner: ${winnerName}`);

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

    console.log(`📱 Found ${pushTokens.length} push tokens for winner declared notification`);

    // Prepare notification messages with NEW Hinglish template
    const notifications: NotificationPayload[] = pushTokens.map(tokenData => ({
      to: tokenData.token,
      title: 'Winner Declared 🏆',
      body: `Badhai! ${winnerName} ne Round ${roundNumber} jeet liya. Result dekhne ke liye tap karo 🎉`,
      priority: 'high',
      sound: 'default',
      android: {
        channelId: 'default',
        priority: 'max',
      },
      data: {
        type: 'winner_declared',
        groupId,
        groupName,
        roundNumber,
        winnerName,
        winnerId,
        winningAmount,
      },
    }));

    console.log(`📤 Sending ${notifications.length} winner declared notifications...`);

    // Send notifications via Expo Push API
    const results = await sendExpoPushNotifications(notifications);

    // Also send SMS notifications (with fallback)
    try {
      console.log(`📱 Attempting to send SMS for winner declared...`);
      await sendSMSNotification({
        groupId,
        event: 'winner_declared',
        groupName,
        winnerName,
        amount: winningAmount,
        roundNumber,
        app_link: 'https://bhishi.app'
      });
      console.log(`✅ SMS notifications sent successfully for winner declared`);
    } catch (smsError) {
      console.warn(`⚠️ SMS notification failed for winner declared, continuing with push notifications:`, smsError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.length} winner declared notifications`,
        results,
        groupName,
        winnerName,
        winningAmount,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending winner declared notifications:', error);
    throw error;
  }
}

/**
 * Send lucky draw started notifications to all group members
 * This provides a fallback when real-time sync fails in APK builds
 */
async function sendLuckyDrawStartedNotifications(supabaseClient: any, data: LuckyDrawStartedData) {
  try {
    const { groupId, groupName, adminName, timestamp } = data;
    console.log(`🎲 Sending lucky draw started notifications for group: ${groupId}`);

    // Get all group members except the admin who started the draw
    const { data: members, error: membersError } = await supabaseClient
      .from('group_members')
      .select(`
        user_id,
        profiles!inner(name, phone)
      `)
      .eq('group_id', data.groupId);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      throw new Error('Failed to fetch group members');
    }

    if (!members || members.length === 0) {
      console.log('No members found for group:', data.groupId);
      return new Response(
        JSON.stringify({ message: 'No members to notify' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get push tokens for all members
    const userIds = members.map(member => member.user_id);
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      throw new Error('Failed to fetch push tokens');
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for group members');
      return new Response(
        JSON.stringify({ message: 'No push tokens available' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification payload with NEW Hinglish template
    const pushTokens = tokens.map(token => token.token);
    const title = '🎉 Lucky Draw Live!';
    const body = `🎉 Hey! ${adminName} ne Lucky Draw start kiya hai in ${groupName}. Aaiye aur crowd ke saath enjoy karo — best of luck!`;
    
    const notificationData = {
      type: 'lucky_draw_started',
      groupId: groupId,
      groupName: groupName,
      timestamp: timestamp,
      screen: 'home' // Navigate to home screen to see animation
    };

    // Prepare notification messages using existing format
    const notifications: NotificationPayload[] = pushTokens.map(token => ({
      to: token,
      title: title,
      body: body,
      priority: 'high',
      sound: 'default',
      android: {
        channelId: 'default',
        priority: 'max',
      },
      data: notificationData,
    }));

    if (notifications.length === 0) {
      console.log('No valid push tokens to send notifications');
      return new Response(
        JSON.stringify({ message: 'No valid push tokens' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Sending ${notifications.length} lucky draw started notifications`);
    
    // Send notifications using existing function
    const results = await sendExpoPushNotifications(notifications);

    // ⚠️ SMS removed for lucky_draw_started (not essential)
    // Only push notifications are sent when lucky draw starts

    console.log('✅ Lucky draw started notifications sent successfully');
    return new Response(
      JSON.stringify({ 
        message: 'Lucky draw started notifications sent successfully',
        notificationsSent: notifications.length,
        results
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending lucky draw started notifications:', error);
    throw error;
  }
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