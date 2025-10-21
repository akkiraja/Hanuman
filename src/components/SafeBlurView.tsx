import React from 'react';
import { View, ViewStyle, StyleSheet, Platform } from 'react-native';

// Safe import of BlurView
let BlurView: any = View;
let hasBlurSupport = false;

try {
  const expoBlur = require('expo-blur');
  if (expoBlur && expoBlur.BlurView) {
    BlurView = expoBlur.BlurView;
    hasBlurSupport = true;
  }
} catch (error) {
  console.warn('⚠️ expo-blur not available, using fallback View');
  hasBlurSupport = false;
}

interface SafeBlurViewProps {
  style?: ViewStyle | ViewStyle[];
  tint?: 'light' | 'dark' | 'default' | 'systemMaterialDark' | 'systemMaterialLight';
  intensity?: number;
  children?: React.ReactNode;
}

/**
 * SafeBlurView - A wrapper around expo-blur's BlurView that gracefully falls back
 * to a standard View if BlurView is not available or fails to load.
 * 
 * This prevents APK crashes while maintaining blur functionality where supported.
 */
export default function SafeBlurView({ 
  style, 
  tint = 'default', 
  intensity = 100, 
  children 
}: SafeBlurViewProps) {
  
  // If BlurView is available and supported, use it
  if (hasBlurSupport && BlurView !== View) {
    return (
      <BlurView style={style} tint={tint} intensity={intensity}>
        {children}
      </BlurView>
    );
  }
  
  // Fallback to View with semi-transparent background
  const fallbackStyle: ViewStyle = {
    backgroundColor: tint?.includes('Dark') || tint === 'dark' 
      ? 'rgba(0, 0, 0, 0.85)' 
      : 'rgba(255, 255, 255, 0.85)',
  };
  
  return (
    <View style={[fallbackStyle, style]}>
      {children}
    </View>
  );
}
