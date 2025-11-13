// @verify_jwt: true
// Twilio WhatsApp Integration - Send WhatsApp messages via Twilio API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface WhatsAppPayload {
  phone: string;
  message: string;
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

    const { phone, message } = await req.json() as WhatsAppPayload;

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing phone number or message' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Twilio credentials from environment
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    
    console.log('🔍 Checking Twilio credentials...');
    console.log('TWILIO_ACCOUNT_SID:', twilioSid ? '✅ Set' : '❌ Missing');
    console.log('TWILIO_AUTH_TOKEN:', twilioAuthToken ? '✅ Set' : '❌ Missing');
    console.log('TWILIO_PHONE_NUMBER:', twilioPhoneNumber ? '✅ Set' : '❌ Missing');
    
    if (!twilioSid || !twilioAuthToken) {
      console.error('❌ Missing Twilio credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Missing Twilio configuration. TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in Supabase secrets.',
          debug: {
            hasSid: !!twilioSid,
            hasToken: !!twilioAuthToken,
            hasPhone: !!twilioPhoneNumber
          }
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Format phone number
    let formattedPhoneNumber = phone;
    if (!phone.startsWith('+91') && phone.length === 10) {
      formattedPhoneNumber = `+91${phone}`;
    }

    // Ensure + prefix for WhatsApp
    if (!formattedPhoneNumber.startsWith('+')) {
      formattedPhoneNumber = `+${formattedPhoneNumber}`;
    }

    console.log(`📱 Sending WhatsApp message to ${formattedPhoneNumber}`);
    console.log(`📝 Message: ${message}`);

    // Twilio WhatsApp API endpoint
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    
    // Prepare form data
    const formData = new FormData();
    formData.append('To', `whatsapp:${formattedPhoneNumber}`);
    formData.append('From', 'whatsapp:+14155238886'); // Twilio Sandbox Number
    formData.append('Body', message);

    // Send request to Twilio
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioSid}:${twilioAuthToken}`)}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Twilio WhatsApp API error: ${response.status} ${response.statusText}`, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Twilio API error: ${response.status} ${response.statusText}`,
          details: errorText
        }),
        { 
          status: response.status, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    const result = await response.json();
    console.log(`✅ WhatsApp message sent successfully:`, result.sid);
    
    return new Response(
      JSON.stringify({
        success: true,
        sid: result.sid,
        to: formattedPhoneNumber,
        status: result.status,
        message: 'WhatsApp message sent successfully'
      }),
      { 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in send-whatsapp function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
