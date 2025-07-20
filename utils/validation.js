const { z } = require('zod');

// MNIT email validation regex
const MNIT_EMAIL_REGEX = /^20\d{2}u[a-z]{2,3}\d{4}@mnit\.ac\.in$/i;

// User validation schemas
const registerSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .regex(MNIT_EMAIL_REGEX, 'Invalid MNIT email format. Use format like 2024umt1920@mnit.ac.in'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters long'),
  fullName: z.string()
    .min(1, 'Full name is required')
    .trim(),
  gender: z.enum(['Male', 'Female', 'Other']),
  whatsappNumber: z.string()
    .regex(/^\d{10}$/, 'Please enter a valid 10-digit WhatsApp number (e.g., 9876543210)')
});

const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .regex(MNIT_EMAIL_REGEX, 'Invalid MNIT email format'),
  password: z.string()
    .min(1, 'Password is required')
});

const verifyEmailSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .regex(MNIT_EMAIL_REGEX, 'Invalid MNIT email format'),
  code: z.string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers')
});

// OTP validation schemas
const sendOtpSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .regex(MNIT_EMAIL_REGEX, 'Invalid MNIT email format. Use format like 2024umt1920@mnit.ac.in'),
  userName: z.string()
    .min(1, 'User name is required')
    .trim(),
  verificationCode: z.string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
  isPlainEmail: z.boolean().optional()
});

const verifyOtpSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .regex(MNIT_EMAIL_REGEX, 'Invalid MNIT email format'),
  enteredOtp: z.string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
  userData: z.object({
    password: z.string()
      .min(6, 'Password must be at least 6 characters long'),
    fullName: z.string()
      .min(1, 'Full name is required')
      .trim(),
    gender: z.enum(['Male', 'Female', 'Other']),
    whatsappNumber: z.string()
      .regex(/^\d{10}$/, 'Please enter a valid 10-digit WhatsApp number (e.g., 9876543210)')
  }).optional()
});

// Room listing validation schemas
const roomLocationSchema = z.object({
  hostel: z.string().min(1, 'Hostel is required'),
  block: z.string().optional().default(''), // Allow empty block - will be processed by backend
  roomNumber: z.string().min(1, 'Room number is required'),
  type: z.enum(['Single', 'Double Shared', 'Triple Shared', 'Any'])
});

const roomListingSchema = z.object({
  roomDetails: roomLocationSchema,
  listingType: z.enum(['Exchange', 'Bidding']),
  description: z.string().min(1, 'Description is required'),
  desiredTradeConditions: z.string().optional(),
  allotmentProof: z.string().optional(), // Base64 image string or file path
  allotmentProofType: z.enum(['gmail', 'document', 'other']).optional()
});

// Course validation schema (for attendance)
const courseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional()
});

const updateCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  attendedDays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')).optional(),
  missedDays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')).optional()
});

// CGPA validation schema
const semesterSchema = z.object({
  id: z.string().min(1, 'Semester ID is required'),
  sgpa: z.string()
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 10;
    }, 'SGPA must be a valid number between 0 and 10'),
  credits: z.string()
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Credits must be a valid positive number')
});

const cgpaDataSchema = z.object({
  semesters: z.array(semesterSchema).min(1, 'At least one semester is required')
});

// User preferences validation schema
const exchangePreferencesSchema = z.object({
  hostels: z.array(z.string()).optional(),
  blocks: z.array(z.string()).optional(),
  floor: z.string().optional(),
  roomType: z.enum(['Single', 'Double Shared', 'Triple Shared', 'Any']).optional(),
  notes: z.string().optional()
});

const updateUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').optional(),
  whatsappNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid WhatsApp number including country code')
    .optional(),
  phoneNumber: z.string().optional(),
  currentRoom: roomLocationSchema.optional(),
  preferences: exchangePreferencesSchema.optional()
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    try {
      console.log('✅ Validation - Starting validation for request body');
      console.log('✅ Validation - Request body:', JSON.stringify(req.body, null, 2));
      
      const validatedData = schema.parse(req.body);
      req.validatedData = validatedData;
      
      console.log('✅ Validation - Data validated successfully');
      console.log('✅ Validation - Validated data:', JSON.stringify(validatedData, null, 2));
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('❌ Validation - Validation failed with Zod errors');
        console.log('❌ Validation - Zod errors:', error.errors);
        
        const message = error.errors.map(err => err.message).join(', ');
        console.log('❌ Validation - Combined error message:', message);
        
        return res.status(400).json({
          success: false,
          message: message
        });
      }
      console.error('❌ Validation - Unexpected validation error:', error.message);
      next(error);
    }
  };
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  sendOtpSchema,
  verifyOtpSchema,
  roomListingSchema,
  courseSchema,
  updateCourseSchema,
  cgpaDataSchema,
  updateUserSchema,
  MNIT_EMAIL_REGEX
};
