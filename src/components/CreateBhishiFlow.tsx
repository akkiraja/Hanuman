import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, IndianRupee, Calendar, ArrowRight, ArrowLeft, Settings, Zap, TrendingUp } from 'lucide-react-native';
import { Colors } from '../constants/colors';

interface CreateBhishiFlowProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (data: CreateBhishiData) => void;
}

interface CreateBhishiData {
  name: string;
  monthlyAmount: number;
  drawDay: number;
  groupType: 'lucky_draw' | 'bidding';
}

const STEPS = [
  { id: 1, title: 'Group Type', icon: Settings, subtitle: 'Choose the type of bhishi group' },
  { id: 2, title: 'Bhishi Name', icon: Users, subtitle: 'What would you like to call your group?' },
  { id: 3, title: 'Monthly Amount', icon: IndianRupee, subtitle: 'How much will each member contribute?' },
  { id: 4, title: 'Draw Date', icon: Calendar, subtitle: 'When should the draw happen?' },
];

export default function CreateBhishiFlow({ visible, onClose, onComplete }: CreateBhishiFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CreateBhishiData>({
    name: '',
    monthlyAmount: 0,
    drawDay: 1,
    groupType: 'lucky_draw'
  });

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      name: '',
      monthlyAmount: 0,
      drawDay: 1,
      groupType: 'lucky_draw'
    });
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        // Group type is always selected
        return true;
      case 2:
        if (!formData.name.trim()) {
          Alert.alert('Error', 'Please enter a group name');
          return false;
        }
        return true;
      case 3:
        if (formData.monthlyAmount <= 0) {
          Alert.alert('Error', 'Please enter a valid monthly amount');
          return false;
        }
        return true;
      case 4:
        if (formData.drawDay < 1 || formData.drawDay > 31) {
          Alert.alert('Error', 'Please select a valid draw day');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleComplete = () => {
    onComplete(formData);
    onClose();
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(currentStep / STEPS.length) * 100}%` }]} />
      </View>
      <View style={styles.stepInfo}>
        <Text style={styles.stepNumber}>Step {currentStep} of {STEPS.length}</Text>
        <Text style={styles.stepTitle}>{STEPS[currentStep - 1].title}</Text>
        <Text style={styles.stepSubtitle}>{STEPS[currentStep - 1].subtitle}</Text>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepMainTitle}>Choose your Bhishi type{'\n'}अपनी भिशी का प्रकार चुनें</Text>
      
      <View style={styles.groupTypeOptions}>
        <TouchableOpacity
          style={[
            styles.groupTypeOption,
            formData.groupType === 'lucky_draw' && styles.groupTypeOptionSelected
          ]}
          onPress={() => setFormData({ ...formData, groupType: 'lucky_draw' })}
        >
          <View style={[
            styles.groupTypeIcon,
            formData.groupType === 'lucky_draw' && styles.groupTypeIconSelected
          ]}>
            <TrendingUp size={22} color={formData.groupType === 'lucky_draw' ? Colors.background : Colors.primary} />
          </View>
          <Text style={[
            styles.groupTypeTitle,
            formData.groupType === 'lucky_draw' && styles.groupTypeTitleSelected
          ]}>Lucky Draw (लकी ड्रॉ)</Text>
          <Text style={styles.groupTypeDescription}>
            पारंपरिक भिशी जिसमें विजेता किस्मत से चुने जाते हैं
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.groupTypeOption,
            formData.groupType === 'bidding' && styles.groupTypeOptionSelected
          ]}
          onPress={() => setFormData({ ...formData, groupType: 'bidding' })}
        >
          <View style={[
            styles.groupTypeIcon,
            formData.groupType === 'bidding' && styles.groupTypeIconSelected
          ]}>
            <Zap size={22} color={formData.groupType === 'bidding' ? Colors.background : Colors.primary} />
          </View>
          <Text style={[
            styles.groupTypeTitle,
            formData.groupType === 'bidding' && styles.groupTypeTitleSelected
          ]}>Bidding (बोली लगाना)</Text>
          <Text style={styles.groupTypeDescription}>
            सदस्य बोली लगाकर जीतते हैं – सबसे कम बोली लगाने वाला विजेता होता है
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepIcon}>
        <Users size={48} color={Colors.primary} />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Group Name (ग्रुप का नाम)</Text>
        <TextInput
          style={styles.modernInput}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="e.g., Friends Committee (दोस्तों की भिशी)"
          placeholderTextColor={Colors.textSecondary}
          autoFocus
        />
        <Text style={styles.inputHint}>Choose a name that your group will easily recognize (ऐसा नाम चुनें जिसे आपका समूह आसानी से पहचान सके)</Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepIcon}>
        <IndianRupee size={48} color={Colors.money} />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Monthly Contribution (मासिक योगदान)</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={formData.monthlyAmount > 0 ? formData.monthlyAmount.toString() : ''}
            onChangeText={(text) => setFormData({ ...formData, monthlyAmount: parseInt(text) || 0 })}
            placeholder="e.g., 5000"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
            autoFocus
          />
        </View>
        <Text style={styles.inputHint}>Amount each member will contribute monthly (प्रत्येक सदस्य हर महीने कितनी राशि देगा)</Text>
        
        {formData.monthlyAmount > 0 && (
          <View style={styles.amountPreview}>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Per Member (प्रति सदस्य):</Text>
              <Text style={styles.previewValue}>₹{formData.monthlyAmount.toLocaleString()}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep4 = () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const getOrdinal = (day: number) => {
      if (day === 1) return 'st';
      if (day === 2) return 'nd';
      if (day === 3) return 'rd';
      return 'th';
    };
    
    return (
      <View style={styles.stepContent}>
        <View style={styles.stepIcon}>
          <Calendar size={48} color={Colors.primary} />
        </View>
        
        <View style={styles.dateSection}>
          <Text style={styles.inputLabel}>{formData.groupType === 'bidding' ? 'Bidding Day (बोली का दिन)' : 'Draw Day (ड्रॉ दिन)'}</Text>
          <Text style={styles.inputHint}>
            Choose which day of the month the {formData.groupType === 'bidding' ? 'bidding round' : 'lucky draw'} will happen (महीने में कौन-से दिन {formData.groupType === 'bidding' ? 'बोली' : 'लकी ड्रॉ'} होगा चुनें)
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysContainer}>
            {days.map(day => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  formData.drawDay === day && styles.dayButtonSelected
                ]}
                onPress={() => setFormData({ ...formData, drawDay: day })}
              >
                <Text style={[
                  styles.dayButtonText,
                  formData.drawDay === day && styles.dayButtonTextSelected
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.drawDatePreview}>
            <View style={styles.previewIcon}>
              <Calendar size={20} color={Colors.primary} />
            </View>
            <View style={styles.previewContent}>
              <Text style={styles.previewTitle}>
                {formData.groupType === 'bidding' ? 'Bidding Schedule (बोली शेड्यूल)' : 'Lucky Draw Schedule (लकी ड्रॉ शेड्यूल)'}
              </Text>
              <Text style={styles.previewText}>
                Every {formData.drawDay}{getOrdinal(formData.drawDay)} of the month (हर महीने की {formData.drawDay} तारीख)
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepIcon}>
        <CreditCard size={48} color={Colors.primary} />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Your UPI ID</Text>
        <TextInput
          style={styles.modernInput}
          value={formData.upiId}
          onChangeText={(text) => setFormData({ ...formData, upiId: text })}
          placeholder="yourname@paytm, yourname@gpay, yourname@phonepe"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoFocus
        />
        <Text style={styles.inputHint}>
          {formData.groupType === 'bidding' 
            ? 'This will be used for receiving payments when you win a bid'
            : 'This will be used for receiving payments when you win the draw'
          }
        </Text>
        
        {formData.upiId.length > 0 && (
          <View style={styles.upiPreview}>
            <View style={styles.previewIcon}>
              <CreditCard size={20} color={Colors.success} />
            </View>
            <View style={styles.previewContent}>
              <Text style={styles.previewTitle}>Payment ID</Text>
              <Text style={styles.previewText}>{formData.upiId}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Bhishi</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {renderStepIndicator()}
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </ScrollView>
        
        <View style={styles.footer}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={20} color={Colors.textSecondary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentStep === STEPS.length ? 'Create Bhishi' : 'Next'}
            </Text>
            {currentStep < STEPS.length && (
              <ArrowRight size={20} color={Colors.background} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  stepIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: Colors.card,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stepInfo: {
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  stepIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepMainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  stepMainSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  groupTypeOptions: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  groupTypeOption: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  groupTypeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  groupTypeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  groupTypeIconSelected: {
    backgroundColor: Colors.primary,
  },
  groupTypeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  groupTypeTitleSelected: {
    color: Colors.primary,
  },
  groupTypeDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modernInput: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.background,
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.money,
    paddingLeft: 20,
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  amountPreview: {
    marginTop: 16,
    padding: 20,
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
  dateSection: {
    width: '100%',
    maxWidth: 400,
  },
  daysContainer: {
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  dayButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  dayButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  dayButtonTextSelected: {
    color: Colors.background,
  },
  drawDatePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  previewText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  upiPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.success + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.success + '20',
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});