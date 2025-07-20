const express = require('express');
const User = require('../models/User');
const { validate, updateUserSchema } = require('../utils/validation');

const router = express.Router();

/**
 * @route   GET /api/user/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', async (req, res, next) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has active listings
    const RoomListing = require('../models/RoomListing');
    const activeListings = await RoomListing.countDocuments({ 
      listedBy: user._id,
      status: 'Open'
    });

    const userData = user.toJSON();
    userData.hasActiveListing = activeListings > 0;

    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: userData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/user/me
 * @desc    Update current user profile
 * @access  Private
 */
router.patch('/me', validate(updateUserSchema), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updateData = req.validatedData;

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/user/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', async (req, res, next) => {
  try {
    console.log('📊 GET /api/user/stats - Starting stats request');
    const userId = req.user.id;
    console.log('📊 GET /api/user/stats - User ID:', userId);
    
    // Get total users count for community stats
    console.log('📊 GET /api/user/stats - Counting total users');
    const totalUsers = await User.countDocuments();
    console.log('📊 GET /api/user/stats - Total users found:', totalUsers);
    
    // Get user's specific stats
    console.log('📊 GET /api/user/stats - Counting user listings');
    const RoomListing = require('../models/RoomListing');
    const userListings = await RoomListing.countDocuments({ 
      listedBy: userId,
      status: 'Open'
    });
    console.log('📊 GET /api/user/stats - User listings found:', userListings);

    const statsData = {
      totalUsers,
      userListings,
      memberSince: req.user.createdAt
    };

    console.log('✅ GET /api/user/stats - Stats compiled successfully:', statsData);
    res.json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: statsData
    });
  } catch (error) {
    console.error('❌ GET /api/user/stats - Error:', error.message, error.stack);
    next(error);
  }
});

/**
 * @route   GET /api/user/search
 * @desc    Search users by name or roll number
 * @access  Private
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const query = {
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { rollNumber: { $regex: q, $options: 'i' } }
      ]
    };

    const users = await User.find(query)
      .select('fullName rollNumber gender currentRoom')
      .limit(parseInt(limit))
      .sort({ fullName: 1 });

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: users.map(user => user.toJSON()),
        total: users.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/user/preferences
 * @desc    Update user exchange preferences
 * @access  Private
 */
router.patch('/preferences', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    // Update user preferences
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/user/details
 * @desc    Update user profile details
 * @access  Private
 */
router.patch('/details', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const details = req.body;

    // Update user details
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: details },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Details updated successfully',
      data: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
