import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { StyleSheet } from 'react-native';
import { User, LogOut, Mail, Phone, Calendar, Shield, Settings, Edit3, X, CreditCard, TestTube, BookOpen, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../stores/authStore';
import { Colors } from '../constants/colors';
import { toast } from 'sonner-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../libs/supabase';
import NotificationTest from '../components/NotificationTest';
import ShareBhishiAppBanner from '../components/ui/ShareBhishiAppBanner';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, profile, signOut, refreshUserData } = useAuthStore();
  const [showDevTools, setShowDevTools] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [showEditUpiModal, setShowEditUpiModal] = useState(false);
  const [newUpiId, setNewUpiId] = useState('');
  const [isUpdatingUpi, setIsUpdatingUpi] = useState(false);

  const handleSignOut = async () => {
    console.log('🚪 Profile logout button pressed');
    console.log('🔍 Current user state:', {
      isAuthenticated: !!user,
      userId: user?.id,
      email: user?.email
    });
    
    try {
      console.log('🔄 Starting logout process from profile...');
      await signOut();
      console.log('✅ Profile logout completed successfully');
      toast.success('Signed out successfully!');
    } catch (error) {
      console.error('❌ Profile logout error:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      toast.error('Failed to sign out: ' + (error?.message || 'Unknown error'));
    }
  };



  const handleEditName = () => {
    // Use profile name first, fallback to user metadata
    const currentName = profile?.name || user?.user_metadata?.name || '';
    setNewName(currentName);
    setShowEditNameModal(true);
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      toast.error('Please enter a valid name');
      return;
    }

    // Check if name is the same as current
    const currentName = profile?.name || user?.user_metadata?.name || '';
    if (newName.trim() === currentName) {
      setShowEditNameModal(false);
      return;
    }

    setIsUpdatingName(true);
    console.log('👤 === NAME UPDATE START ===');
    console.log('👤 Old Name:', currentName);
    console.log('👤 New Name:', newName.trim());
    console.log('👤 User ID:', user?.id);

    try {
      // Update profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: newName.trim() })
        .eq('id', user?.id);

      if (profileError) {
        console.error('❌ Profile name update error:', profileError);
        throw profileError;
      }

      console.log('✅ Profile name updated in database');
      
      // Refresh user data to get the updated name
      console.log('🔄 Refreshing user data to get updated name...');
      await refreshUserData();
      console.log('✅ User data refreshed');
      
      setShowEditNameModal(false);
      toast.success('Name updated successfully!');
      
      console.log('✅ === NAME UPDATE COMPLETED ===');
      console.log('👤 Modal closed, UI should now show updated name');
      
    } catch (error) {
      console.error('❌ Name update failed:', error);
      toast.error(error.message || 'Failed to update name. Please try again.');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleEditUpi = () => {
    // Use profile UPI ID
    const currentUpiId = profile?.upi_id || '';
    setNewUpiId(currentUpiId);
    setShowEditUpiModal(true);
  };

  const handleSaveUpiId = async () => {
    if (!newUpiId.trim()) {
      toast.error('Please enter a valid UPI ID');
      return;
    }

    if (!newUpiId.includes('@')) {
      toast.error('Please enter a valid UPI ID (e.g., yourname@paytm)');
      return;
    }

    // Check if UPI ID is the same as current
    const currentUpiId = profile?.upi_id || '';
    if (newUpiId.trim() === currentUpiId) {
      setShowEditUpiModal(false);
      return;
    }

    setIsUpdatingUpi(true);
    console.log('💳 === UPI ID UPDATE START ===');
    console.log('💳 Old UPI ID:', profile?.upi_id);
    console.log('💳 New UPI ID:', newUpiId.trim());
    console.log('💳 User ID:', user?.id);

    try {
      // Update profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ upi_id: newUpiId.trim() })
        .eq('id', user?.id);

      if (profileError) {
        console.error('❌ Profile UPI update error:', profileError);
        throw profileError;
      }

      console.log('✅ Profile UPI ID updated in database');
      
      // Refresh user data to get the updated UPI ID
      console.log('🔄 Refreshing user data to get updated UPI ID...');
      await refreshUserData();
      console.log('✅ User data refreshed');
      
      setShowEditUpiModal(false);
      toast.success('UPI ID updated successfully!');
      
      console.log('✅ === UPI ID UPDATE COMPLETED ===');
      console.log('💳 Modal closed, UI should now show updated UPI ID');
      
    } catch (error) {
      console.error('❌ UPI ID update failed:', error);
      toast.error(error.message || 'Failed to update UPI ID. Please try again.');
    } finally {
      setIsUpdatingUpi(false);
    }
  };

  const userInfo = [
    {
      icon: Mail,
      label: 'Email',
      value: user?.email || 'Not provided',
      editable: false,
    },
    {
      icon: User,
      label: 'Name',
      value: profile?.name || user?.user_metadata?.name || 'Not provided',
      editable: true,
      onEdit: handleEditName,
    },
    {
      icon: Phone,
      label: 'Phone',
      value: profile?.phone || user?.user_metadata?.phone || user?.phone || 'Not provided',
      editable: false,
    },
    {
      icon: CreditCard,
      label: 'UPI ID',
      value: profile?.upi_id || 'Not provided',
      editable: true,
      onEdit: handleEditUpi,
    },
    {
      icon: Calendar,
      label: 'Member Since',
      value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown',
      editable: false,
    },
    {
      icon: Shield,
      label: 'User ID',
      value: user?.id?.slice(0, 8) + '...' || 'Unknown',
      editable: false,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>Manage your account settings</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, Colors.shadow]}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={32} color={Colors.background} />
            </View>
          </View>
          
          <Text style={styles.userName}>
            {profile?.name || user?.user_metadata?.name || 'User'}
          </Text>
          <Text style={styles.userEmail}>
            {profile?.email || user?.email || profile?.phone || 'No contact info'}
          </Text>
        </View>

        {/* Share Bhishi App Banner */}
        <ShareBhishiAppBanner userName={profile?.name || user?.user_metadata?.name || 'Aapke dost'} />

        {/* User Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          {userInfo.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <View key={index} style={[styles.infoCard, Colors.shadow]}>
                <View style={styles.infoIcon}>
                  <IconComponent size={20} color={Colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
                {item.editable && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={item.onEdit}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={16} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
          style={[styles.actionButton, styles.devButton, Colors.shadow]}
          onPress={() => setShowDevTools(!showDevTools)}
          activeOpacity={0.7}
          >
          <Settings size={20} color={Colors.primary} />
          <Text style={styles.devButtonText}>
          {showDevTools ? 'Hide' : 'Show'} Dev Tools
          </Text>
          </TouchableOpacity>

          {/* Dashboard Testing Button - Hidden per user request */}
          {/* <TouchableOpacity
            style={[styles.actionButton, styles.testingButton, Colors.shadow]}
            onPress={() => navigation.navigate('DashboardTesting' as never)}
            activeOpacity={0.7}
          >
            <TestTube size={20} color={Colors.warning} />
            <Text style={styles.testingButtonText}>Dashboard Testing</Text>
          </TouchableOpacity> */}

          {/* Help & Tutorials Section */}
          <TouchableOpacity
            style={[styles.actionButton, styles.tutorialsButton, Colors.shadow]}
            onPress={() => navigation.navigate('Tutorials' as never)}
            activeOpacity={0.7}
          >
            <View style={styles.tutorialsContent}>
              <BookOpen size={20} color={Colors.primary} />
              <Text style={styles.tutorialsButtonText}>📚 Help & Tutorials</Text>
            </View>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
                        style={[styles.actionButton, styles.logoutButton, Colors.shadow]}
                        onPress={handleSignOut}
                        activeOpacity={0.7}
                      >
            <LogOut size={20} color={Colors.background} />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Testing (Development) */}
        <NotificationTest visible={showDevTools} />

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>My Bhishi App v1.0</Text>
          <Text style={styles.footerSubtext}>Built with ❤️ for community savings</Text>
        </View>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditNameModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Name</Text>
            <TouchableOpacity 
              onPress={handleUpdateName}
              disabled={isUpdatingName}
            >
              <Text style={[
                styles.saveButton,
                isUpdatingName && { color: Colors.textSecondary }
              ]}>
                {isUpdatingName ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.nameInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textSecondary}
                autoFocus
                editable={!isUpdatingName}
              />
              <Text style={styles.inputHint}>
                This name will be displayed in your profile and groups
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit UPI ID Modal */}
      <Modal
        visible={showEditUpiModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditUpiModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit UPI ID</Text>
            <TouchableOpacity 
              onPress={handleSaveUpiId}
              disabled={isUpdatingUpi}
            >
              <Text style={[
                styles.saveButton,
                isUpdatingUpi && { color: Colors.textSecondary }
              ]}>
                {isUpdatingUpi ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>UPI ID</Text>
              <TextInput
                style={styles.nameInput}
                value={newUpiId}
                onChangeText={setNewUpiId}
                placeholder="yourname@paytm, yourname@gpay, yourname@phonepe"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoFocus
                editable={!isUpdatingUpi}
              />
              <Text style={styles.inputHint}>
                This UPI ID will be used for receiving payments when you win the draw
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    margin: 20,
    marginTop: 10,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  section: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  actionButton: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  devButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  devButtonText: {
  color: Colors.primary,
  fontSize: 16,
  fontWeight: '600',
  marginLeft: 8,
  },
      testingButton: {
        backgroundColor: Colors.warning + '20',
        borderWidth: 1,
        borderColor: Colors.warning + '40',
      },
      testingButtonText: {
        color: Colors.warning,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
      },
  tutorialsButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tutorialsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tutorialsButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },

  logoutButton: {
    backgroundColor: Colors.error,
  },
  logoutButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  // Edit button styles
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  cancelButton: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  inputHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  // Invite section styles
  inviteButton: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inviteContent: {
    flex: 1,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  inviteSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
});