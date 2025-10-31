import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { BarChart3, Target, Smartphone } from 'lucide-react-native';
import { Colors } from '../constants/colors';

interface BenefitItem {
  icon: string;
  iconColor: string;
  headline: string;
  description: string;
}

interface AppBenefitsSectionProps {
  title?: string;
}

const benefits: BenefitItem[] = [
  {
    icon: "BarChart3",
    iconColor: "#3B82F6",
    headline: "Manual register ki zarurat nahi",
    description: "Sab members, payments, aur winners auto track honge."
  },
  {
    icon: "Target",
    iconColor: "#10B981",
    headline: "Lucky draw hoga 100% fair",
    description: "App hi karega draw — koi bhedbhav nahi."
  },
  {
    icon: "Smartphone",
    iconColor: "#F59E0B",
    headline: "Sab kuch ek hi app mein",
    description: "Members jodo, reminders bhejo, aur payment track karo easily."
  }
];

export default function AppBenefitsSection({ title = "Vissi App ke Fayde" }: AppBenefitsSectionProps) {
  const renderIcon = (iconName: string, color: string) => {
    const IconComponent = iconName === 'BarChart3' ? BarChart3 : 
                        iconName === 'Target' ? Target : Smartphone;
    return (
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <IconComponent size={20} color={color} />
      </View>
    );
  };

  const renderBenefitCard = (item: BenefitItem, index: number) => {
    return (
      <View key={index} style={[styles.card, Colors.shadow]}>
        <View style={styles.cardContent}>
          {renderIcon(item.icon, item.iconColor)}
          <View style={styles.textContent}>
            <Text style={styles.headline}>{item.headline}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>
          Traditional bhishi se better — digital aur transparent
        </Text>
      </View>
      
      <View style={styles.benefitsContainer}>
        {benefits.map((benefit, index) => renderBenefitCard(benefit, index))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 24,
  },
  headerContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textContent: {
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headline: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});