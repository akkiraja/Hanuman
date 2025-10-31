// @verify_jwt: true
// Last updated: 2025-10-19 - Optimized for 4 SMS events, English GSM-7 only, unregistered members only
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 🚨 Global SMS toggle - set to false to disable all SMS
const ENABLE_SMS_NOTIFICATIONS = true;

// ✅ Whitelist: Only these events trigger SMS
const ALLOWED_SMS_EVENTS = ['lucky_draw_winner', 'group_joined', 'bidding_start'];
// Note: 'otp_sms' is handled separately (no filtering)

// SMS Deduplication Cache
// Key: phone_number:event:groupId, Value: timestamp
const smsCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 60 * 1000; // 1 minute

interface SMSPayload {
  to: string;
  message: string;
}

// Type-safe SMS event parameters
// SMS events - sent to UNREGISTERED members only (user_id IS NULL)
interface GroupSMSData {
  groupId: string;
  event: 'lucky_draw_winner' | 'group_joined' | 'bidding_start';
  // Required params vary by event:
  // lucky_draw_winner: winnerName, groupName
  // group_joined: adminName, groupName (memberName deprecated)
  // bidding_start: adminName, groupName
  groupName: string; // Required for all events
  adminName?: string; // Required for group_joined and bidding_start
  winnerName?: string; // Required for lucky_draw_winner
  memberName?: string; // Deprecated, not used
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

    const { type, data } = await req.json();

    if (type === 'single_sms') {
      return await sendSingleSMS(data);
    } else if (type === 'group_sms') {
      return await sendGroupSMS(data);
    } else if (type === 'otp_sms') {
      return await sendOTPSMS(data);
    } else {
      return new Response('Invalid SMS type', { status: 400 });
    }
  } catch (error) {
    console.error('Error in send-sms function:', error);
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
 * Send SMS using Twilio API
 */
async function sendSMS(to: string, message: string): Promise<any> {
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!twilioSid || !twilioAuthToken || !twilioPhoneNumber) {
    throw new Error('Missing Twilio configuration. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER');
  }

  // Ensure phone number has +91 country code
  let formattedPhoneNumber = to;
  if (!to.startsWith('+91') && to.length === 10) {
    formattedPhoneNumber = `+91${to}`;
  }

  console.log(`📱 Sending SMS to ${formattedPhoneNumber}`);
  console.log(`📝 Message: ${message}`);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
  
  const formData = new FormData();
  formData.append('To', formattedPhoneNumber);
  formData.append('From', twilioPhoneNumber);
  formData.append('Body', message);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioSid}:${twilioAuthToken}`)}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Twilio API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Twilio API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ SMS sent successfully to ${formattedPhoneNumber}:`, result.sid);
    
    return {
      success: true,
      sid: result.sid,
      to: formattedPhoneNumber,
      status: result.status,
    };
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${formattedPhoneNumber}:`, error);
    throw error;
  }
}

/**
 * Send single SMS
 */
async function sendSingleSMS(data: SMSPayload) {
  try {
    const { to, message } = data;
    
    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing phone number or message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendSMS(to, message);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS sent successfully',
        result,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending single SMS:', error);
    throw error;
  }
}

/**
 * Send OTP SMS
 */
async function sendOTPSMS(data: { to: string; otp: string }) {
  try {
    const { to, otp } = data;
    
    if (!to || !otp) {
      return new Response(
        JSON.stringify({ error: 'Missing phone number or OTP' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ✅ English GSM-7 OTP message - under 160 chars
    const message = `Your Bhishi login code is ${otp}. Please do not share it with anyone.`;
    
    const result = await sendSMS(to, message);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP SMS sent successfully',
        result,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending OTP SMS:', error);
    throw error;
  }
}

/**
 * Send SMS to group members for app events
 */
async function sendGroupSMS(data: GroupSMSData) {
  try {
    const { groupId, event, groupName, adminName, winnerName, memberName, amount } = data;
    
    if (!groupId || !event) {
      return new Response(
        JSON.stringify({ error: 'Missing groupId or event type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check global SMS toggle
    if (!ENABLE_SMS_NOTIFICATIONS) {
      console.log('📵 SMS notifications disabled globally');
      return new Response(
        JSON.stringify({ 
          message: 'SMS notifications are disabled',
          sent: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get UNREGISTERED group members only (user_id IS NULL) with phone numbers
    console.log(`📋 Fetching UNREGISTERED members for SMS: ${groupId}`);
    const { data: members, error: membersError } = await supabaseClient
      .from('group_members')
      .select(`
        user_id,
        name,
        phone
      `)
      .eq('group_id', groupId)
      .is('user_id', null); // CRITICAL: Only unregistered members

    if (membersError || !members || members.length === 0) {
      console.error('Failed to fetch group members:', membersError);
      return new Response(
        JSON.stringify({ message: 'No group members found or error fetching members' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`👥 Found ${members.length} UNREGISTERED members for SMS`);

    // Check event whitelist
    if (!ALLOWED_SMS_EVENTS.includes(event)) {
      console.log(`⏩ Skipping non-whitelisted SMS event: ${event}`);
      return new Response(
        JSON.stringify({ 
          message: `Event '${event}' is not whitelisted for SMS`,
          sent: 0,
          skipped: members.length
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ✅ English GSM-7 templates - under 160 chars, 1 SMS segment each
    // Personalized with adminName where applicable
    const eventMessages: { [key: string]: string } = {
      lucky_draw_winner: `${winnerName} has won the Bhishi draw in '${groupName}'! Download Bhishi to join: https://bit.ly/Bhishi`,
      group_joined: `${adminName} has added you to the Bhishi group '${groupName}'. Download Bhishi to join: https://bit.ly/Bhishi`,
      bidding_start: `${adminName} has started bidding for '${groupName}'. Open Bhishi to view now: https://bit.ly/Bhishi`,
    };

    // Event already validated by whitelist above
    
    const message = eventMessages[event];
    
    // Log SMS template info
    console.log(`📝 SMS Template for ${event}:`);
    console.log(`📝 Message: ${message}`);
    console.log(`📏 Length: ${message.length} chars (${Math.ceil(message.length / 160)} segment${message.length > 160 ? 's' : ''})`);

    // Validate required params
    if (!groupName) {
      console.error('❌ Missing groupName parameter');
      return new Response(
        JSON.stringify({ error: 'Missing groupName parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate event-specific required params
    if (event === 'group_joined' || event === 'bidding_start') {
      if (!adminName) {
        console.error(`❌ Missing adminName for event: ${event}`);
        return new Response(
          JSON.stringify({ error: `adminName is required for ${event}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    if (event === 'lucky_draw_winner' && !winnerName) {
      console.error('❌ Missing winnerName for lucky_draw_winner event');
      return new Response(
        JSON.stringify({ error: 'winnerName is required for lucky_draw_winner' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 SMS Event: ${event}`);
    console.log(`📝 Message: ${message}`);
    console.log(`📊 Target: ${members.length} unregistered members`);

    // Send SMS to all members
    const results = [];
    const failedSMS = [];
    const dedupSkipped = [];
    const now = Date.now(); // ✅ Define timestamp at function scope for deduplication and cleanup

    for (const member of members) {
      // Get phone number from member record (profiles not joined for unregistered)
      const phoneNumber = member.phone;
      
      if (!phoneNumber) {
        console.warn(`⚠️ No phone number found for member: ${member.name} (${member.user_id})`);
        failedSMS.push({
          memberId: member.user_id,
          memberName: member.name,
          reason: 'No phone number available',
        });
        continue;
      }

      // Deduplication: Check if we sent this exact SMS recently (within 1 minute)
      const dedupKey = `${phoneNumber}:${event}:${groupId}`;
      const lastSentTime = smsCache.get(dedupKey);
      
      if (lastSentTime && (now - lastSentTime) < DEDUP_WINDOW_MS) {
        const secondsAgo = Math.round((now - lastSentTime) / 1000);
        console.log(`⏭️ Skipping duplicate SMS to ${member.name} (sent ${secondsAgo}s ago)`);
        dedupSkipped.push({
          memberId: member.user_id,
          memberName: member.name,
          phone: phoneNumber,
          reason: `Duplicate prevented (sent ${secondsAgo}s ago)`,
        });
        continue;
      }

      try {
        console.log(`📤 Sending ${event} SMS to ${member.name}: ${phoneNumber}`);
        const result = await sendSMS(phoneNumber, message);
        
        // Cache successful send for deduplication
        smsCache.set(dedupKey, now);
        
        results.push({
          memberId: member.user_id,
          memberName: member.name,
          phone: phoneNumber,
          ...result,
        });
      } catch (error) {
        console.error(`❌ Failed to send SMS to ${member.name}:`, error);
        failedSMS.push({
          memberId: member.user_id,
          memberName: member.name,
          phone: phoneNumber,
          error: error.message,
        });
      }
    }

    // Cleanup old cache entries (older than dedup window)
    const cutoffTime = now - DEDUP_WINDOW_MS;
    for (const [key, timestamp] of smsCache.entries()) {
      if (timestamp < cutoffTime) {
        smsCache.delete(key);
      }
    }

    console.log(`📊 SMS Results: ${results.length} sent, ${failedSMS.length} failed, ${dedupSkipped.length} skipped (dedup)`);
    console.log(`💰 Cost optimization: Only unregistered members receive SMS`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `SMS sent for ${event} to unregistered members only`,
        results: {
          sent: results.length,
          failed: failedSMS.length,
          deduplicated: dedupSkipped.length,
          total: members.length,
          recipientType: 'unregistered_only',
          details: results,
          failures: failedSMS,
          skipped: dedupSkipped,
        },
        groupId,
        event,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending group SMS:', error);
    throw error;
  }
}