import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../constants/colors';

interface VideoPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  title?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// For vertical video (9:16 aspect ratio)
const VIDEO_HEIGHT = SCREEN_HEIGHT * 0.75;
const VIDEO_WIDTH = VIDEO_HEIGHT * (9 / 16);

export default function VideoPlayerModal({ 
  visible, 
  onClose, 
  videoId,
  title = 'How Bhishi Works'
}: VideoPlayerModalProps) {
  // YouTube embed URL for shorts - autoplay enabled
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Close button */}
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <View style={styles.closeButtonInner}>
            <X size={24} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* Video container */}
        <View style={styles.videoContainer}>
          {/* Title */}
          <Text style={styles.title}>{title}</Text>
          
          {/* Vertical video player */}
          <View style={[styles.videoWrapper, { width: VIDEO_WIDTH, height: VIDEO_HEIGHT }]}>
            <WebView
              source={{ uri: embedUrl }}
              style={styles.webview}
              allowsFullscreenVideo={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              mixedContentMode="always"
              originWhitelist={["*"]}
              allowsProtectedMedia={true}
              
              // Critical Android fixes for Error 153
              androidHardwareAccelerationDisabled={false}
              androidLayerType="hardware"
              
              onError={(e) => {
                console.log("WebView error:", e.nativeEvent);
              }}
            />
          </View>
        </View>
        
        {/* Tap outside to close */}
        <TouchableOpacity 
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  videoWrapper: {
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
