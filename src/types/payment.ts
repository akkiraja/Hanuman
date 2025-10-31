export interface PaymentRequest {
  phone: string;
  name: string;
  amount: number;
  groupId: string;
  groupName: string;
}

export interface PaymentResponse {
  success: boolean;
  order_id: string;
  payment_link: string;
  amount: number;
  currency: string;
  error?: string;
  details?: string;
}

export interface PaymentStatus {
  order_id: string;
  status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CashfreeConfig {
  app_id: string;
  secret_key: string;
  base_url: string;
  environment: 'sandbox' | 'production';
}