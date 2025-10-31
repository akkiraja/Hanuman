import { supabase } from '../libs/supabase';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';

export interface CreatePaymentRequest {
  phone: string;
  name: string;
  amount: number;
  groupId: string;
  groupName: string;
  userId: string; // Add user ID for payment mapping
}

export interface CreatePaymentResponse {
  success: boolean;
  order_id: string;
  payment_link: string;
  amount: number;
  currency: string;
  error?: string;
  details?: string;
}

export class CashfreeService {
  /**
   * Create a payment order with Cashfree
   */
  static async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse | null> {
    try {
      console.log('💳 Creating Cashfree payment with real data:', {
        amount: request.amount,
        groupName: request.groupName,
        customerName: request.name,
        customerPhone: request.phone,
        groupId: request.groupId
      });

      // Validate request
      if (!request.phone || !request.name || !request.amount || !request.groupId || !request.userId) {
        throw new Error('Missing required payment details');
      }

      // Clean and validate phone number
      let cleanPhone = request.phone;
      if (cleanPhone.startsWith('+91')) {
        cleanPhone = cleanPhone.substring(3);
          } else if (cleanPhone.startsWith('91')) {
            cleanPhone = cleanPhone.substring(2);
          }
          cleanPhone = cleanPhone.replace(/[^\d]/g, '');

          console.log('🔍 Phone validation:', {
            originalPhone: request.phone,
            cleanedPhone: cleanPhone,
            isValid: /^[6-9]\d{9}$/.test(cleanPhone)
          });

          if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
            throw new Error('Please enter a valid 10-digit mobile number');
          }

          // Update request with cleaned phone
          request.phone = cleanPhone;

      // Validate amount
      if (request.amount <= 0 || request.amount > 100000) {
        throw new Error('Amount must be between ₹1 and ₹1,00,000');
      }

      // Call Supabase Edge Function
      console.log('🚀 Calling Supabase Edge Function with payload:', {
        phone: request.phone,
        name: request.name,
        amount: request.amount,
        groupId: request.groupId,
        groupName: request.groupName,
        userId: request.userId
      });
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          phone: request.phone,
          name: request.name,
          amount: request.amount,
          groupId: request.groupId,
          groupName: request.groupName,
          userId: request.userId
        }
      });
      
      console.log('📡 Supabase function response:', {
        data,
        error,
        hasData: !!data,
        hasError: !!error
      });

      if (error) {
        console.error('❌ Supabase function error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        throw new Error(`Supabase Error: ${error.message || 'Failed to create payment'}`);
      }

      if (!data || !data.success) {
        console.error('❌ Payment creation failed:', {
          data,
          hasData: !!data,
          dataSuccess: data?.success,
          dataError: data?.error,
          dataKeys: data ? Object.keys(data) : 'no data'
        });
        
        // Extract specific error details for better user feedback
        let errorMessage = 'Payment creation failed';
        if (data?.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          } else if (data.error.details) {
            errorMessage = data.error.details;
          }
        }
        
        throw new Error(`Payment Failed: ${errorMessage}`);
      }

      console.log('✅ Payment created successfully:', {
        orderId: data.order_id,
        amount: data.amount
      });

      return data as CreatePaymentResponse;

    } catch (error) {
      console.error('💥 CashfreeService.createPayment error:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack',
        errorType: typeof error
      });
      
      // Show user-friendly error
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payment';
      toast.error(`Payment Error: ${errorMessage}`);
      
      // Return error details for debugging
      return {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      } as any;
    }
  }

  /**
   * Validate payment details before creating order
   */
  static validatePaymentRequest(request: Partial<CreatePaymentRequest>): string | null {
    if (!request.name || request.name.trim().length < 2) {
      return 'Please enter a valid name (minimum 2 characters)';
    }

    // Clean phone number for validation
    let cleanPhone = request.phone || '';
    if (cleanPhone.startsWith('+91')) {
      cleanPhone = cleanPhone.substring(3);
    } else if (cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.substring(2);
    }
    cleanPhone = cleanPhone.replace(/[^\d]/g, '');
    
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return 'Please enter a valid 10-digit mobile number';
    }

    if (!request.amount || request.amount <= 0) {
      return 'Please enter a valid amount';
    }

    if (request.amount > 100000) {
      return 'Amount cannot exceed ₹1,00,000';
    }

    if (!request.groupId || !request.groupName) {
      return 'Group information is missing';
    }

    if (!request.userId) {
      return 'User authentication is required';
    }

    return null; // No validation errors
  }

  /**
   * Format amount for display
   */
  static formatAmount(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  /**
   * Generate customer phone from user data
   */
  static getCustomerPhone(user: any, profile: any): string {
    // Try to get phone from profile first, then user metadata
    let phone = profile?.phone || 
                user?.user_metadata?.phone || 
                user?.phone || 
                '';
    
    // Clean phone number - remove +91 prefix if present
    if (phone.startsWith('+91')) {
      phone = phone.substring(3);
    } else if (phone.startsWith('91')) {
      phone = phone.substring(2);
    }
    
    // Remove any non-digit characters
    phone = phone.replace(/[^\d]/g, '');
    
    console.log('🔍 CashfreeService.getCustomerPhone:', {
      originalPhone: profile?.phone || user?.user_metadata?.phone || user?.phone,
      cleanedPhone: phone,
      isValid: /^[6-9]\d{9}$/.test(phone)
    });
    
    return phone;
  }

  /**
   * Generate customer name from user data
   */
  static getCustomerName(user: any, profile: any): string {
    // Try to get name from profile first, then user metadata
    return profile?.name || 
           user?.user_metadata?.name || 
           user?.user_metadata?.full_name ||
           'User';
  }
}