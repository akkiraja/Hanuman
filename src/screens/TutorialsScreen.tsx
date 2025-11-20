import React from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Play, BookOpen, Video, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { StyleSheet } from 'react-native';
import HowItWorksSection from '../components/HowItWorksSection';

const { width } = Dimensions.get('window');

interface VideoItem {
  id: string;
  title: string;
  description: string;
  url: string;
  embedUrl: string;
  duration?: string;
  type: 'short' | 'video';
}

const tutorials: VideoItem[] = [
  {
    id: '1',
    title: 'What is Bhishi/Committee? Quick Overview',
    description: 'A quick introduction to the concept of Bhishi (Committee) and how it works in Indian communities.',
    url: 'https://www.youtube.com/shorts/KIQflnSYvTM',
    embedUrl: 'https://www.youtube.com/embed/KIQflnSYvTM',
    duration: '1 min',
    type: 'short'
  },
  {
    id: '2', 
    title: 'Complete Guide to Committee System',
    description: 'Detailed explanation of how committee/bhishi works, benefits, and practical examples.',
    url: 'https://www.youtube.com/watch?v=D5vzo21-MGg&t=657s',
    embedUrl: 'https://www.youtube.com/embed/D5vzo21-MGg?start=657',
    duration: '15 min',
    type: 'video'
  },
  {
    id: '3',
    title: 'Committee Benefits & How to Start',
    description: 'Learn about the advantages of joining a committee and step-by-step guide to start your own.',
    url: 'https://www.youtube.com/watch?v=7XbuGKmDVp0',
    embedUrl: 'https://www.youtube.com/embed/7XbuGKmDVp0',
    duration: '12 min',
    type: 'video'
  }
];

export default function TutorialsScreen() {
  const navigation = useNavigation();

  const VideoCard = ({ video }: { video: VideoItem }) => (
    <View style={[styles.videoCard, Colors.shadow]}>
      {/* Embedded Video Player */}
      <View style={styles.videoContainer}>
        <WebView
          source={{ uri: video.embedUrl }}
          style={styles.webview}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          allowsFullscreenVideo={true}
          mixedContentMode="compatibility"
          originWhitelist={['*']}
          onLoadStart={() => console.log('Video loading started:', video.title)}
          onLoad={() => console.log('Video loaded successfully:', video.title)}
          onError={(error) => console.error('Video load error:', error.nativeEvent)}
        />
        <View style={styles.videoOverlay}>
          <View style={styles.videoTypeTag}>
            {video.type === 'short' ? (
              <Video size={12} color={Colors.background} />
            ) : (
              <Play size={12} color={Colors.background} />
            )}
            <Text style={styles.videoTypeText}>
              {video.type === 'short' ? 'Short' : 'Video'}
            </Text>
          </View>
          {video.duration && (
            <View style={styles.durationTag}>
              <Text style={styles.durationText}>{video.duration}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Video Info */}
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{video.title}</Text>
        <Text style={styles.videoDescription}>{video.description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <BookOpen size={24} color={Colors.primary} />
            <Text style={styles.title}>Tutorials</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Learn about Bhishi (Committee) system</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introduction */}
        <View style={[styles.introCard, Colors.shadow]}>
          <Text style={styles.introTitle}>What is Bhishi?</Text>
          <Text style={styles.introText}>
            Bhishi (also known as Committee) is a traditional Indian savings system where a group of people 
            contribute a fixed amount monthly. Each month, one member receives the total collected amount 
            through a lucky draw. It's a great way to save money and help each other financially.
          </Text>
        </View>

        {/* How It Works Section */}
        <HowItWorksSection />

        {/* Video Tutorials */}
        <View style={styles.videosSection}>
          <Text style={styles.sectionTitle}>Video Tutorials</Text>
          
          {tutorials.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginLeft: 36,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  introCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  videosSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  videoCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  videoContainer: {
    position: 'relative',
    height: 220,
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  videoOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  videoTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  videoTypeText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  durationTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '500',
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  videoDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  bottomSpacing: {
    height: 20,
  },
});