import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  phone: string;
  name: string;
  amount: number;
  groupId: string;
  groupName: string;
  userId: string; // Add user ID for payment mapping
}

interface CashfreeLinkRequest {
  link_id: string;
  link_amount: number;
  link_currency: string;
  link_purpose: string;
  customer_details: {
    customer_id: string;
    customer_name: string;
    customer_email?: string;
    customer_phone: string;
  };
  link_meta: {
    return_url: string;
    notify_url?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { phone, name, amount, groupId, groupName, userId }: PaymentRequest = await req.json()

    // Validate required fields
    if (!phone || !name || !amount || !groupId || !groupName || !userId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: phone, name, amount, groupId, groupName, userId' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate amount
    if (amount <= 0 || amount > 100000) {
      return new Response(
        JSON.stringify({ 
          error: 'Amount must be between 1 and 100000' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Cashfree test credentials - Updated for new business account
    const CASHFREE_APP_ID = 'TEST107603294c8654b7e91470e1b9c492306701'
    const CASHFREE_SECRET_KEY = 'cfsk_ma_test_0b529c79479e27bbb2c8178d2c6f97b9_999bbad1'
    const CASHFREE_BASE_URL = 'https://sandbox.cashfree.com/pg'
    
    console.log('🔑 Using Cashfree credentials:', {
      appId: CASHFREE_APP_ID,
      secretKey: CASHFREE_SECRET_KEY.substring(0, 20) + '...', // Log partial secret for debugging
      baseUrl: CASHFREE_BASE_URL
    });

    // Generate unique link ID (max 50 chars for Cashfree)
    // Format: bhishi_[short-group]_[timestamp]_[random]
    const shortGroupId = groupId.substring(0, 8) // First 8 chars of UUID
    const timestamp = Date.now().toString()
    const randomSuffix = Math.random().toString(36).substr(2, 6) // 6 chars
    let orderId = `bhishi_${shortGroupId}_${timestamp}_${randomSuffix}`
    
    // Ensure link_id is under 50 characters
    if (orderId.length > 50) {
      console.warn(`⚠️ Link ID too long (${orderId.length} chars), truncating to 50`);
      orderId = orderId.substring(0, 50);
    }
    
    console.log(`📏 Generated link_id: ${orderId} (${orderId.length} chars)`);
    
    // Create customer email (required by Cashfree)
    const customerEmail = `${phone}@bhishi.app`
    
    // Prepare Cashfree PG Links request
    const linkRequest: CashfreeLinkRequest = {
      link_id: orderId,
      link_amount: amount,
      link_currency: 'INR',
      link_purpose: `Payment for ${groupName}`,
      customer_details: {
        customer_id: phone,
        customer_name: name,
        customer_email: customerEmail,
        customer_phone: phone
      },
      link_meta: {
        return_url: `bhishi://payment-success?orderId=${orderId}&groupId=${groupId}&amount=${amount}&status=success`
      }
    }

    console.log('🏦 Creating Cashfree order:', {
      orderId,
      amount,
      customerName: name,
      customerPhone: phone
    })

    console.log('📝 Payment link payload:', JSON.stringify(linkRequest, null, 2));
    
    console.log('🌐 Making request to Cashfree:', {
      url: `${CASHFREE_BASE_URL}/links`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY.substring(0, 20) + '...',
        'x-api-version': '2023-08-01'
      }
    });
    
    // Call Cashfree PG Links API with correct endpoint and headers
    const cashfreeResponse = await fetch(`${CASHFREE_BASE_URL}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify(linkRequest)
    })

    const cashfreeData = await cashfreeResponse.json()
    
    console.log('💳 Cashfree API response:', {
      status: cashfreeResponse.status,
      success: cashfreeResponse.ok,
      data: cashfreeData
    })

    if (!cashfreeResponse.ok) {
      console.error('❌ Cashfree API error:', cashfreeData)
      
      // Return specific error details to frontend for better debugging
      const errorMessage = cashfreeData.message || cashfreeData.error || 'Unknown payment gateway error'
      const errorCode = cashfreeData.code || 'unknown_error'
      
      return new Response(
        JSON.stringify({ 
          error: 'Payment gateway error',
          message: errorMessage,
          code: errorCode,
          details: cashfreeData
        }),
        { 
          status: 400, // Use 400 instead of 500 for client errors
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract payment link from PG Links response
    const paymentLink = cashfreeData.link_url || cashfreeData.payment_link
    
    if (!paymentLink) {
      console.error('❌ No payment link in Cashfree response:', cashfreeData)
      return new Response(
        JSON.stringify({ 
          error: 'No payment link received from gateway'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Payment link created successfully:', paymentLink)

    // Initialize Supabase client for storing payment mapping
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Store payment mapping in audit table for webhook processing
    try {
      const { error: auditError } = await supabase
        .from('payment_audit')
        .insert({
          order_id: orderId,
          group_id: groupId,
          user_id: userId,
          amount: amount,
          status: 'pending',
          payment_link: paymentLink
        });

      if (auditError) {
        console.error('⚠️ Failed to store payment audit record:', auditError);
        // Don't fail the payment creation if audit storage fails
      } else {
        console.log('📝 Payment audit record stored successfully');
      }
    } catch (auditStoreError) {
      console.error('💥 Error storing payment audit:', auditStoreError);
      // Continue with payment creation even if audit fails
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        payment_link: paymentLink,
        link_id: cashfreeData.link_id,
        amount: amount,
        currency: 'INR'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})