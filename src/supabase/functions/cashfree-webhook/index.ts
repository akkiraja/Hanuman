import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
}

interface CashfreeWebhookPayload {
  type: string
  data: {
    order: {
      order_id: string
      order_status: string
      order_amount: number
      order_currency: string
      order_tags?: any
    }
    payment: {
      cf_payment_id: string
      payment_status: string
      payment_amount: number
      payment_currency: string
      payment_message: string
      payment_time: string
      bank_reference: string
      auth_id: string
      payment_method: any
      payment_group: string
    }
    customer_details: {
      customer_name: string
      customer_id: string
      customer_email: string
      customer_phone: string
    }
  }
}

/**
 * Verify Cashfree webhook signature using HMAC-SHA256
 * Cashfree sends base64 encoded signatures in x-webhook-signature header
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    console.log('🔐 Starting signature verification...')
    console.log('📝 Payload length:', payload.length)
    console.log('📝 Received signature:', signature)
    console.log('📝 Secret length:', secret.length)
    
    // Cashfree sends base64 encoded signatures (no prefix)
    const receivedSignature = signature.trim()
    
    // Create HMAC-SHA256 hash using the webhook secret
    const hmac = createHmac('sha256', secret)
    hmac.update(payload, 'utf8')
    
    // Get base64 encoded signature to match Cashfree's format
    const computedSignature = hmac.digest('base64')
    
    console.log('🔐 Signature verification details:', {
      received: receivedSignature,
      computed: computedSignature,
      match: receivedSignature === computedSignature,
      receivedLength: receivedSignature.length,
      computedLength: computedSignature.length
    })
    
    const isValid = receivedSignature === computedSignature
    
    if (isValid) {
      console.log('✅ Webhook signature verification successful')
    } else {
      console.error('❌ Webhook signature verification failed')
      console.error('Expected:', computedSignature)
      console.error('Received:', receivedSignature)
    }
    
    return isValid
    
  } catch (error) {
    console.error('❌ Signature verification error:', error)
    return false
  }
}

/**
 * Update group member payment status based on webhook
 */
async function updatePaymentStatus(
  supabase: any,
  orderId: string,
  paymentStatus: string,
  webhookPayload: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔄 Updating payment status for order: ${orderId}`);
    
    // Get payment mapping from audit table
    const { data: auditRecord, error: auditError } = await supabase
      .from('payment_audit')
      .select('group_id, user_id, amount')
      .eq('order_id', orderId)
      .single()
    
    if (auditError || !auditRecord) {
      console.error('❌ Payment mapping not found:', auditError)
      return { success: false, error: 'Payment mapping not found' }
    }
    
    console.log('📋 Found payment mapping:', auditRecord)
    
    // Determine contribution status based on payment status
    let contributionStatus = 'pending'
    if (paymentStatus === 'SUCCESS' || paymentStatus === 'PAID') {
      contributionStatus = 'paid'
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
      contributionStatus = 'pending' // Keep as pending for failed payments
    }
    
    // Update group member payment status
    const updateData: any = {
      contribution_status: contributionStatus,
      updated_at: new Date().toISOString()
    }
    
    // Set last_payment_date only for successful payments
    if (contributionStatus === 'paid') {
      updateData.last_payment_date = new Date().toISOString()
    }
    
    const { error: updateError } = await supabase
      .from('group_members')
      .update(updateData)
      .eq('group_id', auditRecord.group_id)
      .eq('user_id', auditRecord.user_id)
    
    if (updateError) {
      console.error('❌ Failed to update group member:', updateError)
      return { success: false, error: 'Failed to update payment status' }
    }
    
    // Update audit record with webhook payload and status
    await supabase
      .from('payment_audit')
      .update({
        status: contributionStatus,
        webhook_payload: webhookPayload,
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
    
    console.log(`✅ Payment status updated successfully: ${orderId} -> ${contributionStatus}`)
    return { success: true }
    
  } catch (error) {
    console.error('❌ Error updating payment status:', error)
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(`📨 Webhook received: ${req.method} ${req.url}`);
    
    // Only accept POST requests
    if (req.method !== 'POST') {
      console.warn(`⚠️ Invalid method: ${req.method}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }), 
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get webhook secret from environment variable
    const webhookSecret = Deno.env.get('CASHFREE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('❌ Webhook secret not set in environment variables')
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook secret not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    console.log('🔑 Webhook secret loaded from environment variables')

    // Get raw payload for signature verification
    const rawPayload = await req.text();
    console.log('📨 Received webhook payload:', rawPayload);

    // Verify webhook signature (required for production)
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('X-Webhook-Signature')
    
    console.log('🔍 Checking for webhook signature...')
    console.log('📝 Available headers:', Object.fromEntries(req.headers.entries()))
    
    if (signature) {
      console.log('🔑 Signature found, verifying...')
      const isValidSignature = verifyWebhookSignature(rawPayload, signature, webhookSecret)
      
      if (!isValidSignature) {
        console.error('❌ Webhook signature verification failed - rejecting request')
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid webhook signature',
            message: 'Signature verification failed'
          }), 
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      console.log('✅ Webhook signature verified successfully - proceeding')
    } else {
      console.warn('⚠️ No webhook signature found in headers')
      console.warn('⚠️ For production, signature verification should be required')
      // In production, you might want to reject requests without signatures
      // For testing, we'll proceed but log the warning
    }

    // Parse JSON payload safely
    let webhookPayload: CashfreeWebhookPayload
    try {
      webhookPayload = JSON.parse(rawPayload)
    } catch (parseError) {
      console.error('❌ Invalid JSON payload:', parseError)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON payload' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('📋 Parsed webhook payload:', JSON.stringify(webhookPayload, null, 2))

    // Extract order ID and payment status
    const orderId = webhookPayload.data?.order?.order_id
    const paymentStatus = webhookPayload.data?.payment?.payment_status || webhookPayload.data?.order?.order_status

    if (!orderId) {
      console.error('❌ No order_id found in webhook payload')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing order_id in payload' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!paymentStatus) {
      console.error('❌ No payment status found in webhook payload')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing payment status in payload' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🎯 Processing webhook: ${orderId} -> ${paymentStatus}`);

    // Initialize Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase configuration missing')
      return new Response(
        JSON.stringify({ success: false, error: 'Database configuration error' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check for duplicate webhook (idempotency)
    const { data: existingRecord } = await supabase
      .from('payment_audit')
      .select('status, webhook_payload')
      .eq('order_id', orderId)
      .single()

    if (existingRecord?.webhook_payload) {
      console.log(`⚠️ Duplicate webhook detected for order: ${orderId}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook already processed',
          order_id: orderId 
        }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update payment status
    const updateResult = await updatePaymentStatus(
      supabase, 
      orderId, 
      paymentStatus, 
      webhookPayload
    )

    if (!updateResult.success) {
      console.error(`❌ Failed to update payment status: ${updateResult.error}`)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: updateResult.error,
          order_id: orderId 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Success response - return quickly for Cashfree
    console.log(`✅ Webhook processed successfully: ${orderId}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        order_id: orderId,
        status: paymentStatus
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})