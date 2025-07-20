const crypto = require('crypto');

// In-memory store for verification codes (in production, use Redis)
const verificationCodes = new Map();

class VerificationService {
  // Generate a 6-digit verification code
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store verification code with expiration (10 minutes)
  storeCode(email, code) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    verificationCodes.set(email, {
      code,
      expiresAt,
      attempts: 0
    });
    
    // Clean up expired codes
    this.cleanupExpiredCodes();
    
    console.log(`📧 Verification code stored for ${email}: ${code} (expires at ${expiresAt.toISOString()})`);
  }

  // Verify the code
  verifyCode(email, inputCode) {
    const stored = verificationCodes.get(email);
    
    if (!stored) {
      return { success: false, error: 'No verification code found. Please request a new one.' };
    }

    if (new Date() > stored.expiresAt) {
      verificationCodes.delete(email);
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }

    if (stored.attempts >= 3) {
      verificationCodes.delete(email);
      return { success: false, error: 'Too many failed attempts. Please request a new verification code.' };
    }

    if (stored.code !== inputCode.toString()) {
      stored.attempts++;
      return { success: false, error: `Invalid verification code. ${3 - stored.attempts} attempts remaining.` };
    }

    // Code is valid
    verificationCodes.delete(email);
    return { success: true };
  }

  // Check if code exists and is valid
  hasValidCode(email) {
    const stored = verificationCodes.get(email);
    return stored && new Date() <= stored.expiresAt;
  }

  // Clean up expired codes
  cleanupExpiredCodes() {
    const now = new Date();
    for (const [email, data] of verificationCodes.entries()) {
      if (now > data.expiresAt) {
        verificationCodes.delete(email);
      }
    }
  }

  // Get remaining time for a code
  getRemainingTime(email) {
    const stored = verificationCodes.get(email);
    if (!stored) return 0;
    
    const remaining = stored.expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(remaining / 1000)); // seconds
  }
}

module.exports = new VerificationService();
