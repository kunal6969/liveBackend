const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validate, registerSchema, loginSchema, verifyEmailSchema, sendOtpSchema, verifyOtpSchema } = require('../utils/validation');
const emailService = require('../utils/emailService');
const verificationService = require('../utils/verificationService');
const otpService = require('../utils/otpService');
const nodemailer = require('nodemailer');

const router = express.Router();

// Helper function to extract roll number from email
const extractRollNumber = (email) => {
  console.log('🔧 Helper - extractRollNumber called with email:', email);
  const rollNumber = email.split('@')[0]; // e.g., "2024umt1920" from "2024umt1920@mnit.ac.in"
  console.log('🔧 Helper - extracted roll number:', rollNumber);
  return rollNumber;
};

// Helper function to generate JWT token
const generateToken = (userId) => {
  console.log('🔧 Helper - generateToken called for userId:', userId);
  try {
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    console.log('✅ Helper - JWT token generated successfully');
    return token;
  } catch (error) {
    console.error('❌ Helper - JWT token generation failed:', error.message);
    throw error;
  }
};

// Helper function to set auth cookie
const setAuthCookie = (res, token) => {
  console.log('🔧 Helper - setAuthCookie called');
  try {
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: false, // Always false for development
      sameSite: 'lax', // Use 'lax' for same-site development
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/', // Ensure cookie is available for all paths
      domain: 'localhost' // Explicitly set domain for localhost
    });
    console.log('✅ Helper - Auth cookie set successfully');
  } catch (error) {
    console.error('❌ Helper - Failed to set auth cookie:', error.message);
    throw error;
  }
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    console.log('👤 POST /api/auth/register - Starting registration process');
    const { email, password, fullName, gender, whatsappNumber } = req.validatedData;
    console.log('👤 POST /api/auth/register - Registration data:', { email, fullName, gender, whatsappNumber });

    // Check if OTP was verified first (new requirement)
    console.log('👤 POST /api/auth/register - Checking OTP verification status');
    if (!otpService.isOTPVerified(email)) {
      console.log('❌ POST /api/auth/register - OTP not verified for email:', email);
      return res.status(400).json({
        success: false,
        message: 'Please verify your email with OTP before registering'
      });
    }

    // Check if user already exists
    console.log('👤 POST /api/auth/register - Checking if user exists');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ POST /api/auth/register - User already exists:', email);
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    console.log('✅ POST /api/auth/register - Email is unique');

    // Extract roll number from email
    console.log('👤 POST /api/auth/register - Extracting roll number from email');
    const rollNumber = extractRollNumber(email);

    // Check if roll number already exists
    console.log('👤 POST /api/auth/register - Checking if roll number exists');
    const existingRollNumber = await User.findOne({ rollNumber });
    if (existingRollNumber) {
      console.log('❌ POST /api/auth/register - Roll number already exists:', rollNumber);
      return res.status(409).json({
        success: false,
        message: 'User with this roll number already exists'
      });
    }
    console.log('✅ POST /api/auth/register - Roll number is unique');

    // Validate WhatsApp number format (10 digits)
    console.log('👤 POST /api/auth/register - Validating WhatsApp number format');
    if (!/^\d{10}$/.test(whatsappNumber)) {
      console.log('❌ POST /api/auth/register - Invalid WhatsApp number format:', whatsappNumber);
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit WhatsApp number (e.g., 9876543210)'
      });
    }

    // Hash password
    console.log('👤 POST /api/auth/register - Hashing password');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('✅ POST /api/auth/register - Password hashed successfully');

    // Create user with verified email (since OTP was already verified)
    console.log('👤 POST /api/auth/register - Creating new user object');
    const user = new User({
      email,
      password: hashedPassword,
      fullName,
      rollNumber,
      gender,
      whatsappNumber, // Store as 10-digit number without country code
      phoneNumber: `98765${Math.floor(10000 + Math.random() * 90000)}`, // Generate random phone number
      isEmailVerified: true, // Mark as verified since OTP was completed
      emailVerifiedAt: new Date()
    });
    console.log('✅ POST /api/auth/register - User object created:', { email, fullName, rollNumber });

    console.log('👤 POST /api/auth/register - Saving user to database');
    await user.save();
    console.log('✅ POST /api/auth/register - User saved successfully with ID:', user._id);

    // Clear OTP after successful registration
    console.log('👤 POST /api/auth/register - Clearing OTP for email');
    otpService.clearOTP(email);
    console.log('✅ POST /api/auth/register - OTP cleared');

    // Generate token and set cookie for automatic login
    console.log('👤 POST /api/auth/register - Generating JWT token and setting cookie');
    const token = generateToken(user._id);
    setAuthCookie(res, token);
    console.log('✅ POST /api/auth/register - JWT token set in cookie');

    // Send welcome email (optional, separate from OTP)
    console.log('👤 POST /api/auth/register - Attempting to send welcome email');
    try {
      await emailService.sendWelcomeEmail(email, fullName);
      console.log('✅ POST /api/auth/register - Welcome email sent successfully');
    } catch (error) {
      console.error('❌ POST /api/auth/register - Welcome email failed:', error.message);
      // Don't fail registration if welcome email fails
    }

    // Return success response in new format
    console.log('✅ POST /api/auth/register - Registration completed successfully');
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        autoLogin: true
      }
    });

  } catch (error) {
    next(error);
  }
});


//Custom otp send route
/**
 * @route   POST /api/auth/sendOtpForSignup
 * @desc    Send OTP for email verification during signup
 * @access  Public
 */
router.post('/sendOtpForSignup', validate(sendOtpSchema), async (req, res) => {
  try {
    const { email, verificationCode, userName } = req.validatedData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Rate limiting - check if OTP was recently sent
    if (otpService.hasValidOTP(email)) {
      const remainingTime = otpService.getRemainingTime(email);
      return res.status(429).json({
        success: false,
        message: `OTP already sent. Please wait ${Math.ceil(remainingTime / 60)} minutes before requesting a new one.`
      });
    }

    // Store OTP in service
    otpService.storeOTP(email, verificationCode);

    console.log('📧 Sending verification email to:', email);

    try {
      const emailResult = await emailService.sendOtpEmail(email, verificationCode, userName);
      if (!emailResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP email',
          error: emailResult.error
        });
      }
      
      console.log('✅ OTP email sent successfully');
      
      return res.status(200).json({ 
        success: true, 
        message: 'OTP sent successfully' 
      });

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send OTP. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

  } catch (error) {
    console.error('❌ OTP send error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/auth/verifyOtpForSignup
 * @desc    Verify OTP and automatically register user
 * @access  Public
 */
router.post('/verifyOtpForSignup', validate(verifyOtpSchema), async (req, res) => {
  try {
    const { email, enteredOtp, userData } = req.validatedData;

    // Verify OTP using OTP service
    const verificationResult = otpService.verifyOTP(email, enteredOtp);
    
    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    // If userData is provided, automatically register the user
    if (userData) {
      const { password, fullName, gender, whatsappNumber } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Extract roll number from email
      const rollNumber = extractRollNumber(email);

      // Check if roll number already exists
      const existingRollNumber = await User.findOne({ rollNumber });
      if (existingRollNumber) {
        return res.status(409).json({
          success: false,
          message: 'User with this roll number already exists'
        });
      }

      // Validate WhatsApp number format (10 digits)
      if (!/^\d{10}$/.test(whatsappNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit WhatsApp number (e.g., 9876543210)'
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user with verified email
      const user = new User({
        email,
        password: hashedPassword,
        fullName,
        rollNumber,
        gender,
        whatsappNumber,
        phoneNumber: `98765${Math.floor(10000 + Math.random() * 90000)}`,
        isEmailVerified: true,
        emailVerifiedAt: new Date()
      });

      await user.save();

      // Clear OTP after successful registration
      otpService.clearOTP(email);

      // Generate token and set cookie for automatic login
      const token = generateToken(user._id);
      setAuthCookie(res, token);

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(email, fullName);
      } catch (error) {
        console.error('Welcome email failed:', error.message);
      }

      return res.status(201).json({
        success: true,
        message: 'OTP verified and user registered successfully',
        data: {
          user: user.toJSON(),
          autoLogin: true
        }
      });
    }

    // If no userData provided, just verify OTP
    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('❌ OTP verification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/auth/test-register
 * @desc    Register a new user with auto-verification for testing
 * @access  Public (only in development)
 */
router.post('/test-register', validate(registerSchema), async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    const { email, password, fullName, gender, whatsappNumber } = req.validatedData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Extract roll number from email
    const rollNumber = extractRollNumber(email);

    // Check if roll number already exists
    const existingRollNumber = await User.findOne({ rollNumber });
    if (existingRollNumber) {
      return res.status(409).json({
        success: false,
        message: 'User with this roll number already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with auto-verification for testing
    const user = new User({
      email,
      password: hashedPassword,
      fullName,
      rollNumber,
      gender,
      whatsappNumber,
      phoneNumber: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      isEmailVerified: true, // Auto-verify for testing
      emailVerifiedAt: new Date()
    });

    await user.save();

    // Generate token and set cookie for automatic login
    const token = generateToken(user._id);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Test user registered and verified successfully',
      data: {
        user: user.toJSON(),
        autoVerified: true
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    console.log('🔐 POST /api/auth/login - Starting login process');
    const { email, password } = req.validatedData;
    console.log('🔐 POST /api/auth/login - Login attempt for email:', email);

    // Find user by email
    console.log('🔐 POST /api/auth/login - Looking up user in database');
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('❌ POST /api/auth/login - User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    console.log('✅ POST /api/auth/login - User found:', { id: user._id, email: user.email });

    // Check password
    console.log('🔐 POST /api/auth/login - Verifying password');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ POST /api/auth/login - Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    console.log('✅ POST /api/auth/login - Password verified successfully');

    // Check if email is verified
    console.log('🔐 POST /api/auth/login - Checking email verification status');
    if (!user.isEmailVerified) {
      console.log('❌ POST /api/auth/login - Email not verified for user:', email);
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in',
        data: {
          email: user.email,
          fullName: user.fullName,
          isEmailVerified: user.isEmailVerified
        }
      });
    }
    console.log('✅ POST /api/auth/login - Email is verified');

    // Generate token
    console.log('🔐 POST /api/auth/login - Generating JWT token');
    const token = generateToken(user._id);

    // Set cookie
    console.log('🔐 POST /api/auth/login - Setting authentication cookie');
    setAuthCookie(res, token);

    // Return user data (password is automatically excluded by toJSON transform)
    console.log('✅ POST /api/auth/login - Login completed successfully for user:', email);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('❌ POST /api/auth/login - Login error:', error.message, error.stack);
    next(error);
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * @route   GET /api/auth/verify
 * @desc    Verify if user is authenticated
 * @access  Private
 */
router.get('/verify', async (req, res, next) => {
  try {
    const token = req.cookies.authToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    next(error);
  }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with code
 * @access  Public
 */
router.post('/verify-email', async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    // Verify the code
    const verificationResult = verificationService.verifyCode(email, code);

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: verificationResult.error
      });
    }

    // Find and update user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    // Generate token and set cookie for automatic login
    const token = generateToken(user._id);
    setAuthCookie(res, token);

    // Send welcome email
    await emailService.sendWelcomeEmail(email, user.fullName);

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to MNIT Live.',
      data: {
        user: user.toJSON(),
        verified: true
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification code
 * @access  Public
 */
router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Check if there's already a valid code
    if (verificationService.hasValidCode(email)) {
      const remainingTime = verificationService.getRemainingTime(email);
      return res.status(429).json({
        success: false,
        message: `Verification code already sent. Please wait ${Math.ceil(remainingTime / 60)} minutes before requesting a new one.`
      });
    }

    // Generate and send new verification code
    const verificationCode = verificationService.generateCode();
    verificationService.storeCode(email, verificationCode);

    const emailResult = await emailService.sendVerificationEmail(email, verificationCode, user.fullName);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent successfully. Please check your email.',
      data: {
        emailSent: true
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
