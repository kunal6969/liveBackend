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

const roomListingSchema = new mongoose.Schema({
  listedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomDetails: {
    type: roomLocationSchema,
    required: true
  },
  listingType: {
    type: String,
    enum: ['Exchange', 'Bidding'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  desiredTradeConditions: {
    type: String,
    trim: true
  },
  allotmentProof: {
    type: String, // Base64 image string or file path
    trim: true
  },
  allotmentProofType: {
    type: String,
    enum: ['gmail', 'document', 'other'],
    default: 'gmail'
  },
  status: {
    type: String,
    enum: ['Open', 'Closed'],
    default: 'Open'
  },
  interestCount: {
    type: Number,
    default: 0
  },
  interestedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      ret.createdAt = ret.createdAt.toISOString();
      ret.updatedAt = ret.updatedAt.toISOString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Pre-save middleware for logging
roomListingSchema.pre('save', function(next) {
  console.log('🏠 RoomListing Model - Pre-save hook triggered');
  console.log('🏠 RoomListing Model - Saving listing:', this.isNew ? 'NEW LISTING' : 'UPDATE');
  console.log('🏠 RoomListing Model - Listing data:', {
    listedBy: this.listedBy,
    hostel: this.roomDetails.hostel,
    room: `${this.roomDetails.block}-${this.roomDetails.roomNumber}`,
    type: this.roomDetails.type,
    listingType: this.listingType,
    status: this.status
  });
  next();
});

// Post-save middleware for logging
roomListingSchema.post('save', function(doc, next) {
  console.log('✅ RoomListing Model - Post-save hook triggered');
  console.log('✅ RoomListing Model - Listing saved successfully, ID:', doc._id);
  next();
});

// Pre-find middleware
roomListingSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'countDocuments'], function(next) {
  console.log('🔍 RoomListing Model - Pre-find hook triggered for:', this.op);
  console.log('🔍 RoomListing Model - Query:', JSON.stringify(this.getQuery()));
  next();
});

// Post-find middleware
roomListingSchema.post(['find', 'findOne'], function(docs, next) {
  if (Array.isArray(docs)) {
    console.log('✅ RoomListing Model - Post-find: Found', docs.length, 'listings');
  } else if (docs) {
    console.log('✅ RoomListing Model - Post-findOne: Found listing ID:', docs._id);
  } else {
    console.log('⚠️ RoomListing Model - Post-find: No listings found');
  }
  next();
});

// Pre-deleteOne middleware
roomListingSchema.pre('deleteOne', function(next) {
  console.log('🗑️ RoomListing Model - Pre-deleteOne hook triggered');
  console.log('🗑️ RoomListing Model - Delete query:', JSON.stringify(this.getQuery()));
  next();
});

// Post-deleteOne middleware
roomListingSchema.post('deleteOne', function(result, next) {
  console.log('✅ RoomListing Model - Post-deleteOne hook triggered');
  console.log('✅ RoomListing Model - Delete result:', result.deletedCount, 'document(s) deleted');
  next();
});

// Index for faster queries
roomListingSchema.index({ status: 1 });
roomListingSchema.index({ listedBy: 1 });
roomListingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RoomListing', roomListingSchema);
