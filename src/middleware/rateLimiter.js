const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

// Stricter limiter for ticket purchases (to prevent overselling)
const ticketPurchaseLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 ticket operations per 5 minutes
  message: {
    success: false,
    message: 'Too many ticket operations from this IP, please try again later.',
    retryAfter: 5 * 60 // 5 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter limiter for sale operations
const saleLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // limit each IP to 50 sale operations per 10 minutes
  message: {
    success: false,
    message: 'Too many sale operations from this IP, please try again later.',
    retryAfter: 10 * 60 // 10 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Very strict limiter for admin operations
const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // limit each IP to 30 admin operations per hour
  message: {
    success: false,
    message: 'Too many admin operations from this IP, please try again later.',
    retryAfter: 60 * 60 // 1 hour in seconds
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  generalLimiter,
  ticketPurchaseLimiter,
  saleLimiter,
  adminLimiter
};