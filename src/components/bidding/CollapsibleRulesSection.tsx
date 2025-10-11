import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { BookOpen, ChevronDown, ChevronUp, Info } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { createStyles } from '../../styles/collapsibleRulesSectionStyles';

type CollapsibleRulesSectionProps = {
  defaultExpanded?: boolean;
};

type Rule = {
  title: string;
  description: string;
};

export default function CollapsibleRulesSection({ 
  defaultExpanded = false 
}: CollapsibleRulesSectionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);
  
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const rules = [
    {
      title: 'Bidding Process',
      description: 'Place the lowest unique bid to win the round prize. Your bid must be lower than the current lowest bid.'
    },
    {
      title: 'Round Duration',
      description: 'Each round has a time limit. Rounds automatically close when the timer expires or admin closes manually.'
    },
    {
      title: 'Bid Updates',
      description: 'You can update your bid during active rounds, but only to a lower amount than your current bid.'
    },
    {
      title: 'Winning Criteria',
      description: 'The member with the lowest unique bid wins the round prize. If multiple members have the same lowest bid, the first bidder wins.'
    },
    {
      title: 'Payment Rules',
      description: 'Winners must pay their bid amount to the group pool. Non-winners contribute the minimum bid amount.'
    },
    {
      title: 'Fair Play',
      description: 'All bids are final once the round closes. Ensure you can afford your bid amount before placing it.'
    }
  ];
  
  const renderRule = (rule: Rule, index: number) => (
    <View key={index} style={styles.ruleItem}>
      <View style={styles.ruleHeader}>
        <Info size={14} color={Colors.primary} />
        <Text style={styles.ruleTitle}>{rule.title}</Text>
      </View>
      <Text style={styles.ruleDescription}>{rule.description}</Text>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <BookOpen size={20} color={Colors.primary} />
          <Text style={styles.title}>Bidding Rules</Text>
        </View>
        
        <View style={styles.headerRight}>
          <Text style={styles.expandText}>
            {isExpanded ? 'Hide' : 'View'}
          </Text>
          {isExpanded ? (
            <ChevronUp size={20} color={Colors.primary} />
          ) : (
            <ChevronDown size={20} color={Colors.primary} />
          )}
        </View>
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.content}>
          <Text style={styles.rulesIntro}>
            Understanding these rules will help you participate effectively in bidding rounds:
          </Text>
          
          <View style={styles.rulesList}>
            {rules.map((rule, index) => renderRule(rule, index))}
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ℹ️ For questions about bidding rules, contact the group admin.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}