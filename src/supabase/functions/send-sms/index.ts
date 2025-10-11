// @verify_jwt: true
// Last updated: 2025-10-07 - Twilio SMS integration
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface SMSPayload {
  to: string;
  message: string;
}

interface GroupSMSData {
  groupId: string;
  event: 'lucky_draw_started' | 'winner_declared' | 'draw_completed' | 'group_joined' | 'payment_reminder' | 'live_bidding_started' | 'bid_placed';
  groupName?: string;
  adminName?: string;
  winnerName?: string;
  amount?: number;
  roundNumber?: number;
  nextDrawDate?: string;
  drawDate?: string;
  bidderName?: string;
  bidAmount?: number;
  app_link?: string;
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

    const message = `🙏 Namaste! Your Bhishi OTP is ${otp}. Jaldi enter karo aur login complete karo ✅`;
    
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
    const { groupId, event, groupName, winnerName, amount, roundNumber } = data;
    
    if (!groupId || !event) {
      return new Response(
        JSON.stringify({ error: 'Missing groupId or event type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get group members with phone numbers
    console.log(`📋 Fetching group members for SMS: ${groupId}`);
    const { data: members, error: membersError } = await supabaseClient
      .from('group_members')
      .select(`
        user_id,
        name,
        phone,
        profiles!inner(phone)
      `)
      .eq('group_id', groupId);

    if (membersError || !members || members.length === 0) {
      console.error('Failed to fetch group members:', membersError);
      return new Response(
        JSON.stringify({ message: 'No group members found or error fetching members' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`👥 Found ${members.length} group members for SMS`);

    // Prepare SMS messages based on event type
    const messages = [];
    const app_link = data.app_link || 'https://bhishi.app';
    
    const eventMessages: { [key: string]: string } = {
      lucky_draw_started: `🎰 Bhishi Alert! ${adminName || 'Admin'} ne Lucky Draw shuru kar diya hai in ${groupName}! Jaldi aao — live dekhne ka maza lo 🎉 ${app_link}`,
      winner_declared: `🎉 Wah! ${winnerName} ne jeet liya Round ${roundNumber} — ₹${amount?.toLocaleString()}! Badhai ho 👏 Dekho details: ${app_link}`,
      draw_completed: `🏁 Draw complete in ${groupName}! Winner: ${winnerName} — ₹${amount?.toLocaleString()}. Result dekhne ke liye app kholo 🔥 ${app_link}`,
      group_joined: `👋 Welcome to ${groupName}! ${adminName || 'Admin'} ne aapko add kiya. Next draw: ${nextDrawDate || 'TBD'}. Start karne ke liye app kholo 🚀 ${app_link}`,
      payment_reminder: `🔔 Reminder: ${groupName} ka payment ₹${amount?.toLocaleString()} due on ${drawDate || 'soon'}. Jaldi pay karo warna draw miss ho sakta hai — app kholo: ${app_link}`,
      live_bidding_started: `⚡ Live Bidding Started in ${groupName}! Round ${roundNumber} abhi shuru hua — jaldi aao aur apna bid lagao. Dekhne/participate karne ke liye app kholo`,
      bid_placed: `⚡ ${bidderName} ne Round ${roundNumber} me ₹${bidAmount?.toLocaleString()} ka bid lagaya in ${groupName}! Ab aapki baari — jaldi app kholo aur compete karo 💪 ${app_link}`,
    };

    const message = eventMessages[event];
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Invalid event type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send SMS to all members
    const results = [];
    const failedSMS = [];

    for (const member of members) {
      // Try to get phone number from member record or profile
      const phoneNumber = member.phone || member.profiles?.phone;
      
      if (!phoneNumber) {
        console.warn(`⚠️ No phone number found for member: ${member.name} (${member.user_id})`);
        failedSMS.push({
          memberId: member.user_id,
          memberName: member.name,
          reason: 'No phone number available',
        });
        continue;
      }

      try {
        console.log(`📤 Sending ${event} SMS to ${member.name}: ${phoneNumber}`);
        const result = await sendSMS(phoneNumber, message);
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

    console.log(`📊 SMS Results: ${results.length} sent, ${failedSMS.length} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `SMS sent for ${event}`,
        results: {
          sent: results.length,
          failed: failedSMS.length,
          total: members.length,
          details: results,
          failures: failedSMS,
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