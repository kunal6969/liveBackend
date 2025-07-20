const mongoose = require('mongoose');

const roomLocationSchema = new mongoose.Schema({
  hostel: {
    type: String,
    required: true,
    trim: true
  },
  block: {
    type: String,
    required: true,
    trim: true
  },
  roomNumber: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Single', 'Double Shared', 'Triple Shared', 'Any'],
    required: true
  }
}, { _id: false });

const exchangePreferencesSchema = new mongoose.Schema({
  hostels: [{
    type: String,
    trim: true
  }],
  blocks: [{
    type: String,
    trim: true
  }],
  floor: {
    type: String,
    trim: true
  },
  roomType: {
    type: String,
    enum: ['Single', 'Double Shared', 'Triple Shared', 'Any', ''],
    default: ''
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^20\d{2}u[a-z]{2,3}\d{4}@mnit\.ac\.in$/i, 'Please provide a valid MNIT email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  currentRoom: {
    type: roomLocationSchema,
    default: null
  },
  preferences: {
    type: exchangePreferencesSchema,
    default: () => ({
      hostels: [],
      blocks: [],
      floor: '',
      roomType: '',
      notes: ''
    })
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  whatsappNumber: {
    type: String,
    required: true,
    trim: true
  },
  hasActiveListing: {
    type: Boolean,
    default: false
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifiedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password; // Never include password in JSON response
      return ret;
    }
  }
});

// Pre-save middleware for logging
userSchema.pre('save', function(next) {
  console.log('💾 User Model - Pre-save hook triggered');
  console.log('💾 User Model - Saving user:', this.isNew ? 'NEW USER' : 'UPDATE', this.email);
  console.log('💾 User Model - User data:', {
    email: this.email,
    fullName: this.fullName,
    rollNumber: this.rollNumber,
    isEmailVerified: this.isEmailVerified,
    hasActiveListing: this.hasActiveListing
  });
  next();
});

// Post-save middleware for logging
userSchema.post('save', function(doc, next) {
  console.log('✅ User Model - Post-save hook triggered');
  console.log('✅ User Model - User saved successfully:', doc.email, 'ID:', doc._id);
  next();
});

// Pre-findOneAndUpdate middleware
userSchema.pre('findOneAndUpdate', function(next) {
  console.log('💾 User Model - Pre-findOneAndUpdate hook triggered');
  console.log('💾 User Model - Query:', JSON.stringify(this.getQuery()));
  console.log('💾 User Model - Update:', JSON.stringify(this.getUpdate()));
  next();
});

// Post-findOneAndUpdate middleware
userSchema.post('findOneAndUpdate', function(doc, next) {
  if (doc) {
    console.log('✅ User Model - Post-findOneAndUpdate hook triggered');
    console.log('✅ User Model - User updated successfully:', doc.email, 'ID:', doc._id);
  } else {
    console.log('⚠️ User Model - Post-findOneAndUpdate: No document found/updated');
  }
  next();
});

// Pre-findOne middleware
userSchema.pre('findOne', function(next) {
  console.log('🔍 User Model - Pre-findOne hook triggered');
  console.log('🔍 User Model - Query:', JSON.stringify(this.getQuery()));
  next();
});

// Post-findOne middleware
userSchema.post('findOne', function(doc, next) {
  if (doc) {
    console.log('✅ User Model - Post-findOne: User found:', doc.email, 'ID:', doc._id);
  } else {
    console.log('⚠️ User Model - Post-findOne: No user found for query');
  }
  next();
});

// No need for separate indexes since unique: true already creates indexes
module.exports = mongoose.model('User', userSchema);
