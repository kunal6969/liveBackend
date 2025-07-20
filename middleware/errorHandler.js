const errorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`\n💥 [${timestamp}] ERROR in ${req.method} ${req.url}`);
  console.error('💥 Error name:', err.name);
  console.error('💥 Error message:', err.message);
  console.error('💥 Error stack:', err.stack);
  console.error('💥 Request body:', JSON.stringify(req.body, null, 2));
  console.error('💥 Request params:', JSON.stringify(req.params, null, 2));
  console.error('💥 Request query:', JSON.stringify(req.query, null, 2));
  console.error('💥 User:', req.user ? `${req.user.email} (${req.user._id})` : 'Not authenticated');

  // Default error message
  let message = 'An unexpected error occurred';
  let statusCode = 500;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(error => error.message);
    message = messages.join(', ');
    statusCode = 400;
    return res.status(statusCode).json({ success: false, message });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
    statusCode = 409;
    return res.status(statusCode).json({ success: false, message });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    message = 'Invalid resource ID';
    statusCode = 400;
    return res.status(statusCode).json({ success: false, message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statusCode = 401;
    return res.status(statusCode).json({ success: false, message });
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Token expired';
    statusCode = 401;
    return res.status(statusCode).json({ success: false, message });
  }

  // Custom app errors
  if (err.statusCode) {
    message = err.message;
    statusCode = err.statusCode;
    return res.status(statusCode).json({ success: false, message });
  }

  // Default server error
  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
