import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { X, Crown, Shield, UserMinus } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Member } from '../../types/chitFund';
import { ChitGroup } from '../../types/chitFund';
import AdminBadge from './AdminBadge';
import ConfirmationModal from './ConfirmationModal';
import { isGroupAdmin } from '../../utils/adminHelpers';

interface AdminManagementModalProps {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  currentCoAdminId: string | null | undefined;
  creatorId: string;
  currentUserId: string;
  currentGroup: ChitGroup;
  onAppointCoAdmin: (memberId: string) => Promise<void>;
  onRemoveCoAdmin: () => Promise<void>;
}

export default function AdminManagementModal({
  visible,
  onClose,
  members,
  currentCoAdminId,
  creatorId,
  currentUserId,
  currentGroup,
  onAppointCoAdmin,
  onRemoveCoAdmin,
}: AdminManagementModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAppointConfirm, setShowAppointConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Only creator can manage co-admin
  const isCreator = currentUserId === creatorId;
  
  console.log('🛡️ AdminManagementModal rendered:', {
    visible,
    isCreator,
    currentUserId,
    creatorId,
    currentCoAdminId,
    totalMembers: members.length,
  });
  
  // Filter out creator and get eligible members (active members only)
  const eligibleMembers = members.filter(
    (m) => m.user_id !== creatorId && m.isActive && m.user_id
  );
  
  console.log('👥 Eligible members for co-admin:', eligibleMembers.map(m => ({
    id: m.id,
    name: m.name,
    user_id: m.user_id,
    isActive: m.isActive,
  })));

  const handleAppointCoAdmin = (member: Member) => {
    console.log('🎯 handleAppointCoAdmin called for:', {
      member: member.name,
      user_id: member.user_id,
      isProcessing,
    });
    
    if (!member.user_id) {
      console.error('❌ Cannot appoint co-admin: member has no user_id');
      return;
    }
    
    setSelectedMember(member);
    setShowAppointConfirm(true);
    console.log('📋 Showing appointment confirmation modal');
  };
  
  const confirmAppointCoAdmin = async () => {
    if (!selectedMember) return;
    
    console.log('✅ User confirmed appointment, processing...');
    setIsProcessing(true);
    setShowAppointConfirm(false);
    
    try {
      console.log('📞 Calling onAppointCoAdmin with user_id:', selectedMember.user_id);
      await onAppointCoAdmin(selectedMember.user_id);
      console.log('✅ Co-admin appointed successfully');
      
      // Brief delay to allow parent screen to re-render with fresh data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSelectedMember(null);
      onClose();
    } catch (error) {
      console.error('❌ Failed to appoint co-admin:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveCoAdmin = () => {
    const coAdmin = members.find((m) => m.user_id === currentCoAdminId);
    setSelectedMember(coAdmin || null);
    setShowRemoveConfirm(true);
    console.log('📋 Showing remove co-admin confirmation modal');
  };
  
  const confirmRemoveCoAdmin = async () => {
    console.log('✅ User confirmed co-admin removal, processing...');
    setIsProcessing(true);
    setShowRemoveConfirm(false);
    
    try {
      await onRemoveCoAdmin();
      console.log('✅ Co-admin removed successfully');
      
      // Brief delay to allow parent screen to re-render with fresh data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSelectedMember(null);
      onClose();
    } catch (error) {
      console.error('❌ Failed to remove co-admin:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderMemberItem = ({ item }: { item: Member }) => {
    // Use isGroupAdmin helper to check if member is admin (creator OR co-admin)
    const isAdmin = isGroupAdmin(item.user_id, currentGroup);
    const isCurrentCoAdmin = item.user_id === currentCoAdminId;
    
    console.log('🔵 Rendering member item:', {
      name: item.name,
      user_id: item.user_id,
      isAdmin,
      isCurrentCoAdmin,
      isProcessing,
      disabled: isProcessing || isAdmin,
    });

    return (
      <TouchableOpacity
        style={[styles.memberItem, isAdmin && styles.memberItemActive]}
        onPress={() => {
          console.log('🖱️ Member item pressed:', item.name);
          if (!isAdmin) {
            handleAppointCoAdmin(item);
          } else {
            console.log('⚠️ Cannot select: already admin');
          }
        }}
        disabled={isProcessing || isAdmin}
        activeOpacity={0.7}
      >
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name}</Text>
          {item.phone && <Text style={styles.memberPhone}>{item.phone}</Text>}
        </View>
        {isAdmin ? (
          <View style={styles.rightSection}>
            <AdminBadge role="Admin" size="small" />
            {isCurrentCoAdmin && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveCoAdmin}
                disabled={isProcessing}
              >
                <UserMinus size={18} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Shield size={20} color={Colors.textSecondary} />
        )}
      </TouchableOpacity>
    );
  };

  if (!isCreator) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Crown size={24} color={Colors.warning} />
              <Text style={styles.headerTitle}>Manage Co-Admin</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>
              {currentCoAdminId
                ? 'Your co-admin has full powers. Tap to appoint a different member or remove them.'
                : 'Appoint a co-admin to help manage this group. They will have all admin powers including starting draws/rounds and adding members.'}
            </Text>
          </View>

          {/* Member List */}
          <FlatList
            data={eligibleMembers}
            keyExtractor={(item) => item.id}
            renderItem={renderMemberItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Shield size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>No eligible members</Text>
                <Text style={styles.emptySubtext}>
                  Add active members to appoint a co-admin
                </Text>
              </View>
            }
          />
        </View>
        
        {/* Appointment Confirmation Modal */}
        <ConfirmationModal
          visible={showAppointConfirm}
          title="Appoint Co-Admin"
          message={`Are you sure you want to appoint ${selectedMember?.name} as Co-Admin? They will have full admin powers including starting draws/rounds and managing members.`}
          confirmText="Appoint"
          cancelText="Cancel"
          confirmStyle="default"
          onConfirm={confirmAppointCoAdmin}
          onCancel={() => {
            setShowAppointConfirm(false);
            setSelectedMember(null);
          }}
          isProcessing={isProcessing}
        />
        
        {/* Remove Confirmation Modal */}
        <ConfirmationModal
          visible={showRemoveConfirm}
          title="Remove Co-Admin"
          message={`Are you sure you want to remove ${selectedMember?.name || 'the co-admin'}? They will lose all admin powers.`}
          confirmText="Remove"
          cancelText="Cancel"
          confirmStyle="destructive"
          onConfirm={confirmRemoveCoAdmin}
          onCancel={() => {
            setShowRemoveConfirm(false);
            setSelectedMember(null);
          }}
          isProcessing={isProcessing}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '80%',
    ...Colors.shadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  descriptionBox: {
    backgroundColor: Colors.primary + '10',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  descriptionText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberItemActive: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary + '40',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  memberPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
