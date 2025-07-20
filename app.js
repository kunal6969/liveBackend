const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const listingRoutes = require('./routes/listings');
const attendanceRoutes = require('./routes/attendance');
const cgpaRoutes = require('./routes/cgpa');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5001; // Changed to 5001 to avoid conflicts

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:5173', // Vite default port
  'http://localhost:5175', // Current Vite port
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Enable credentials (cookies, authorization headers)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Explicit preflight handler for all routes
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📡 [${timestamp}] ${req.method} ${req.url}`);
  console.log(`🔍 Headers:`, JSON.stringify({
    'content-type': req.headers['content-type'],
    'authorization': req.headers['authorization'] ? 'Bearer ***' : 'None',
    'cookie': req.headers.cookie ? 'Present' : 'None',
    'origin': req.headers.origin,
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
  }, null, 2));
  
  if (Object.keys(req.body).length > 0) {
    console.log(`📝 Body:`, JSON.stringify(req.body, null, 2));
  }
  if (Object.keys(req.query).length > 0) {
    console.log(`🔍 Query:`, JSON.stringify(req.query, null, 2));
  }
  
  // Log response
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`📤 [${timestamp}] Response ${res.statusCode} for ${req.method} ${req.url}`);
    if (res.statusCode >= 400) {
      console.log(`❌ Error Response:`, body.substring ? body.substring(0, 200) : body);
    }
    originalSend.call(this, body);
  };
  
  next();
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dalalihostelki')
  .then(() => {
    console.log('✅ Connected to MongoDB');
    console.log('🗄️ Database Name:', mongoose.connection.name);
    console.log('🗄️ Database Host:', mongoose.connection.host);
    console.log('🗄️ Database Port:', mongoose.connection.port);
    
    // Test database connection by counting collections
    mongoose.connection.db.listCollections().toArray().then(collections => {
      console.log('📊 Available collections:', collections.map(c => c.name).join(', '));
    }).catch(err => {
      console.error('❌ Error listing collections:', err.message);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    console.error('❌ Full error details:', error.message);
    console.error('❌ Connection string:', process.env.MONGODB_URI || 'mongodb://localhost:27017/dalalihostelki');
    process.exit(1);
  });

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hostel Dalali Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      user: '/api/user',
      listings: '/api/listings',
      attendance: '/api/attendance',
      cgpa: '/api/cgpa'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// CORS test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'CORS is working! 🎉',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent']
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/attendance', authenticateToken, attendanceRoutes);
app.use('/api/cgpa', authenticateToken, cgpaRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🗄️  Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel-dalali'}`);
  console.log(`🌐 CORS allowed origins:`, allowedOrigins);
  console.log(`📡 API Base URL: http://localhost:${PORT}`);
});
