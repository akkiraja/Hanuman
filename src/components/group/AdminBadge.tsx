import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Crown, Shield } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

interface AdminBadgeProps {
  role: 'Creator' | 'Co-Admin' | 'Admin';
  size?: 'small' | 'medium';
}

export default function AdminBadge({ role, size = 'medium' }: AdminBadgeProps) {
  // Normalize all admin roles to display "Admin"
  const displayRole = ['Creator', 'Co-Admin', 'CoAdmin', 'Admin'].includes(role) ? 'Admin' : role;
  const iconSize = size === 'small' ? 12 : 14;
  const badgeStyle = size === 'small' ? styles.badgeSmall : styles.badge;
  const textStyle = size === 'small' ? styles.badgeTextSmall : styles.badgeText;

  return (
    <View style={[badgeStyle, styles.adminBadge]}>
      <Shield size={iconSize} color={Colors.primary} />
      <Text style={[textStyle, styles.adminText]}>
        {displayRole}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  adminBadge: {
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  badgeTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  adminText: {
    color: Colors.primary,
  },
});
