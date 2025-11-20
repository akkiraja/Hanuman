import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Plus } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import BhishiNamesSection from './BhishiNamesSection';
import AppBenefitsSection from './AppBenefitsSection';

interface EmptyDashboardProps {
  onCreateGroup: () => void;
  userName?: string;
}

export default function EmptyDashboard({ onCreateGroup, userName }: EmptyDashboardProps) {
  return (
    <View style={styles.container}>
      {/* Welcome Section */}
      <View style={[styles.welcomeCard, Colors.shadow]}>
        <View style={styles.welcomeHeader}>
          <Text style={styles.welcomeEmoji}>💰</Text>
          <Text style={styles.welcomeTitle}>
            Start Your Financial Journey
          </Text>
        </View>
        
        <Text style={styles.welcomeDescription}>
          Create or join groups to save money together and support each other's financial goals.
        </Text>
        

      </View>

      {/* Educational Section */}
      <BhishiNamesSection />

      {/* App Benefits Section */}
      <AppBenefitsSection />

      {/* Call to Action */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[styles.createButtonContainer, Colors.shadow]}
          onPress={onCreateGroup}
        >
          <LinearGradient
            colors={[Colors.primary + 'E6', Colors.primary + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButton}
          >
            <Plus size={24} color={Colors.background} />
            <Text style={styles.createButtonText}>Create Your First Bhishi</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.ctaSubtext}>
          Start building your financial community today
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  welcomeCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 16,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    lineHeight: 28,
  },
  welcomeDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 0,
  },


  ctaContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  createButtonContainer: {
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 280,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  createButtonText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  ctaSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});