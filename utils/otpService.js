// In-memory OTP storage (In production, use Redis or database)
const otpStorage = new Map();

class OTPService {
  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP with expiration and attempt tracking
  storeOTP(email, otp) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    otpStorage.set(email, {
      otp,
      createdAt: new Date(),
      expiresAt,
      attempts: 0,
      verified: false
    });

    // Cleanup expired OTPs
    this.cleanupExpiredOTPs();
    
    console.log(`📧 OTP stored for ${email}: ${otp} (expires at ${expiresAt.toISOString()})`);
  }

  // Verify OTP
  verifyOTP(email, enteredOtp) {
    const stored = otpStorage.get(email);
    
    if (!stored) {
      return { success: false, message: 'No OTP found. Please request a new one.' };
    }

    if (new Date() > stored.expiresAt) {
      otpStorage.delete(email);
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    if (stored.attempts >= 3) {
      otpStorage.delete(email);
      return { success: false, message: 'Too many verification attempts. Please request a new OTP.' };
    }

    if (stored.otp !== enteredOtp.toString()) {
      stored.attempts++;
      return { 
        success: false, 
        message: `Invalid OTP. ${3 - stored.attempts} attempts remaining.` 
      };
    }

    // OTP is valid
    stored.verified = true;
    return { success: true, message: 'OTP verified successfully' };
  }

  // Check if OTP was verified (for registration process)
  isOTPVerified(email) {
    const stored = otpStorage.get(email);
    return stored && stored.verified && new Date() <= stored.expiresAt;
  }

  // Check if OTP exists and is valid (for rate limiting)
  hasValidOTP(email) {
    const stored = otpStorage.get(email);
    return stored && new Date() <= stored.expiresAt;
  }

  // Get remaining time for rate limiting
  getRemainingTime(email) {
    const stored = otpStorage.get(email);
    if (!stored) return 0;
    
    const remaining = stored.expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(remaining / 1000)); // seconds
  }

  // Clean up expired OTPs
  cleanupExpiredOTPs() {
    const now = new Date();
    for (const [email, data] of otpStorage.entries()) {
      if (now > data.expiresAt) {
        otpStorage.delete(email);
      }
    }
  }

  // Clear verified OTP (after successful registration)
  clearOTP(email) {
    otpStorage.delete(email);
  }

  // Get OTP statistics (for debugging)
  getStats() {
    return {
      totalOTPs: otpStorage.size,
      otps: Array.from(otpStorage.entries()).map(([email, data]) => ({
        email,
        created: data.createdAt,
        expires: data.expiresAt,
        attempts: data.attempts,
        verified: data.verified
      }))
    };
  }
}

module.exports = new OTPService();
