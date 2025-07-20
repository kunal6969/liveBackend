const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  sgpa: {
    type: String,
    required: true,
    validate: {
      validator: function(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 10;
      },
      message: 'SGPA must be a valid number between 0 and 10'
    }
  },
  credits: {
    type: String,
    required: true,
    validate: {
      validator: function(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
      },
      message: 'Credits must be a valid positive number'
    }
  }
}, { _id: false });

const cgpaDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  semesters: [{
    type: semesterSchema,
    required: true
  }],
  calculatedCGPA: {
    type: Number,
    default: 0
  },
  totalCredits: {
    type: Number,
    default: 0
  }
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

// No need for separate index since unique: true already creates index

// Calculate CGPA before saving
cgpaDataSchema.pre('save', function(next) {
  if (this.semesters && this.semesters.length > 0) {
    let totalGradePoints = 0;
    let totalCredits = 0;

    this.semesters.forEach(semester => {
      const sgpa = parseFloat(semester.sgpa);
      const credits = parseFloat(semester.credits);
      
      if (!isNaN(sgpa) && !isNaN(credits)) {
        totalGradePoints += sgpa * credits;
        totalCredits += credits;
      }
    });

    this.calculatedCGPA = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
    this.totalCredits = totalCredits;
  }
  next();
});

module.exports = mongoose.model('CgpaData', cgpaDataSchema);
