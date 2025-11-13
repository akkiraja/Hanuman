import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://noarkvnkkmbboyletpsk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vYXJrdm5ra21iYm95bGV0cHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0ODQ2MjAsImV4cCI6MjA2NjA2MDYyMH0.HkMn4RvZ2qbo0h8_Q0xIEYG_qjJYFGpYLbHrOlY7lfY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database Types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bhishi_groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          monthly_amount: number;
          total_members: number;
          current_members: number;
          draw_date: string;
          total_rounds: number;
          current_round: number;
          status: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          monthly_amount: number;
          total_members: number;
          current_members?: number;
          draw_date: string;
          total_rounds: number;
          current_round?: number;
          status?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          monthly_amount?: number;
          total_members?: number;
          current_members?: number;
          draw_date?: string;
          total_rounds?: number;
          current_round?: number;
          status?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string | null; // Nullable for unregistered/pending members
          name: string;
          email: string | null; // Nullable for unregistered members
          phone: string | null;
          joined_at: string;
          has_won: boolean;
          contribution_status: string;
          last_payment_date: string | null;
          status: 'active' | 'pending'; // active = registered, pending = unregistered
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id?: string | null; // Optional for unregistered members
          name: string;
          email?: string | null; // Optional for unregistered members
          phone?: string | null;
          joined_at?: string;
          has_won?: boolean;
          contribution_status?: string;
          last_payment_date?: string | null;
          status?: 'active' | 'pending';
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string | null;
          name?: string;
          email?: string | null;
          phone?: string | null;
          joined_at?: string;
          has_won?: boolean;
          contribution_status?: string;
          last_payment_date?: string | null;
          status?: 'active' | 'pending';
        };
      };
      draw_history: {
        Row: {
          id: string;
          group_id: string;
          round: number;
          winner_id: string | null; // Nullable for unregistered winners
          winner_member_id: string | null; // Primary reference to group_members.id
          winner_name: string;
          amount: number;
          draw_date: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          round: number;
          winner_id?: string | null; // Optional for unregistered winners
          winner_member_id?: string | null; // Primary reference to group_members.id
          winner_name: string;
          amount: number;
          draw_date?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          round?: number;
          winner_id?: string | null;
          winner_member_id?: string | null;
          winner_name?: string;
          amount?: number;
          draw_date?: string;
          status?: string;
          created_at?: string;
        };
      };
      draws: {
        Row: {
          id: string;
          group_id: string;
          created_by: string;
          status: string;
          revealed: boolean;
          start_timestamp: string;
          duration_seconds: number;
          prize_amount: number;
          winner_user_id: string | null; // Nullable for unregistered winners
          winner_name: string;
          round_number: number;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          created_by: string;
          status?: string;
          revealed?: boolean;
          start_timestamp: string;
          duration_seconds: number;
          prize_amount: number;
          winner_user_id?: string | null;
          winner_name: string;
          round_number: number;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          created_by?: string;
          status?: string;
          revealed?: boolean;
          start_timestamp?: string;
          duration_seconds?: number;
          prize_amount?: number;
          winner_user_id?: string | null;
          winner_name?: string;
          round_number?: number;
          processed_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
}