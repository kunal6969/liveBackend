const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    default: '#3B82F6' // Default blue color
  },
  attendedDays: [{
    type: String, // YYYY-MM-DD format
    validate: {
      validator: function(date) {
        return /^\d{4}-\d{2}-\d{2}$/.test(date);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  }],
  missedDays: [{
    type: String, // YYYY-MM-DD format
    validate: {
      validator: function(date) {
        return /^\d{4}-\d{2}-\d{2}$/.test(date);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.userId; // Don't expose userId in response
      return ret;
    }
  }
});

// Pre-save middleware for logging
courseSchema.pre('save', function(next) {
  console.log('📚 Course Model - Pre-save hook triggered');
  console.log('📚 Course Model - Saving course:', this.isNew ? 'NEW COURSE' : 'UPDATE', this.name);
  console.log('📚 Course Model - Course data:', {
    name: this.name,
    color: this.color,
    attendedDays: this.attendedDays.length,
    missedDays: this.missedDays.length
  });
  next();
});

// Post-save middleware for logging
courseSchema.post('save', function(doc, next) {
  console.log('✅ Course Model - Post-save hook triggered');
  console.log('✅ Course Model - Course saved successfully:', doc.name, 'ID:', doc._id);
  next();
});

// Pre-find middleware
courseSchema.pre(['find', 'findOne'], function(next) {
  console.log('🔍 Course Model - Pre-find hook triggered for:', this.op);
  console.log('🔍 Course Model - Query:', JSON.stringify(this.getQuery()));
  next();
});

// Post-find middleware
courseSchema.post(['find', 'findOne'], function(docs, next) {
  if (Array.isArray(docs)) {
    console.log('✅ Course Model - Post-find: Found', docs.length, 'courses');
  } else if (docs) {
    console.log('✅ Course Model - Post-findOne: Found course:', docs.name, 'ID:', docs._id);
  } else {
    console.log('⚠️ Course Model - Post-find: No courses found');
  }
  next();
});

// Index for faster queries
courseSchema.index({ userId: 1 });

module.exports = mongoose.model('Course', courseSchema);
