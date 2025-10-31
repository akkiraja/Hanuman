import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, TrendingDown, Users, Trophy, Clock, AlertCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import SafeBlurView from '../SafeBlurView';
import { useColorScheme } from 'react-native';

interface HelpTooltipModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function HelpTooltipModal({ visible, onClose }: HelpTooltipModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const helpSections = [
    {
      icon: <TrendingDown size={24} color={Colors.primary} />,
      title: 'How Bidding Works',
      content: 'This is a reverse auction where the LOWEST bid wins. Members compete by placing the smallest bid amount to win the prize pool.'
    },
    {
      icon: <Users size={24} color={Colors.success} />,
      title: 'Placing Bids',
      content: 'You can place or update your bid anytime during an active round. Your latest bid replaces any previous bid.'
    },
    {
      icon: <Trophy size={24} color={Colors.warning} />,
      title: 'Winning Rules',
      content: 'The member with the lowest unique bid wins the full prize amount. If there\'s a tie, the earliest bid wins.'
    },
    {
      icon: <Clock size={24} color={Colors.error} />,
      title: 'Round Timing',
      content: 'Each round has a time limit set by the admin. You can see the countdown timer and must place bids before time runs out.'
    },
    {
      icon: <AlertCircle size={24} color={Colors.textSecondary} />,
      title: 'Important Notes',
      content: 'Only group members can bid. Ensure you have paid your contribution for the current round to participate.'
    }
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeBlurView
        style={styles.container}
        tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
        intensity={100}
      >
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(248,250,252,0.5)' }]}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Bidding Guide</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.introSection}>
                <Text style={styles.introText}>
                  Welcome to reverse auction bidding! Here's everything you need to know to participate successfully.
                </Text>
              </View>
              
              {helpSections.map((section, index) => (
                <View key={index} style={styles.helpSection}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.iconContainer}>
                      {section.icon}
                    </View>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>
                  <Text style={styles.sectionContent}>{section.content}</Text>
                </View>
              ))}
              
              <View style={styles.exampleSection}>
                <Text style={styles.exampleTitle}>Example Scenario</Text>
                <View style={styles.exampleCard}>
                  <Text style={styles.exampleText}>
                    <Text style={styles.bold}>Prize Pool:</Text> ₹20,000{"\n"}
                    <Text style={styles.bold}>Bids Placed:</Text>{"\n"}
                    • Member A: ₹15,000{"\n"}
                    • Member B: ₹12,000{"\n"}
                    • Member C: ₹10,000 (Winner!){"\n"}{"\n"}
                    <Text style={styles.bold}>Result:</Text> Member C wins ₹20,000 by bidding only ₹10,000, saving ₹10,000!
                  </Text>
                </View>
              </View>
              
              <View style={styles.tipsSection}>
                <Text style={styles.tipsTitle}>Pro Tips</Text>
                <View style={styles.tipsList}>
                  <Text style={styles.tip}>• Monitor other bids and adjust your strategy</Text>
                  <Text style={styles.tip}>• Bid early to secure your position in case of ties</Text>
                  <Text style={styles.tip}>• Remember: lower bid = higher savings if you win</Text>
                  <Text style={styles.tip}>• You can update your bid multiple times</Text>
                </View>
              </View>
            </ScrollView>
            
            <TouchableOpacity style={styles.gotItButton} onPress={onClose}>
              <Text style={styles.gotItButtonText}>Got It!</Text>
            </TouchableOpacity>
          </View>
          </View>
          </SafeBlurView>
          </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  introSection: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  introText: {
    fontSize: 14,
    color: Colors.primary,
    lineHeight: 20,
    textAlign: 'center',
  },
  helpSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  sectionContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginLeft: 52,
  },
  exampleSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  exampleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  exampleText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: Colors.text,
  },
  tipsSection: {
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  tipsList: {
    backgroundColor: Colors.warning + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.warning + '20',
  },
  tip: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  gotItButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  gotItButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});