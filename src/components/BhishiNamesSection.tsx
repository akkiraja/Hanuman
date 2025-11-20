import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Colors } from '../constants/colors';

interface BhishiNameItem {
  state: string;
  term: string;
}

interface BhishiNamesSectionProps {
  title?: string;
}

const bhishiNames: BhishiNameItem[] = [
  { state: "Maharashtra", term: "Bhishi" },
  { state: "Punjab", term: "Committee" },
  { state: "Tamil Nadu", term: "Chit Fund" },
  { state: "Kerala", term: "Kuri" },
  { state: "Andhra Pradesh", term: "Chitthi" },
  { state: "Gujarat", term: "Vishi" },
  { state: "Uttar Pradesh", term: "Committee" },
  { state: "West Bengal", term: "Chit Fund" },
  { state: "Karnataka", term: "Chit Fund" },
  { state: "Rajasthan", term: "Committee" },
  { state: "Madhya Pradesh", term: "Bachat Gat" },
  { state: "Bihar", term: "Committee" },
  { state: "Odisha", term: "Chit Fund" },
  { state: "Haryana", term: "Committee" },
  { state: "Assam", term: "Committee" },
  { state: "Jharkhand", term: "Committee" },
  { state: "Himachal Pradesh", term: "Committee" },
  { state: "Telangana", term: "Chitthi" },
];

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth * 0.32; // Show ~3 cards at once

export default function BhishiNamesSection({ title = "Known by many names across India" }: BhishiNamesSectionProps) {
  const renderBhishiCard = ({ item, index }: { item: BhishiNameItem; index: number }) => {
    return (
      <View style={[styles.card, Colors.shadow]}>
        <Text style={styles.stateName}>{item.state}</Text>
        <Text style={styles.termName}>{item.term}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>
          The same trusted system, different names across regions
        </Text>
      </View>
      
      <FlatList
        data={bhishiNames}
        renderItem={renderBhishiCard}
        keyExtractor={(item, index) => `${item.state}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        snapToInterval={cardWidth + 8} // Card width + margin
        decelerationRate="fast"
        snapToAlignment="start"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  headerContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  card: {
    width: cardWidth,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  stateName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  termName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 18,
  },
});