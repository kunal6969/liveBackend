const express = require('express');
const Course = require('../models/Course');
const { validate, courseSchema, updateCourseSchema } = require('../utils/validation');

const router = express.Router();

/**
 * @route   GET /api/attendance/courses
 * @desc    Get all courses for the authenticated user
 * @access  Private
 */
router.get('/courses', async (req, res, next) => {
  try {
    console.log('📚 GET /api/attendance/courses - Starting courses request');
    const userId = req.user.id;
    console.log('📚 GET /api/attendance/courses - User ID:', userId);

    // Query courses collection with userId from auth token
    const courses = await Course.find({ userId }).sort({ createdAt: -1 });
    console.log('📚 GET /api/attendance/courses - Found', courses.length, 'courses');

    // Return array directly as per architecture specification
    const responseData = courses.map(course => course.toJSON());
    console.log('✅ GET /api/attendance/courses - Returning courses array');
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ GET /api/attendance/courses - Error:', error.message, error.stack);
    next(error);
  }
});

/**
 * @route   POST /api/attendance/courses
 * @desc    Create a new course
 * @access  Private
 */
router.post('/courses', validate(courseSchema), async (req, res, next) => {
  try {
    console.log('📚 POST /api/attendance/courses - Starting course creation');
    const userId = req.user.id;
    const { name, color } = req.validatedData;
    console.log('📚 POST /api/attendance/courses - Creating course:', { name, color, userId });

    // Validate name is non-empty string
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('❌ POST /api/attendance/courses - Invalid name');
      return res.status(400).json({
        error: 'Name must be a non-empty string'
      });
    }

    // Validate color is valid hex code
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (color && !hexColorRegex.test(color)) {
      console.log('❌ POST /api/attendance/courses - Invalid color format');
      return res.status(400).json({
        error: 'Color must be a valid hex code'
      });
    }

    // Check if course with same name already exists for this user
    console.log('📚 POST /api/attendance/courses - Checking for existing course');
    const existingCourse = await Course.findOne({ userId, name: name.trim() });
    if (existingCourse) {
      console.log('❌ POST /api/attendance/courses - Course already exists:', name);
      return res.status(409).json({
        error: 'A course with this name already exists'
      });
    }
    console.log('✅ POST /api/attendance/courses - Course name is unique');

    // Create new course document with userId from token and empty arrays
    const course = new Course({
      userId,
      name: name.trim(),
      color: color || '#3B82F6',
      attendedDays: [],
      missedDays: []
    });

    console.log('📚 POST /api/attendance/courses - Saving course to database');
    await course.save();
    console.log('✅ POST /api/attendance/courses - Course saved with ID:', course._id);

    res.status(201).json(course.toJSON());
  } catch (error) {
    console.error('❌ POST /api/attendance/courses - Error:', error.message, error.stack);
    next(error);
  }
});

/**
 * @route   GET /api/attendance/courses/:id
 * @desc    Get a specific course
 * @access  Private
 */
router.get('/courses/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.id;

    const course = await Course.findOne({ _id: courseId, userId });

    if (!course) {
      return res.status(404).json({
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found'
        }
      });
    }

    res.json(course.toJSON());
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/attendance/courses/:id
 * @desc    Update a course (name, color, or attendance data)
 * @access  Private
 */
router.patch('/courses/:id', validate(updateCourseSchema), async (req, res, next) => {
  try {
    console.log('📚 PATCH /api/attendance/courses/:id - Starting course update');
    const userId = req.user.id;
    const courseId = req.params.id;
    const updateData = req.validatedData;
    console.log('📚 PATCH /api/attendance/courses/:id - Update data:', { courseId, updateData, userId });

    console.log('📚 PATCH /api/attendance/courses/:id - Finding course');
    const course = await Course.findOne({ _id: courseId, userId });

    if (!course) {
      console.log('❌ PATCH /api/attendance/courses/:id - Course not found');
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    console.log('✅ PATCH /api/attendance/courses/:id - Course found:', course.name);

    // If updating name, check for duplicates
    if (updateData.name && updateData.name !== course.name) {
      console.log('📚 PATCH /api/attendance/courses/:id - Checking for duplicate name');
      const existingCourse = await Course.findOne({ 
        userId, 
        name: updateData.name,
        _id: { $ne: courseId }
      });
      
      if (existingCourse) {
        console.log('❌ PATCH /api/attendance/courses/:id - Duplicate name found');
        return res.status(409).json({
          success: false,
          message: 'A course with this name already exists'
        });
      }
    }

    // Update the course
    console.log('📚 PATCH /api/attendance/courses/:id - Applying updates');
    Object.keys(updateData).forEach(key => {
      course[key] = updateData[key];
      console.log('📚 PATCH /api/attendance/courses/:id - Updated', key, 'to:', updateData[key]);
    });

    console.log('📚 PATCH /api/attendance/courses/:id - Saving course');
    await course.save();
    console.log('✅ PATCH /api/attendance/courses/:id - Course updated successfully');

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: {
        course: course.toJSON()
      }
    });
  } catch (error) {
    console.error('❌ PATCH /api/attendance/courses/:id - Error:', error.message, error.stack);
    next(error);
  }
});

/**
 * @route   DELETE /api/attendance/courses/:courseId
 * @desc    Delete a specific course
 * @access  Private
 */
router.delete('/courses/:courseId', async (req, res, next) => {
  try {
    console.log('🗑️ DELETE /api/attendance/courses/:courseId - Starting course deletion');
    const userId = req.user.id;
    const courseId = req.params.courseId;
    console.log('🗑️ DELETE /api/attendance/courses/:courseId - Data:', { courseId, userId });

    // Find course by _id (courseId)
    console.log('🗑️ DELETE /api/attendance/courses/:courseId - Finding course');
    const course = await Course.findById(courseId);

    if (!course) {
      console.log('❌ DELETE /api/attendance/courses/:courseId - Course not found');
      return res.status(404).json({
        error: 'Course not found'
      });
    }

    // CRUCIAL SECURITY CHECK: Verify userId ownership
    if (course.userId.toString() !== userId) {
      console.log('❌ DELETE /api/attendance/courses/:courseId - Unauthorized access attempt');
      return res.status(403).json({
        error: 'Forbidden'
      });
    }
    console.log('✅ DELETE /api/attendance/courses/:courseId - Ownership verified');

    // Delete the document
    console.log('🗑️ DELETE /api/attendance/courses/:courseId - Deleting course');
    await Course.findByIdAndDelete(courseId);
    console.log('✅ DELETE /api/attendance/courses/:courseId - Course deleted successfully');

    res.status(204).send(); // 204 No Content as per specification
  } catch (error) {
    console.error('❌ DELETE /api/attendance/courses/:courseId - Error:', error.message, error.stack);
    next(error);
  }
});

/**
 * @route   PATCH /api/attendance/courses/:courseId/mark
 * @desc    Mark or unmark attendance for a specific day (atomic operations)
 * @access  Private
 */
router.patch('/courses/:courseId/mark', async (req, res, next) => {
  try {
    console.log('📊 PATCH /api/attendance/courses/:courseId/mark - Starting attendance marking');
    const userId = req.user.id;
    const courseId = req.params.courseId;
    const { date, status } = req.body;
    console.log('📊 PATCH /api/attendance/courses/:courseId/mark - Data:', { courseId, date, status, userId });

    // Validate request body
    if (!date || typeof date !== 'string') {
      console.log('❌ PATCH /api/attendance/courses/:courseId/mark - Invalid date');
      return res.status(400).json({
        error: 'Date is required and must be a string'
      });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.log('❌ PATCH /api/attendance/courses/:courseId/mark - Invalid date format');
      return res.status(400).json({
        error: 'Date must be in YYYY-MM-DD format'
      });
    }

    // Validate status
    if (!status || !['attended', 'missed'].includes(status)) {
      console.log('❌ PATCH /api/attendance/courses/:courseId/mark - Invalid status');
      return res.status(400).json({
        error: 'Status must be either "attended" or "missed"'
      });
    }

    console.log('✅ PATCH /api/attendance/courses/:courseId/mark - Validation passed');

    // Find course by courseId
    console.log('📊 PATCH /api/attendance/courses/:courseId/mark - Finding course');
    const course = await Course.findById(courseId);

    if (!course) {
      console.log('❌ PATCH /api/attendance/courses/:courseId/mark - Course not found');
      return res.status(404).json({
        error: 'Course not found'
      });
    }

    // CRUCIAL SECURITY CHECK: Verify ownership
    if (course.userId.toString() !== userId) {
      console.log('❌ PATCH /api/attendance/courses/:courseId/mark - Unauthorized access attempt');
      return res.status(403).json({
        error: 'Forbidden'
      });
    }
    console.log('✅ PATCH /api/attendance/courses/:courseId/mark - Ownership verified');

    // Perform atomic update using MongoDB operators
    let updateQuery = {};
    
    if (status === 'attended') {
      console.log('📊 PATCH /api/attendance/courses/:courseId/mark - Processing "attended" status');
      // Remove from missedDays, toggle in attendedDays
      updateQuery = {
        $pull: { missedDays: date }, // Remove from missed
        $addToSet: { attendedDays: date } // Add to attended (prevents duplicates)
      };
      
      // Check if already attended to implement toggle behavior
      if (course.attendedDays.includes(date)) {
        console.log('📊 PATCH /api/attendance/courses/:courseId/mark - Date already attended, toggling off');
        updateQuery = {
          $pull: { 
            missedDays: date, 
            attendedDays: date 
          }
        };
      }
    } else if (status === 'missed') {
      console.log('📊 PATCH /api/attendance/courses/:courseId/mark - Processing "missed" status');
      // Remove from attendedDays, toggle in missedDays
      updateQuery = {
        $pull: { attendedDays: date }, // Remove from attended
        $addToSet: { missedDays: date } // Add to missed (prevents duplicates)
      };
      
      // Check if already missed to implement toggle behavior
      if (course.missedDays.includes(date)) {
        console.log('📊 PATCH /api/attendance/courses/:courseId/mark - Date already missed, toggling off');
        updateQuery = {
          $pull: { 
            attendedDays: date,
            missedDays: date 
          }
        };
      }
    }

    console.log('📊 PATCH /api/attendance/courses/:courseId/mark - Executing atomic update');
    console.log('📊 PATCH /api/attendance/courses/:courseId/mark - Update query:', JSON.stringify(updateQuery, null, 2));

    // Execute atomic update
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      updateQuery,
      { 
        new: true, // Return updated document
        runValidators: true 
      }
    );

    console.log('✅ PATCH /api/attendance/courses/:courseId/mark - Atomic update completed');
    console.log('📊 PATCH /api/attendance/courses/:courseId/mark - Updated course attendance:', {
      attended: updatedCourse.attendedDays.length,
      missed: updatedCourse.missedDays.length
    });

    res.status(200).json(updatedCourse.toJSON());
  } catch (error) {
    console.error('❌ PATCH /api/attendance/courses/:courseId/mark - Error:', error.message, error.stack);
    next(error);
  }
});

/**
 * @route   DELETE /api/attendance/courses/:id/mark
 * @desc    Remove attendance mark for a specific date
 * @access  Private
 */
router.delete('/courses/:id/mark', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.id;
    const { date } = req.body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Valid date in YYYY-MM-DD format is required'
        }
      });
    }

    const course = await Course.findOne({ _id: courseId, userId });

    if (!course) {
      return res.status(404).json({
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found'
        }
      });
    }

    // Remove date from both arrays
    course.attendedDays = course.attendedDays.filter(d => d !== date);
    course.missedDays = course.missedDays.filter(d => d !== date);

    await course.save();

    res.json({
      message: 'Attendance mark removed successfully',
      course: course.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/attendance/courses/:id
 * @desc    Delete a course
 * @access  Private
 */
router.delete('/courses/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.id;

    const course = await Course.findOneAndDelete({ _id: courseId, userId });

    if (!course) {
      return res.status(404).json({
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found'
        }
      });
    }

    res.json({
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/attendance/stats
 * @desc    Get attendance statistics for the authenticated user
 * @access  Private
 */
router.get('/stats', async (req, res, next) => {
  try {
    console.log('📊 GET /api/attendance/stats - Starting attendance stats request');
    const userId = req.user.id;
    console.log('📊 GET /api/attendance/stats - User ID:', userId);

    // Get all courses for this user
    const courses = await Course.find({ userId });
    console.log('📊 GET /api/attendance/stats - Found', courses.length, 'courses');

    // Calculate statistics
    let totalAttendedDays = 0;
    let totalMissedDays = 0;
    let totalCoursesCount = courses.length;

    const courseStats = courses.map(course => {
      const attendedCount = course.attendedDays.length;
      const missedCount = course.missedDays.length;
      const totalDays = attendedCount + missedCount;
      const attendancePercentage = totalDays > 0 ? ((attendedCount / totalDays) * 100).toFixed(2) : 0;

      totalAttendedDays += attendedCount;
      totalMissedDays += missedCount;

      return {
        id: course._id,
        name: course.name,
        color: course.color,
        attendedDays: attendedCount,
        missedDays: missedCount,
        totalDays: totalDays,
        attendancePercentage: parseFloat(attendancePercentage)
      };
    });

    const overallTotalDays = totalAttendedDays + totalMissedDays;
    const overallAttendancePercentage = overallTotalDays > 0 ? 
      ((totalAttendedDays / overallTotalDays) * 100).toFixed(2) : 0;

    const stats = {
      totalCourses: totalCoursesCount,
      totalAttendedDays,
      totalMissedDays,
      totalDays: overallTotalDays,
      overallAttendancePercentage: parseFloat(overallAttendancePercentage),
      courses: courseStats
    };

    console.log('✅ GET /api/attendance/stats - Stats compiled:', stats);

    res.json({
      success: true,
      message: 'Attendance statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('❌ GET /api/attendance/stats - Error:', error.message, error.stack);
    next(error);
  }
});

/**
 * @route   GET /api/attendance/calendar
 * @desc    Get attendance calendar data for the authenticated user
 * @access  Private
 */
router.get('/calendar', async (req, res, next) => {
  try {
    console.log('📅 GET /api/attendance/calendar - Starting calendar request');
    const userId = req.user.id;
    const { startDate, endDate, courseId } = req.query;
    console.log('📅 GET /api/attendance/calendar - Parameters:', { userId, startDate, endDate, courseId });

    // Build query
    let query = { userId };
    if (courseId) {
      query._id = courseId;
    }

    const courses = await Course.find(query);
    console.log('📅 GET /api/attendance/calendar - Found', courses.length, 'courses');

    // Build calendar data
    const calendarData = {};
    
    courses.forEach(course => {
      // Add attended days
      course.attendedDays.forEach(date => {
        if (!calendarData[date]) {
          calendarData[date] = [];
        }
        calendarData[date].push({
          courseId: course._id,
          courseName: course.name,
          courseColor: course.color,
          status: 'attended'
        });
      });

      // Add missed days
      course.missedDays.forEach(date => {
        if (!calendarData[date]) {
          calendarData[date] = [];
        }
        calendarData[date].push({
          courseId: course._id,
          courseName: course.name,
          courseColor: course.color,
          status: 'missed'
        });
      });
    });

    // Filter by date range if provided
    if (startDate || endDate) {
      Object.keys(calendarData).forEach(date => {
        if (startDate && date < startDate) {
          delete calendarData[date];
        } else if (endDate && date > endDate) {
          delete calendarData[date];
        }
      });
    }

    console.log('✅ GET /api/attendance/calendar - Calendar data compiled for', Object.keys(calendarData).length, 'dates');

    res.json({
      success: true,
      message: 'Calendar data retrieved successfully',
      data: {
        calendar: calendarData,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });
  } catch (error) {
    console.error('❌ GET /api/attendance/calendar - Error:', error.message, error.stack);
    next(error);
  }
});

/**
 * @route   GET /api/attendance/week-summary
 * @desc    Get current week's attendance summary for the authenticated user
 * @access  Private
 */
router.get('/week-summary', async (req, res, next) => {
  try {
    console.log('📊 GET /api/attendance/week-summary - Starting week summary request');
    const userId = req.user.id;
    const { date } = req.query;
    console.log('📊 GET /api/attendance/week-summary - Parameters:', { userId, date });

    // Get start and end of the week
    const targetDate = date ? new Date(date) : new Date();
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Format dates as YYYY-MM-DD
    const startDateStr = startOfWeek.toISOString().split('T')[0];
    const endDateStr = endOfWeek.toISOString().split('T')[0];
    
    console.log('📊 GET /api/attendance/week-summary - Week range:', { startDateStr, endDateStr });

    const courses = await Course.find({ userId });
    console.log('📊 GET /api/attendance/week-summary - Found', courses.length, 'courses');

    const weekSummary = courses.map(course => {
      const attendedThisWeek = course.attendedDays.filter(date => 
        date >= startDateStr && date <= endDateStr
      ).length;

      const missedThisWeek = course.missedDays.filter(date => 
        date >= startDateStr && date <= endDateStr
      ).length;

      const totalThisWeek = attendedThisWeek + missedThisWeek;
      const attendanceRate = totalThisWeek > 0 ? ((attendedThisWeek / totalThisWeek) * 100).toFixed(1) : '0.0';

      return {
        courseId: course._id,
        courseName: course.name,
        courseColor: course.color,
        attendedThisWeek,
        missedThisWeek,
        totalThisWeek,
        attendanceRate: parseFloat(attendanceRate),
        weekDates: {
          start: startDateStr,
          end: endDateStr
        }
      };
    });

    console.log('✅ GET /api/attendance/week-summary - Week summary compiled for', weekSummary.length, 'courses');

    res.json({
      success: true,
      message: 'Week summary retrieved successfully',
      data: {
        weekSummary,
        weekRange: {
          start: startDateStr,
          end: endDateStr
        }
      }
    });
  } catch (error) {
    console.error('❌ GET /api/attendance/week-summary - Error:', error.message, error.stack);
    next(error);
  }
});

module.exports = router;
