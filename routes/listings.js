const express = require('express');
const RoomListing = require('../models/RoomListing');
const User = require('../models/User');
const { validate, roomListingSchema } = require('../utils/validation');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { upload, imageToBase64, deleteFile } = require('../utils/fileUpload');

const router = express.Router();

// Helper function to parse full room number (e.g., "A-101" -> block: "A", roomNumber: "101")
const parseRoomNumber = (fullRoomNumber) => {
  if (!fullRoomNumber) return { block: '', roomNumber: '' };
  
  const parts = fullRoomNumber.split('-');
  if (parts.length === 2) {
    return { block: parts[0].trim(), roomNumber: parts[1].trim() };
  }
  
  // If no dash, try to extract block from first character(s)
  const match = fullRoomNumber.match(/^([A-Za-z]+)(.*)$/);
  if (match) {
    return { block: match[1], roomNumber: match[2] };
  }
  
  // Fallback - treat entire string as room number with default block
  return { block: 'A', roomNumber: fullRoomNumber };
};

// Helper function to process room details - handles both single field and separate field formats
const processRoomDetails = (roomDetails) => {
  console.log('🔧 Helper - processRoomDetails called with:', roomDetails);
  
  // If block is provided and not empty, use it as-is
  if (roomDetails.block && roomDetails.block.trim()) {
    console.log('✅ Helper - Using provided block:', roomDetails.block);
    return {
      ...roomDetails,
      block: roomDetails.block.trim(),
      roomNumber: roomDetails.roomNumber.trim()
    };
  }
  
  // If block is empty, try to parse from roomNumber
  console.log('🔧 Helper - Block is empty, parsing from room number:', roomDetails.roomNumber);
  const { block, roomNumber } = parseRoomNumber(roomDetails.roomNumber);
  
  const result = {
    ...roomDetails,
    block: block || 'A', // Ensure block is never empty
    roomNumber: roomNumber
  };
  
  console.log('✅ Helper - Processed room details:', result);
  return result;
};

/**
 * @route   GET /api/listings
 * @desc    Get all room listings
 * @access  Public (but user info is optional)
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    console.log('🔍 GET /api/listings - Starting request with query:', req.query);
    console.log('🔍 GET /api/listings - User authenticated:', !!req.user);
    
    const { 
      page = 1, 
      limit = 20, 
      status = 'Open',
      listingType,
      hostel,
      roomType,
      search
    } = req.query;

    // Build query
    const query = { status };
    console.log('🔍 GET /api/listings - Base query:', query);
    
    if (listingType) {
      query.listingType = listingType;
      console.log('🔍 GET /api/listings - Added listingType filter:', listingType);
    }
    
    if (hostel) {
      query['roomDetails.hostel'] = hostel;
      console.log('🔍 GET /api/listings - Added hostel filter:', hostel);
    }
    
    if (roomType && roomType !== 'Any') {
      query['roomDetails.type'] = roomType;
      console.log('🔍 GET /api/listings - Added roomType filter:', roomType);
    }
    
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { 'roomDetails.hostel': { $regex: search, $options: 'i' } },
        { desiredTradeConditions: { $regex: search, $options: 'i' } }
      ];
      console.log('🔍 GET /api/listings - Added search filter:', search);
    }

    console.log('🔍 GET /api/listings - Final query:', JSON.stringify(query, null, 2));
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('🔍 GET /api/listings - Pagination: skip', skip, 'limit', limit);

    // Get listings with populated user data
    const listings = await RoomListing.find(query)
      .populate('listedBy', 'id fullName rollNumber gender whatsappNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log('🔍 GET /api/listings - Found', listings.length, 'listings');

    // Get total count for pagination
    const total = await RoomListing.countDocuments(query);
    console.log('🔍 GET /api/listings - Total matching documents:', total);

    // Add user's interest status if authenticated
    const listingsWithInterestStatus = listings.map(listing => {
      const listingData = listing.toJSON();
      
      if (req.user) {
        listingData.currentUserInterested = listing.interestedUsers.includes(req.user.id);
      }
      
      return listingData;
    });

    console.log('✅ GET /api/listings - Returning', listingsWithInterestStatus.length, 'listings');
    res.json({
      success: true,
      message: 'Listings retrieved successfully',
      data: listingsWithInterestStatus, // Return listings directly as array
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + listings.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ GET /api/listings - Error:', error.message, error.stack);
    next(error);
  }
});

/**
 * @route   POST /api/listings
 * @desc    Create or update a room listing
 * @access  Private
 */
router.post('/', authenticateToken, validate(roomListingSchema), async (req, res, next) => {
  try {
    console.log('📝 POST /api/listings - Starting request');
    console.log('📝 POST /api/listings - User ID:', req.user.id);
    console.log('📝 POST /api/listings - Request body:', JSON.stringify(req.validatedData, null, 2));
    
    const userId = req.user.id;
    const { 
      roomDetails, 
      listingType, 
      description, 
      desiredTradeConditions,
      allotmentProof,
      allotmentProofType 
    } = req.validatedData;

    // Process room details to handle both single field and separate field formats
    const processedRoomDetails = processRoomDetails(roomDetails);

    // Check if user already has an active listing
    let existingListing = await RoomListing.findOne({
      listedBy: userId,
      status: 'Open'
    });

    let listing;

    if (existingListing) {
      // Update existing listing
      existingListing.roomDetails = processedRoomDetails;
      existingListing.listingType = listingType;
      existingListing.description = description;
      existingListing.desiredTradeConditions = desiredTradeConditions;
      
      // Update allotment proof if provided
      if (allotmentProof) {
        existingListing.allotmentProof = allotmentProof;
      }
      if (allotmentProofType) {
        existingListing.allotmentProofType = allotmentProofType;
      }
      
      listing = await existingListing.save();
    } else {
      // Create new listing
      listing = new RoomListing({
        listedBy: userId,
        roomDetails: processedRoomDetails,
        listingType,
        description,
        desiredTradeConditions,
        allotmentProof,
        allotmentProofType: allotmentProofType || 'gmail'
      });
      
      await listing.save();
    }

    // Update user's current room and active listing status
    await User.findByIdAndUpdate(userId, {
      currentRoom: processedRoomDetails,
      hasActiveListing: true
    });

    // Populate the user data for response
    await listing.populate('listedBy', 'id fullName rollNumber gender whatsappNumber');

    res.status(existingListing ? 200 : 201).json({
      success: true,
      message: existingListing ? 'Listing updated successfully' : 'Listing created successfully',
      data: {
        listing: listing.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/listings/my
 * @desc    Get current user's listings
 * @access  Private
 */
router.get('/my', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const listings = await RoomListing.find({ listedBy: userId })
      .populate('listedBy', 'id fullName rollNumber gender whatsappNumber')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'User listings retrieved successfully',
      data: listings.map(listing => listing.toJSON()) // Return listings directly as array
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/listings/:id/delist
 * @desc    Delist (close) a room listing
 * @access  Private
 */
router.patch('/:id/delist', authenticateToken, async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const userId = req.user.id;

    const listing = await RoomListing.findOne({
      _id: listingId,
      listedBy: userId
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found or you do not have permission to modify it'
      });
    }

    listing.status = 'Closed';
    await listing.save();

    // Update user's active listing status
    await User.findByIdAndUpdate(userId, {
      hasActiveListing: false
    });

    res.json({
      success: true,
      message: 'Listing delisted successfully',
      data: {
        listing: listing.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/listings/:id/interest
 * @desc    Express or remove interest in a listing
 * @access  Private
 */
router.post('/:id/interest', authenticateToken, async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const userId = req.user.id;

    const listing = await RoomListing.findById(listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Can't express interest in own listing
    if (listing.listedBy.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot express interest in your own listing'
      });
    }

    const userObjectId = req.user._id;
    const isAlreadyInterested = listing.interestedUsers.includes(userObjectId);

    if (isAlreadyInterested) {
      // Remove interest
      listing.interestedUsers.pull(userObjectId);
      listing.interestCount = Math.max(0, listing.interestCount - 1);
    } else {
      // Add interest
      listing.interestedUsers.push(userObjectId);
      listing.interestCount = listing.interestCount + 1;
    }

    await listing.save();

    res.json({
      success: true,
      message: isAlreadyInterested ? 'Interest removed' : 'Interest expressed',
      data: {
        interested: !isAlreadyInterested,
        interestCount: listing.interestCount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/listings/:id
 * @desc    Get a specific listing by ID
 * @access  Public
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const listingId = req.params.id;

    const listing = await RoomListing.findById(listingId)
      .populate('listedBy', 'id fullName rollNumber gender whatsappNumber');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    const listingData = listing.toJSON();
    
    if (req.user) {
      listingData.currentUserInterested = listing.interestedUsers.includes(req.user.id);
    }

    res.json({
      success: true,
      message: 'Listing retrieved successfully',
      data: {
        listing: listingData
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/listings/upload-proof
 * @desc    Upload allotment proof image
 * @access  Private
 */
router.post('/upload-proof', authenticateToken, upload.single('allotmentProof'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an image file.'
      });
    }

    // Convert uploaded image to base64
    const base64Image = imageToBase64(req.file.path);
    
    if (!base64Image) {
      // Cleanup uploaded file if conversion failed
      deleteFile(req.file.path);
      return res.status(500).json({
        success: false,
        message: 'Failed to process uploaded image'
      });
    }

    // Cleanup the temporary file after converting to base64
    deleteFile(req.file.path);

    res.json({
      success: true,
      message: 'Allotment proof uploaded successfully',
      data: {
        allotmentProof: base64Image,
        filename: req.file.filename,
        size: req.file.size
      }
    });

  } catch (error) {
    // Cleanup file if error occurs
    if (req.file) {
      deleteFile(req.file.path);
    }
    console.error('❌ POST /api/listings/upload-proof - Error:', error.message);
    next(error);
  }
});

/**
 * @route   PUT /api/listings/:id
 * @desc    Update a room listing
 * @access  Private
 */
router.put('/:id', authenticateToken, validate(roomListingSchema), async (req, res, next) => {
  try {
    console.log('🔄 PUT /api/listings/:id - Starting request');
    console.log('🔄 PUT /api/listings/:id - Listing ID:', req.params.id);
    console.log('🔄 PUT /api/listings/:id - User ID:', req.user.id);
    console.log('🔄 PUT /api/listings/:id - Request body:', JSON.stringify(req.validatedData, null, 2));

    const listingId = req.params.id;
    const userId = req.user.id;
    const { 
      roomDetails, 
      listingType, 
      description, 
      desiredTradeConditions,
      allotmentProof,
      allotmentProofType 
    } = req.validatedData;

    // Find the listing
    const listing = await RoomListing.findOne({
      _id: listingId,
      listedBy: userId
    });

    if (!listing) {
      console.log('❌ PUT /api/listings/:id - Listing not found or unauthorized');
      return res.status(404).json({
        success: false,
        message: 'Listing not found or you do not have permission to modify it'
      });
    }

    // Process room details to handle both single field and separate field formats
    const processedRoomDetails = processRoomDetails(roomDetails);

    // Update listing fields
    listing.roomDetails = processedRoomDetails;
    listing.listingType = listingType;
    listing.description = description;
    listing.desiredTradeConditions = desiredTradeConditions;
    
    // Update allotment proof if provided
    if (allotmentProof) {
      listing.allotmentProof = allotmentProof;
    }
    if (allotmentProofType) {
      listing.allotmentProofType = allotmentProofType;
    }
    
    await listing.save();
    console.log('✅ PUT /api/listings/:id - Listing updated successfully');

    // Update user's current room
    await User.findByIdAndUpdate(userId, {
      currentRoom: processedRoomDetails
    });

    // Populate the user data for response
    await listing.populate('listedBy', 'id fullName rollNumber gender whatsappNumber');

    res.json({
      success: true,
      message: 'Listing updated successfully',
      data: {
        listing: listing.toJSON()
      }
    });
  } catch (error) {
    console.error('❌ PUT /api/listings/:id - Error:', error.message, error.stack);
    next(error);
  }
});

/**
 * @route   DELETE /api/listings/:id
 * @desc    Delete a room listing
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    console.log('🗑️ DELETE /api/listings/:id - Starting request');
    console.log('🗑️ DELETE /api/listings/:id - Listing ID:', req.params.id);
    console.log('🗑️ DELETE /api/listings/:id - User ID:', req.user.id);

    const listingId = req.params.id;
    const userId = req.user.id;

    const listing = await RoomListing.findOne({
      _id: listingId,
      listedBy: userId
    });

    if (!listing) {
      console.log('❌ DELETE /api/listings/:id - Listing not found or unauthorized');
      return res.status(404).json({
        success: false,
        message: 'Listing not found or you do not have permission to delete it'
      });
    }

    // Delete the listing
    await RoomListing.deleteOne({ _id: listingId });
    console.log('✅ DELETE /api/listings/:id - Listing deleted successfully');

    // Update user's active listing status
    const remainingListings = await RoomListing.countDocuments({
      listedBy: userId,
      status: 'Open'
    });

    await User.findByIdAndUpdate(userId, {
      hasActiveListing: remainingListings > 0
    });

    res.json({
      success: true,
      message: 'Listing deleted successfully',
      data: {
        deletedListingId: listingId
      }
    });
  } catch (error) {
    console.error('❌ DELETE /api/listings/:id - Error:', error.message, error.stack);
    next(error);
  }
});

module.exports = router;
