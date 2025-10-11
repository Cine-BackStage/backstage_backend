const errorHandler = (err, req, res, _next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error
  const error = {
    success: false,
    message: 'Internal Server Error',
    statusCode: 500
  };

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
    case '23505': // Unique constraint violation
      error.statusCode = 409;
      error.message = 'Resource already exists';
      error.detail = 'A record with these values already exists';
      break;
    case '23503': // Foreign key constraint violation
      error.statusCode = 400;
      error.message = 'Invalid reference';
      error.detail = 'Referenced record does not exist';
      break;
    case '23502': // Not null constraint violation
      error.statusCode = 400;
      error.message = 'Missing required field';
      error.detail = 'A required field is missing';
      break;
    case '22001': // String data too long
      error.statusCode = 400;
      error.message = 'Data too long';
      error.detail = 'One or more fields exceed maximum length';
      break;
    case '08003': // Connection does not exist
    case '08006': // Connection failure
      error.statusCode = 503;
      error.message = 'Database connection error';
      error.detail = 'Unable to connect to the database';
      break;
    default:
      error.message = 'Database error';
      error.detail = err.message;
    }
  }

  // Validation errors from Joi
  if (err.isJoi) {
    error.statusCode = 400;
    error.message = 'Validation Error';
    error.detail = err.details.map(detail => detail.message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.statusCode = 401;
    error.message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    error.statusCode = 401;
    error.message = 'Token expired';
  }

  // Custom business logic errors
  if (err.message === 'Seat already taken' ||
      err.message === 'Discount code already applied' ||
      err.message.includes('already exists')) {
    error.statusCode = 409;
    error.message = err.message;
  }

  if (err.message === 'Session not found' ||
      err.message === 'Ticket not found' ||
      err.message === 'Sale not found' ||
      err.message.includes('not found')) {
    error.statusCode = 404;
    error.message = err.message;
  }

  if (err.message.includes('Insufficient payment') ||
      err.message.includes('required') ||
      err.message.includes('Invalid')) {
    error.statusCode = 400;
    error.message = err.message;
  }

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.detail && { detail: error.detail }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      originalError: err.message
    })
  });
};

module.exports = errorHandler;