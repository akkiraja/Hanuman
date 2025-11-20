// @verify_jwt: true
// Twilio WhatsApp Integration - Send WhatsApp messages via Twilio API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface WhatsAppPlainPayload {
  phone: string;
  message: string;
  type?: 'plain';
}

interface WhatsAppTemplatePayload {
  phone: string;
  type: 'template';
  contentSid: string;
  contentVariables: Record<string, string>;
}

type WhatsAppPayload = WhatsAppPlainPayload | WhatsAppTemplatePayload;

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

    const payload = await req.json() as WhatsAppPayload;
    const { phone } = payload;

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Missing phone number' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate payload based on type
    if (payload.type === 'template') {
      if (!payload.contentSid || !payload.contentVariables) {
        return new Response(
          JSON.stringify({ error: 'Missing contentSid or contentVariables for template message' }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      // Plain text message (backward compatible)
      if (!payload.message) {
        return new Response(
          JSON.stringify({ error: 'Missing message for plain text' }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Get Twilio credentials from environment
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    // Production WhatsApp number (not sandbox)
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_FROM') || '+18575972872';
    
    console.log('🔍 Checking Twilio credentials...');
    console.log('TWILIO_ACCOUNT_SID:', twilioSid ? '✅ Set' : '❌ Missing');
    console.log('TWILIO_AUTH_TOKEN:', twilioAuthToken ? '✅ Set' : '❌ Missing');
    console.log('TWILIO_WHATSAPP_FROM:', twilioWhatsAppNumber);
    console.log('Message Type:', payload.type || 'plain');
    
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
    
    // Twilio WhatsApp API endpoint
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    
    // Prepare form data based on message type
    const formData = new FormData();
    formData.append('To', `whatsapp:${formattedPhoneNumber}`);
    formData.append('From', `whatsapp:${twilioWhatsAppNumber}`);
    
    if (payload.type === 'template') {
      // Use Twilio Content Template
      console.log(`📝 Template: ${payload.contentSid}`);
      console.log(`📝 Variables:`, payload.contentVariables);
      formData.append('ContentSid', payload.contentSid);
      formData.append('ContentVariables', JSON.stringify(payload.contentVariables));
    } else {
      // Plain text message (backward compatible)
      console.log(`📝 Message: ${payload.message}`);
      formData.append('Body', payload.message);
    }

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
