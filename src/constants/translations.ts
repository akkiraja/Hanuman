// Simple translation system for the app
export const translations = {
  en: {
    // Home Screen
    myCommittee: 'My Bhishi',
    welcome: 'Welcome',
    totalGroups: 'Total Groups',
    activeGroups: 'Active Groups',
    yourGroups: 'Your Groups',
    loadingGroups: 'Loading your groups...',
    refreshGroups: 'Groups refreshed!',
    
    // Group Status
    forming: 'Forming',
    active: 'Active',
    completed: 'Completed',
    
    // Payment
    payToAdmin: 'Pay to Admin',
    paymentCompleted: 'Payment Completed',
    markAsPaid: 'Mark as Paid',
    paymentWindow: 'Payment window opens 5 days before draw date',
    
    // Actions
    createGroup: 'Create Group',
    viewDetails: 'View Details',
    
    // Congratulations
    congratulations: 'Congratulations!',
    wonAmount: 'won',
    
    // Common
    month: 'month',
    members: 'members',
    error: 'Error',
    success: 'Success',
    next: 'next',
    
    // UI Elements
    overview: 'Overview',
    recentWinners: 'Recent Winners',
    
    // Insights Section
    nextContributionDue: 'Next Payment Due',
    nextLuckyDraw: 'Next Lucky Draw',
    noPaymentsDue: 'All payments up to date',
    noUpcomingDraws: 'No upcoming draws',
    
    // Common Actions
    ok: 'OK',
    tryAgain: 'Try Again',
  },
  hi: {
    // Home Screen
    myCommittee: 'मेरी भिशी',
    welcome: 'स्वागत है',
    totalGroups: 'कुल ग्रुप',
    activeGroups: 'सक्रिय ग्रुप',
    yourGroups: 'आपके ग्रुप',
    loadingGroups: 'आपके ग्रुप लोड हो रहे हैं...',
    refreshGroups: 'ग्रुप रिफ्रेश हो गए!',
    
    // Group Status
    forming: 'बन रहा है',
    active: 'सक्रिय',
    completed: 'पूर्ण',
    
    // Payment
    payToAdmin: 'एडमिन को भुगतान',
    paymentCompleted: 'भुगतान पूर्ण',
    markAsPaid: 'भुगतान के रूप में चिह्नित करें',
    paymentWindow: 'भुगतान विंडो ड्रॉ की तारीख से 5 दिन पहले खुलती है',
    
    // Actions
    createGroup: 'ग्रुप बनाएं',
    viewDetails: 'विवरण देखें',
    
    // Congratulations
    congratulations: 'बधाई हो!',
    wonAmount: 'जीता',
    
    // Common
    month: 'महीना',
    members: 'सदस्य',
    error: 'त्रुटि',
    success: 'सफलता',
    next: 'आगे',
    
    // UI Elements
    overview: 'सारांश',
    recentWinners: 'हाल के विजेता',
    
    // Insights Section
    nextContributionDue: 'अगला भुगतान देय',
    nextLuckyDraw: 'अगला लकी ड्रॉ',
    noPaymentsDue: 'सभी भुगतान अप टू डेट',
    noUpcomingDraws: 'कोई आगामी ड्रॉ नहीं',
    
    // Common Actions
    ok: 'ठीक है',
    tryAgain: 'फिर कोशिश करें',
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

// Simple translation hook
export const useTranslation = () => {
  // For now, default to English. Later can be made dynamic
  const currentLanguage: Language = 'en';
  
  const t = (key: TranslationKey): string => {
    return translations[currentLanguage][key] || translations.en[key] || key;
  };
  
  return { t, currentLanguage };
};