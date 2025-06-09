// Client-side security utilities for data validation and sanitization

// Input sanitization to prevent XSS attacks
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/&lt;script/gi, '')
    .replace(/&lt;\/script&gt;/gi, '');
}

// Email validation with comprehensive checks
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const sanitizedEmail = sanitizeInput(email);
  
  return emailRegex.test(sanitizedEmail) && 
         sanitizedEmail.length <= 254 && 
         !sanitizedEmail.includes('..') &&
         !sanitizedEmail.startsWith('.') &&
         !sanitizedEmail.endsWith('.');
}

// Phone validation for Brazilian WhatsApp numbers
export function validateWhatsApp(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  const sanitizedPhone = sanitizeInput(phone).replace(/\D/g, '');
  
  // Brazilian phone numbers: 11 digits (with area code) or 13 digits (with country code)
  return (sanitizedPhone.length === 11 && sanitizedPhone.startsWith('11')) ||
         (sanitizedPhone.length === 13 && sanitizedPhone.startsWith('55'));
}

// Name validation
export function validateName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  
  const sanitizedName = sanitizeInput(name);
  const nameRegex = /^[a-zA-ZÀ-ÿ\s]{2,100}$/;
  
  return nameRegex.test(sanitizedName) && 
         sanitizedName.trim().length >= 2 &&
         sanitizedName.trim().length <= 100;
}

// Secure data encryption for local storage
export function encryptData(data: string, key: string = 'meuperfil360'): string {
  try {
    // Simple encryption for client-side data protection
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(encrypted);
  } catch {
    return data;
  }
}

// Secure data decryption for local storage
export function decryptData(encryptedData: string, key: string = 'meuperfil360'): string {
  try {
    const data = atob(encryptedData);
    let decrypted = '';
    for (let i = 0; i < data.length; i++) {
      decrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return decrypted;
  } catch {
    return encryptedData;
  }
}

// Secure local storage wrapper
export const secureStorage = {
  setItem: (key: string, value: string) => {
    try {
      const encrypted = encryptData(value);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.warn('Failed to store data securely:', error);
    }
  },
  
  getItem: (key: string): string | null => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      return decryptData(encrypted);
    } catch (error) {
      console.warn('Failed to retrieve data securely:', error);
      return null;
    }
  },
  
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  }
};

// Rate limiting for client-side actions
class ClientRateLimit {
  private attempts: Map<string, number[]> = new Map();
  
  isAllowed(action: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const actionAttempts = this.attempts.get(action) || [];
    
    // Remove old attempts outside the window
    const validAttempts = actionAttempts.filter(attempt => now - attempt < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(action, validAttempts);
    return true;
  }
  
  reset(action: string) {
    this.attempts.delete(action);
  }
}

export const clientRateLimit = new ClientRateLimit();

// CSRF token management
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Content Security Policy for inline content
export function sanitizeHTML(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// Secure random ID generation
export function generateSecureId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Session security validation
export function validateSession(): boolean {
  const sessionStart = secureStorage.getItem('session_start');
  if (!sessionStart) return false;
  
  const now = Date.now();
  const sessionAge = now - parseInt(sessionStart);
  const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
  
  return sessionAge < maxSessionAge;
}

// Initialize secure session
export function initializeSecureSession(): void {
  secureStorage.setItem('session_start', Date.now().toString());
  secureStorage.setItem('session_id', generateSecureId());
}