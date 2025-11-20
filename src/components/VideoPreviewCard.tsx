import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Play } from 'lucide-react-native';
import { Colors } from '../constants/colors';

interface VideoPreviewCardProps {
  onPress: () => void;
  title?: string;
  subtitle?: string;
  duration?: string;
  thumbnailUrl?: string;
}

export default function VideoPreviewCard({
  onPress,
  title = 'See how Bhishi works',
  subtitle = 'Watch a quick demo',
  duration = '1:00',
  thumbnailUrl = 'https://img.youtube.com/vi/TIrGhi0tbCs/maxresdefault.jpg',
}: VideoPreviewCardProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <ImageBackground
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnail}
          imageStyle={styles.thumbnailImage}
          resizeMode="cover"
        >
          {/* Dark gradient overlay */}
          <View style={styles.gradientOverlay} />
          
          {/* Play button */}
          <View style={styles.playButtonContainer}>
            <View style={styles.playButton}>
              <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
          
          {/* Duration badge */}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{duration}</Text>
          </View>
        </ImageBackground>
        
        {/* Info section */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  playButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    padding: 16,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
});
