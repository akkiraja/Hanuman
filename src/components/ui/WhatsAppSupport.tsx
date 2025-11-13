import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

interface WhatsAppSupportProps {
  phoneNumber: string;
}

export default function WhatsAppSupport({ phoneNumber }: WhatsAppSupportProps) {
  const handleWhatsAppPress = async () => {
    try {
      // Format phone number for WhatsApp (remove +91 if present and add it properly)
      const cleanNumber = phoneNumber.replace(/^\+?91/, '');
      const whatsappNumber = `91${cleanNumber}`;
      
      // Create WhatsApp URL without prefilled message
      const whatsappUrl = `https://wa.me/${whatsappNumber}`;
      
      // Check if WhatsApp can be opened
      const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpenWhatsApp) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to SMS if WhatsApp is not available
        const smsUrl = `sms:+91${cleanNumber}`;
        await Linking.openURL(smsUrl);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.supportCard} onPress={handleWhatsAppPress}>
        <View style={styles.iconContainer}>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/124/124034.png' }} 
            style={{ width: 28, height: 28 }} 
            resizeMode="contain"
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Need Support?</Text>
          <Text style={styles.subtitle}>Chat with us on WhatsApp</Text>
        </View>
        <View style={styles.actionContainer}>
          <Text style={styles.actionText}>Chat Now</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  supportCard: {
    backgroundColor: '#25D366', // WhatsApp green color
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
});