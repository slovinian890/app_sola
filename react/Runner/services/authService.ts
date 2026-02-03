import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, UserProfile } from './dataService';

const STORAGE_KEYS = {
  AUTH_TOKEN: '@runner:auth_token',
  USER_EMAIL: '@runner:user_email',
  VERIFICATION_CODE: '@runner:verification_code',
  CODE_EXPIRY: '@runner:code_expiry',
};

// Simple in-memory storage for demo purposes
// In production, this would be handled by a backend
const verificationCodes: Map<string, { code: string; expiry: number }> = new Map();

// Generate a 6-digit verification code
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification code (simulated)
export const sendVerificationCode = async (email: string): Promise<boolean> => {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    const code = generateCode();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store code (in production, this would be sent via email/SMS)
    verificationCodes.set(email.toLowerCase(), { code, expiry });
    
    // Also store in AsyncStorage for persistence
    await AsyncStorage.setItem(STORAGE_KEYS.VERIFICATION_CODE, code);
    await AsyncStorage.setItem(STORAGE_KEYS.CODE_EXPIRY, expiry.toString());
    await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, email.toLowerCase());

    // In a real app, you would send this code via email/SMS
    // For demo purposes, we'll log it and store it for display
    console.log(`Verification code for ${email}: ${code}`);
    console.log(`You can enter this code: ${code}`);

    return true;
  } catch (error) {
    console.error('Error sending verification code:', error);
    return false;
  }
};

// Verify code
export const verifyCode = async (email: string, code: string): Promise<boolean> => {
  try {
    const stored = verificationCodes.get(email.toLowerCase());
    const storedCode = await AsyncStorage.getItem(STORAGE_KEYS.VERIFICATION_CODE);
    const storedExpiry = await AsyncStorage.getItem(STORAGE_KEYS.CODE_EXPIRY);

    // Check in-memory first
    if (stored) {
      if (stored.code === code && Date.now() < stored.expiry) {
        // Code is valid
        await login(email);
        verificationCodes.delete(email.toLowerCase());
        return true;
      }
    }

    // Check AsyncStorage as fallback
    if (storedCode && storedExpiry) {
      if (storedCode === code && Date.now() < parseInt(storedExpiry)) {
        await login(email);
        await AsyncStorage.removeItem(STORAGE_KEYS.VERIFICATION_CODE);
        await AsyncStorage.removeItem(STORAGE_KEYS.CODE_EXPIRY);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error verifying code:', error);
    return false;
  }
};

// Login user
export const login = async (email: string): Promise<boolean> => {
  try {
    const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, email.toLowerCase());
    return true;
  } catch (error) {
    console.error('Error logging in:', error);
    return false;
  }
};

// Check if user is logged in
export const isLoggedIn = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    return token !== null;
  } catch (error) {
    return false;
  }
};

// Get current user email
export const getCurrentUserEmail = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);
  } catch (error) {
    return null;
  }
};

// Check if user has profile
export const hasProfile = async (): Promise<boolean> => {
  try {
    const profile = await getProfile();
    return profile !== null;
  } catch (error) {
    return false;
  }
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
    await AsyncStorage.removeItem(STORAGE_KEYS.VERIFICATION_CODE);
    await AsyncStorage.removeItem(STORAGE_KEYS.CODE_EXPIRY);
  } catch (error) {
    console.error('Error logging out:', error);
  }
};

// Get stored verification code (for testing/demo purposes)
export const getStoredCode = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.VERIFICATION_CODE);
  } catch (error) {
    return null;
  }
};

