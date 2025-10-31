import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Users, Shuffle, CreditCard } from 'lucide-react-native';

interface HowItWorksSectionProps {
  title?: string;
}

interface StepData {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string;
}

const steps: StepData[] = [
  {
    number: "1",
    icon: <Users size={20} color={Colors.background} />,
    title: "Create Group",
    description: "Set up your committee with members and monthly amount",
    details: "• Add members\n• Set contribution\n• Choose draw date"
  },
  {
    number: "2",
    icon: <Shuffle size={20} color={Colors.background} />,
    title: "Fair Draw",
    description: "Automated lucky draw selects the winner",
    details: "• Transparent process\n• Equal chances\n• Instant results"
  },
  {
    number: "3",
    icon: <CreditCard size={20} color={Colors.background} />,
    title: "Get Paid",
    description: "Winner receives the full amount instantly",
    details: "• UPI payments\n• Secure transfers\n• Quick process"
  }
];

export default function HowItWorksSection({ title = "How it works" }: HowItWorksSectionProps) {
  const getStepColors = (index: number) => {
    const colors = [
      { bg: Colors.primary, light: Colors.primary + '15' },
      { bg: Colors.success, light: Colors.success + '15' },
      { bg: Colors.warning, light: Colors.warning + '15' }
    ];
    return colors[index] || colors[0];
  };
  
  const renderStep = (step: StepData, index: number) => {
    const isLast = index === steps.length - 1;
    const stepColors = getStepColors(index);
    
    return (
      <View key={index} style={styles.stepContainer}>
        {/* Step Card */}
        <View style={[styles.stepCard, Colors.shadow, { borderLeftColor: stepColors.bg }]}>
          {/* Step Header */}
          <View style={styles.stepHeader}>
            <View style={[styles.stepIconContainer, { backgroundColor: stepColors.bg }]}>
              <Text style={styles.stepNumber}>{step.number}</Text>
              {step.icon}
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>
          
          {/* Step Details */}
          <View style={styles.stepContent}>
            <Text style={styles.stepDetails}>{step.details}</Text>
          </View>
        </View>
        
        {/* Connector Line */}
        {!isLast && (
          <View style={[styles.connectorLine, { backgroundColor: stepColors.bg + '30' }]} />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>
          Your complete committee journey in 3 simple steps
        </Text>
      </View>
      
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => renderStep(step, index))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  headerContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  stepsContainer: {
    paddingHorizontal: 20,
  },
  stepContainer: {
    position: 'relative',
  },
  stepCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    flexDirection: 'row',
    gap: 4,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.background,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  stepContent: {
    paddingLeft: 64,
  },
  stepDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  connectorLine: {
    position: 'absolute',
    left: 44,
    top: 60,
    bottom: -12,
    width: 2,
    zIndex: -1,
  },
});