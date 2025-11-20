import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../libs/supabase';
import { useChitStore } from './chitStore';
import { STORAGE_KEYS } from '../constants';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { notificationService } from '../services/notificationService';

interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  upi_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isOtpFlowActive: boolean; // Track if OTP flow is in progress
  authStep: 'phone' | 'otp' | 'email' | 'name'; // Persistent step state
  phoneNumber: string; // Store phone number for OTP flow
}

interface AuthActions {
signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
signIn: (email: string, password: string) => Promise<void>;
signInWithPhone: (phone: string) => Promise<{ user: null; session: null; messageId?: string | null; }>;
verifyPhoneOTP: (phone: string, otp: string) => Promise<{ success: boolean; error: string | null; session: any; user: any; profile: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshUserData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  initialize: () => Promise<void>;
  setAuthStep: (step: 'phone' | 'otp' | 'email' | 'name') => void;
  setPhoneNumber: (phone: string) => void;
  createUserProfile: (name: string) => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(persist(
  (set, get) => ({
    // Initial state
    user: null,
    profile: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
    isOtpFlowActive: false,
    authStep: 'phone',
    phoneNumber: '',

    initialize: async () => {
      set({ 
        isLoading: true,
        isOtpFlowActive: false, // Always reset OTP flow on app startup
        authStep: 'phone' // Reset to phone step
      });
      
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          set({ error: error.message, isLoading: false });
          return;
        }

        if (session?.user) {
          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Profile error:', profileError);
          }

          // Only authenticate users who have profiles
          // Phone users without profiles should go through name collection first
          if (profile) {
            console.log('✅ User with profile found during initialization - authenticating');
            set({
              user: session.user,
              session,
              profile: profile,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
          } else {
            console.log('🆕 User without profile found during initialization');
            // For users without profiles during initialization, sign them out
            // They need to go through the complete OTP flow again
            console.log('🔄 Signing out user without profile - they need to complete registration');
            
            // Sign out the user so they start fresh
            await supabase.auth.signOut();
            
            set({
              user: null,
              session: null,
              profile: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              isOtpFlowActive: false,
              authStep: 'phone' // Start fresh with phone verification
            });
          }
        } else {
          set({
            user: null,
            session: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false
          });
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('🔄 Auth state changed:', event, session?.user?.email || session?.user?.phone || 'No user');
          
          const currentState = get();
          console.log('🔍 Current OTP flow status:', { isOtpFlowActive: currentState.isOtpFlowActive });
          
          if (session?.user) {
            console.log('👤 User found in session, updating auth state...');
            
            // Get user profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('❌ Profile fetch error:', profileError);
            }

            // Handle different scenarios based on profile existence
            if (profile) {
              // User has profile - authenticate normally
              console.log('✅ User with profile - authenticating and showing dashboard');
              // Force clear any existing errors on successful authentication
              const currentState = get();
              if (currentState.error) {
                console.log('🧹 Clearing stale error on successful authentication:', currentState.error);
              }
              set({
                user: session.user,
                session,
                profile: profile,
                isAuthenticated: true,
                error: null, // Force clear any stale errors
                isOtpFlowActive: false,
                authStep: 'phone' // Reset for next time
              });
            } else {
              // User has no profile - check if they're in an active OTP flow
              console.log('🆕 User without profile detected');
              const currentState = get();
              
              if (currentState.isOtpFlowActive) {
                console.log('🔄 Continuing OTP flow - allowing profile creation');
                // Force clear any existing errors for new users in OTP flow
                if (currentState.error) {
                  console.log('🧹 Clearing stale error for new user in OTP flow:', currentState.error);
                }
                set({
                  user: session.user,
                  session,
                  profile: null,
                  isAuthenticated: false, // Don't authenticate until profile exists
                  error: null, // Force clear any stale errors
                  isOtpFlowActive: true, // Keep OTP flow active for profile creation
                  authStep: 'name' // Go to name collection
                });
              } else {
                console.log('🔄 No active OTP flow - user needs to start fresh');
                set({
                  user: null,
                  session: null,
                  profile: null,
                  isAuthenticated: false,
                  error: null,
                  isOtpFlowActive: false,
                  authStep: 'phone' // Start with phone verification
                });
              }
            }
          } else {
            // No user in session - always clear state
            console.log('🚫 No user in session, clearing auth state');
            set({
              user: null,
              session: null,
              profile: null,
              isAuthenticated: false,
              isOtpFlowActive: false, // Always reset OTP flow when no session
              authStep: 'phone' // Reset to phone step
            });
          }
        });
      } catch (error) {
        console.error('Initialize error:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to initialize auth',
          isLoading: false 
        });
      }
    },

    signUp: async (email: string, password: string, name: string, phone?: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              phone: phone || null
            }
          }
        });

        if (error) {
          set({ error: error.message, isLoading: false });
          return;
        }

        if (data.user) {
          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email,
              name,
              phone: phone || null
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }
        }

        set({ isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Sign up failed',
          isLoading: false 
        });
      }
    },

    // Helper function to claim pending group invites after login
    claimInvitesForUser: async (userId: string) => {
      try {
        console.log('🔗 Claiming pending group invites for user:', userId);
        const { data, error } = await supabase.rpc('claim_group_invites_for_user', {
          p_user_id: userId,
        });
        
        if (error) {
          console.error('❌ Error claiming invites:', error);
        } else {
          console.log(`✅ Successfully claimed ${data || 0} pending group invite(s)`);
          
          // Refresh groups if any invites were claimed
          if (data > 0) {
            const { fetchGroups } = useChitStore.getState();
            await fetchGroups();
            console.log('✅ Groups refreshed after claiming invites');
          }
        }
        
        return data || 0;
      } catch (err) {
        console.error('❌ claimInvitesForUser failed:', err);
        return 0;
      }
    },

    signIn: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          set({ error: error.message, isLoading: false });
          return;
        }

        // Claim any pending group invites
        if (data.user) {
          await get().claimInvitesForUser(data.user.id);
        }

        set({ isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Sign in failed',
          isLoading: false 
        });
      }
    },

    signInWithPhone: async (phone: string) => {
      set({ isLoading: true, error: null, isOtpFlowActive: true, phoneNumber: phone });
      
      try {
        console.log('📱 Sending OTP to:', phone);
        console.log('🔄 OTP flow started - preventing premature redirects');
        
        const { data, error } = await supabase.auth.signInWithOtp({
          phone: phone,
          options: {
            channel: 'sms',
          }
        });

        if (error) {
          console.error('❌ Send OTP error:', error);
          set({ error: error.message, isLoading: false, isOtpFlowActive: false });
          throw new Error(error.message);
        }

        console.log('✅ OTP sent successfully:', data);
        set({ isLoading: false }); // Keep isOtpFlowActive: true and phoneNumber stored
        return data;
      } catch (error) {
        console.error('💥 Send OTP error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP';
        set({ 
          error: errorMessage,
          isLoading: false,
          isOtpFlowActive: false,
          phoneNumber: ''
        });
        throw new Error(errorMessage);
      }
    },

    verifyPhoneOTP: async (phone: string, otp: string): Promise<{ success: boolean; error: string | null; session: any; user: any; profile: any }> => {
      set({ isLoading: true, error: null });
      
      try {
        console.log('🔐 Verifying OTP for:', phone);
        
        const { data, error } = await supabase.auth.verifyOtp({
          phone: phone,
          token: otp,
          type: 'sms'
        });

        if (error) {
          console.error('❌ Verify OTP error:', error);
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message, session: null, user: null, profile: null };
        }

        console.log('✅ OTP verified successfully:', data);
        
        if (data.user) {
          // Check if user profile exists
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (profileError && profileError.code !== 'PGRST116') {
            console.error('❌ Profile check error:', profileError);
          }
          
          if (existingProfile) {
            console.log('✅ Existing user found - redirecting to dashboard');
            
            // Claim any pending group invites for this user
            await get().claimInvitesForUser(data.user.id);
            
            // Existing user - go directly to dashboard
            set({
              user: data.user,
              session: data.session,
              profile: existingProfile,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              isOtpFlowActive: false,
              authStep: 'phone' // Reset for next time
            });
            return { success: true, error: null, session: data.session, user: data.user, profile: existingProfile };
          } else {
            console.log('🆕 New user - collecting name first');
            // New user - collect name first
            set({
              user: data.user,
              session: data.session,
              profile: null,
              isAuthenticated: false, // Don't authenticate until profile is created
              isLoading: false,
              error: null,
              isOtpFlowActive: true, // Keep OTP flow active
              authStep: 'name' // Go to name collection
            });
            return { success: true, error: null, session: data.session, user: data.user, profile: null };
          }
        }
        
        return { success: false, error: 'No user data received', session: null, user: null, profile: null };
      } catch (error) {
        console.error('💥 Verify OTP error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to verify OTP';
        set({ 
          error: errorMessage,
          isLoading: false,
          isOtpFlowActive: false,
          authStep: 'phone' // Reset on error
        });
        return { success: false, error: errorMessage, session: null, user: null, profile: null };
      }
    },

    signOut: async () => {
      set({ isLoading: true });
      
      try {
        console.log('🔓 Starting sign out process...');
        
        // Try to remove push notification token (non-blocking)
        try {
          console.log('🔔 Removing push token...');
          await notificationService.removePushToken();
          console.log('✅ Push token removed');
        } catch (tokenError) {
          console.warn('⚠️ Failed to remove push token (continuing anyway):', tokenError);
        }
        
        // Clear local storage
        try {
          console.log('🗑️ Clearing local storage...');
          await AsyncStorage.multiRemove([
            STORAGE_KEYS.AUTH_STORE,
            STORAGE_KEYS.CHIT_STORE
          ]);
          console.log('✅ Local storage cleared');
        } catch (storageError) {
          console.warn('⚠️ Failed to clear storage (continuing anyway):', storageError);
        }
        
        // Sign out from Supabase
        console.log('🔐 Signing out from Supabase...');
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error('❌ Supabase sign out error:', error);
          // Even if Supabase sign out fails, clear local state
          console.log('🔄 Clearing local state anyway...');
        }

        console.log('✅ Sign out completed - clearing state');
        set({
          user: null,
          profile: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
        
      } catch (error) {
        console.error('💥 Sign out error:', error);
        // Force clear state even on error
        console.log('🔄 Force clearing state due to error...');
        set({
          user: null,
          profile: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    },

    resetPassword: async (email: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        
        if (error) {
          set({ error: error.message, isLoading: false });
          return;
        }

        set({ isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Password reset failed',
          isLoading: false 
        });
      }
    },

    updatePassword: async (password: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const { error } = await supabase.auth.updateUser({ password });
        
        if (error) {
          set({ error: error.message, isLoading: false });
          return;
        }

        set({ isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Password update failed',
          isLoading: false 
        });
      }
    },

    updateProfile: async (updates: Partial<Profile>) => {
      const { user } = get();
      if (!user) return;

      set({ isLoading: true, error: null });
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();

        if (error) {
          set({ error: error.message, isLoading: false });
          return;
        }

        set({ profile: data, isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Profile update failed',
          isLoading: false 
        });
      }
    },

    refreshUserData: async () => {
      const { user } = get();
      if (!user) return;

      try {
        console.log('🔄 Refreshing user data...');
        
        // Get fresh user data from auth
        const { data: { user: freshUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('❌ Error refreshing user:', userError);
          return;
        }
        
        // Get fresh profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('❌ Error refreshing profile:', profileError);
          return;
        }

        // Update state with fresh data
        set({
          user: freshUser || user,
          profile: profile
        });
        
        console.log('✅ User data refreshed successfully');
      } catch (error) {
        console.error('❌ Error refreshing user data:', error);
      }
    },

    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
    setAuthStep: (authStep) => {
      console.log('🔄 Auth step changed to:', authStep);
      set({ authStep });
    },
    setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
    
    createUserProfile: async (name: string) => {
      const { user, phoneNumber } = get();
      if (!user) {
        throw new Error('No user found');
      }
      
      set({ isLoading: true, error: null });
      
      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.error('❌ Profile creation timeout - forcing loading to false');
        set({ 
          error: 'Profile creation is taking too long. Please try again.',
          isLoading: false 
        });
      }, 30000); // 30 second timeout
      
      try {
        console.log('👤 Creating profile for new user:', user.id);
        
        // Use existing session from state, or fetch fresh one if needed
        let { session } = get();
        if (!session) {
          console.log('🔄 No session in state, fetching fresh session...');
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !sessionData.session) {
            console.error('❌ Cannot get session:', sessionError);
            set({ error: 'Authentication session expired. Please try logging in again.', isLoading: false });
            throw new Error('No active session found');
          }
          session = sessionData.session;
          console.log('✅ Fresh session retrieved:', session.user.id);
        } else {
          console.log('✅ Using existing session for profile creation:', session.user.id);
        }
        
        // Skip auth metadata update for now - focus on profile creation
        console.log('📝 Skipping auth metadata update, focusing on profile creation...');
        const authData = { user: session.user }; // Use existing session user
        
        // Step 2: Create profile in database with retry logic
        console.log('📝 Creating profile in database...');
        
        // First, let's verify auth.uid() vs session.user.id
        console.log('🔍 Session user ID:', session.user.id);
        
        // Get current auth.uid() to compare
        const { data: currentUser, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('❌ Cannot get current user for auth.uid() comparison:', userError);
        } else {
          console.log('🔍 Current auth.uid():', currentUser.user?.id);
          console.log('🔍 IDs match:', session.user.id === currentUser.user?.id);
        }
        
        let profile: any = null;
        let profileError: any = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        // Retry profile creation with delay to allow auth.uid() to be available
        while (retryCount < maxRetries && !profile) {
          if (retryCount > 0) {
            console.log(`🔄 Retrying profile creation (attempt ${retryCount + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          }
          
          const insertData = {
            id: session.user.id, // Use session user ID to match auth.uid()
            email: session.user.email || null,
            name: name,
            phone: phoneNumber,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          console.log('📝 Attempting to insert profile with data:', insertData);
          
          const { data, error } = await supabase
            .from('profiles')
            .insert(insertData)
            .select()
            .single();
            
          console.log('📝 Profile insert result:');
          console.log('  - Data:', data);
          console.log('  - Error:', error);
          console.log('  - Error details:', error?.details);
          console.log('  - Error hint:', error?.hint);
          console.log('  - Error code:', error?.code);
          
          if (error) {
            console.error(`❌ Profile creation error (attempt ${retryCount + 1}):`, error);
            profileError = error;
            retryCount++;
          } else {
            profile = data;
            console.log('✅ Profile created successfully:', profile);
            break;
          }
        }
        
        // If all retries failed, throw error
        if (!profile && profileError) {
          console.error('❌ Profile creation failed after all retries:', profileError);
          set({ error: profileError.message, isLoading: false });
          throw new Error(profileError.message);
        }
        
        console.log('✅ Profile created successfully:', profile);
        
        // Update auth state with updated user and profile data
        set({
          user: authData?.user || session.user, // Use updated user data with metadata, fallback to session user
          profile: profile,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          isOtpFlowActive: false,
          authStep: 'phone', // Reset for next time
          phoneNumber: '' // Clear phone number
        });
        
        console.log('✅ Auth state updated with profile data');
        console.log('✅ User should now be redirected to dashboard');
        
        // Clear timeout since we succeeded
        clearTimeout(timeoutId);
        
        console.log('✅ New user setup complete - redirecting to dashboard');
        return profile;
      } catch (error) {
        // Clear timeout on error
        clearTimeout(timeoutId);
        console.error('💥 Profile creation error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create profile';
        set({ 
          error: errorMessage,
          isLoading: false
        });
        throw new Error(errorMessage);
      }
    }
  }),
  {
    name: STORAGE_KEYS.AUTH_STORE,
    storage: {
      getItem: async (name: string) => {
        const value = await AsyncStorage.getItem(name);
        return value ? JSON.parse(value) : null;
      },
      setItem: async (name: string, value: any) => {
        await AsyncStorage.setItem(name, JSON.stringify(value));
      },
      removeItem: async (name: string) => {
        await AsyncStorage.removeItem(name);
      }
    },
    partialize: (state) => ({
      // Only persist non-sensitive data
      isAuthenticated: state.isAuthenticated
    })
  }
));