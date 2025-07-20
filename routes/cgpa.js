const express = require('express');
const CgpaData = require('../models/CgpaData');
const { validate, cgpaDataSchema } = require('../utils/validation');

const router = express.Router();

/**
 * @route   GET /api/cgpa
 * @desc    Get CGPA data for the authenticated user
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cgpaData = await CgpaData.findOne({ userId });

    if (!cgpaData) {
      return res.json({
        semesters: [],
        calculatedCGPA: 0,
        totalCredits: 0
      });
    }

    res.json(cgpaData.toJSON());
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/cgpa
 * @desc    Create or update CGPA data
 * @access  Private
 */
router.post('/', validate(cgpaDataSchema), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { semesters } = req.validatedData;

    // Validate that semester IDs are unique
    const semesterIds = semesters.map(s => s.id);
    const uniqueIds = new Set(semesterIds);
    
    if (semesterIds.length !== uniqueIds.size) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Semester IDs must be unique'
        }
      });
    }

    // Find existing CGPA data or create new
    let cgpaData = await CgpaData.findOne({ userId });

    if (cgpaData) {
      // Update existing data
      cgpaData.semesters = semesters;
      await cgpaData.save(); // This will trigger the pre-save hook to calculate CGPA
    } else {
      // Create new data
      cgpaData = new CgpaData({
        userId,
        semesters
      });
      await cgpaData.save(); // This will trigger the pre-save hook to calculate CGPA
    }

    res.json({
      message: 'CGPA data saved successfully',
      data: cgpaData.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/cgpa/semester/:semesterId
 * @desc    Update a specific semester
 * @access  Private
 */
router.patch('/semester/:semesterId', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const semesterId = req.params.semesterId;
    const { sgpa, credits } = req.body;

    // Validate input
    if (!sgpa && !credits) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one field (sgpa or credits) is required'
        }
      });
    }

    if (sgpa !== undefined) {
      const sgpaNum = parseFloat(sgpa);
      if (isNaN(sgpaNum) || sgpaNum < 0 || sgpaNum > 10) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'SGPA must be a valid number between 0 and 10'
          }
        });
      }
    }

    if (credits !== undefined) {
      const creditsNum = parseFloat(credits);
      if (isNaN(creditsNum) || creditsNum <= 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Credits must be a valid positive number'
          }
        });
      }
    }

    const cgpaData = await CgpaData.findOne({ userId });

    if (!cgpaData) {
      return res.status(404).json({
        error: {
          code: 'CGPA_DATA_NOT_FOUND',
          message: 'CGPA data not found. Please create it first.'
        }
      });
    }

    // Find and update the semester
    const semester = cgpaData.semesters.find(s => s.id === semesterId);

    if (!semester) {
      return res.status(404).json({
        error: {
          code: 'SEMESTER_NOT_FOUND',
          message: 'Semester not found'
        }
      });
    }

    if (sgpa !== undefined) semester.sgpa = sgpa.toString();
    if (credits !== undefined) semester.credits = credits.toString();

    await cgpaData.save(); // This will recalculate CGPA

    res.json({
      message: 'Semester updated successfully',
      data: cgpaData.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/cgpa/semester/:semesterId
 * @desc    Delete a specific semester
 * @access  Private
 */
router.delete('/semester/:semesterId', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const semesterId = req.params.semesterId;

    const cgpaData = await CgpaData.findOne({ userId });

    if (!cgpaData) {
      return res.status(404).json({
        error: {
          code: 'CGPA_DATA_NOT_FOUND',
          message: 'CGPA data not found'
        }
      });
    }

    // Filter out the semester
    const initialLength = cgpaData.semesters.length;
    cgpaData.semesters = cgpaData.semesters.filter(s => s.id !== semesterId);

    if (cgpaData.semesters.length === initialLength) {
      return res.status(404).json({
        error: {
          code: 'SEMESTER_NOT_FOUND',
          message: 'Semester not found'
        }
      });
    }

    await cgpaData.save(); // This will recalculate CGPA

    res.json({
      message: 'Semester deleted successfully',
      data: cgpaData.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/cgpa/calculate
 * @desc    Calculate CGPA for given semesters (without saving)
 * @access  Private
 */
router.post('/calculate', validate(cgpaDataSchema), async (req, res, next) => {
  try {
    const { semesters } = req.validatedData;

    let totalGradePoints = 0;
    let totalCredits = 0;

    const processedSemesters = semesters.map(semester => {
      const sgpa = parseFloat(semester.sgpa);
      const credits = parseFloat(semester.credits);
      
      if (!isNaN(sgpa) && !isNaN(credits)) {
        totalGradePoints += sgpa * credits;
        totalCredits += credits;
      }

      return {
        ...semester,
        sgpaNumeric: sgpa,
        creditsNumeric: credits
      };
    });

    const calculatedCGPA = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

    res.json({
      semesters: processedSemesters,
      calculatedCGPA: Math.round(calculatedCGPA * 100) / 100,
      totalCredits,
      totalGradePoints: Math.round(totalGradePoints * 100) / 100
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/cgpa/predict
 * @desc    Predict CGPA with additional semesters
 * @access  Private
 */
router.post('/predict', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { futureSemesters } = req.body;

    if (!futureSemesters || !Array.isArray(futureSemesters)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'futureSemesters array is required'
        }
      });
    }

    // Get current CGPA data
    const cgpaData = await CgpaData.findOne({ userId });
    const currentSemesters = cgpaData ? cgpaData.semesters : [];

    // Validate future semesters
    for (const semester of futureSemesters) {
      const sgpa = parseFloat(semester.sgpa);
      const credits = parseFloat(semester.credits);
      
      if (isNaN(sgpa) || sgpa < 0 || sgpa > 10) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'All future semester SGPAs must be valid numbers between 0 and 10'
          }
        });
      }
      
      if (isNaN(credits) || credits <= 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'All future semester credits must be valid positive numbers'
          }
        });
      }
    }

    // Calculate current totals
    let currentGradePoints = 0;
    let currentCredits = 0;

    currentSemesters.forEach(semester => {
      const sgpa = parseFloat(semester.sgpa);
      const credits = parseFloat(semester.credits);
      
      if (!isNaN(sgpa) && !isNaN(credits)) {
        currentGradePoints += sgpa * credits;
        currentCredits += credits;
      }
    });

    // Calculate with future semesters
    let futureGradePoints = 0;
    let futureCredits = 0;

    futureSemesters.forEach(semester => {
      const sgpa = parseFloat(semester.sgpa);
      const credits = parseFloat(semester.credits);
      
      futureGradePoints += sgpa * credits;
      futureCredits += credits;
    });

    const totalGradePoints = currentGradePoints + futureGradePoints;
    const totalCredits = currentCredits + futureCredits;
    const predictedCGPA = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

    res.json({
      currentCGPA: currentCredits > 0 ? currentGradePoints / currentCredits : 0,
      currentCredits,
      futureCredits,
      totalCredits,
      predictedCGPA: Math.round(predictedCGPA * 100) / 100,
      improvement: predictedCGPA - (currentCredits > 0 ? currentGradePoints / currentCredits : 0)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/cgpa
 * @desc    Delete all CGPA data for the user
 * @access  Private
 */
router.delete('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    await CgpaData.findOneAndDelete({ userId });

    res.json({
      message: 'CGPA data deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
