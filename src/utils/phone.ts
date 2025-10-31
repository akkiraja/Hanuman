/**
 * Phone number normalization utilities
 * Ensures consistent phone format across the app (+91XXXXXXXXXX)
 */

/**
 * Normalizes a phone number to consistent format: +91XXXXXXXXXX
 * - Strips all non-digit characters
 * - Takes last 10 digits
 * - Prepends +91 country code
 * 
 * @param phone - Phone number in any format
 * @returns Normalized phone in format +91XXXXXXXXXX, or empty string if invalid
 * 
 * @example
 * normalizePhone('9876543210') // '+919876543210'
 * normalizePhone('+91 98765 43210') // '+919876543210'
 * normalizePhone('(987) 654-3210') // '+919876543210'
 */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  
  // Extract only digits
  const digits = phone.replace(/\D/g, '');
  
  // Get last 10 digits (handles cases with country code already)
  const last10 = digits.slice(-10);
  
  // Validate we have 10 digits
  if (last10.length !== 10) return '';
  
  return `+91${last10}`;
}
