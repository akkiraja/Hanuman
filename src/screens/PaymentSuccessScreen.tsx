import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CheckCircle, Home, Receipt } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../navigation';
import { toast } from 'sonner-native';

type PaymentSuccessRouteProp = RouteProp<RootStackParamList, 'PaymentSuccess'>;

interface PaymentSuccessParams {
  orderId?: string;
  groupId?: string;
  amount?: string;
  status?: string;
}

const PaymentSuccessScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PaymentSuccessRouteProp>();
  
  // Extract parameters from deep link URL
  const params = route.params as PaymentSuccessParams || {};
  const { orderId, groupId, amount, status } = params;

  useEffect(() => {
    console.log('💳 Payment Success Screen opened with params:', {
      orderId,
      groupId,
      amount,
      status,
      fullParams: route.params
    });

    // Show success toast
    toast.success('Payment Successful! 🎉', {
      description: 'Your payment has been processed successfully.',
    });
  }, [orderId, groupId, amount, status, route.params]);

  const handleGoHome = () => {
    // Navigate back to home screen
    navigation.navigate('MainTabs' as never);
  };

  const handleViewGroup = () => {
    if (groupId) {
      // Navigate to the specific group
      navigation.navigate('GroupDetail' as never, { groupId } as never);
    } else {
      handleGoHome();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <CheckCircle size={80} color={Colors.success} />
        </View>

        {/* Success Message */}
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>
          Your payment has been processed successfully.
        </Text>

        {/* Payment Details */}
        {(orderId || amount) && (
          <View style={styles.detailsContainer}>
            <View style={styles.detailsHeader}>
              <Receipt size={20} color={Colors.primary} />
              <Text style={styles.detailsTitle}>Payment Details</Text>
            </View>
            
            {orderId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {orderId}
                </Text>
              </View>
            )}
            
            {amount && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>₹{amount}</Text>
              </View>
            )}
            
            {status && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, styles.statusSuccess]}>
                  {status.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {groupId && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleViewGroup}
            >
              <Text style={styles.primaryButtonText}>View Group</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleGoHome}
          >
            <Home size={20} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  statusSuccess: {
    color: Colors.success,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentSuccessScreen;