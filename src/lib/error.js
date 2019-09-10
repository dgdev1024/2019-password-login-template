/**
 * @file src/lib/error.js
 *
 * Functions and middleware for handling non-fatal errors.
 */

// Imports
const { getStatusText } = require('http-status-codes');
const log = require('./log');

/**
 * Express middleware function for handling route errors.
 *
 * @param {Error} err The error raised by another route function.
 * @param {Request} req The HTTP request object.
 * @param {Response} res The HTTP response object.
 * @param {function} next Not used.
 */
const handleRouteError = (err, req, res, next) => {
  // Get the error status code and text.
  const statusCode = err.status || 500;
  const statusText = getStatusText(statusCode);

  // Log the error.
  log.error(`Caught Route Error: ${err.stack || err}`);

  // Prepare an error object for return.
  const error = { status: statusCode, message: statusText };

  // Prepare a stack in development mode.
  if (process.env.NODE_ENV === 'development') {
    error.details = err.stack || err;
  }

  // Return the error in the response.
  return res.status(statusCode).json({ error });
};

/**
 * General function for raising non-fatal errors in route middleware
 * functions.
 *
 * @param {number} status The error status code.
 * @param {string} message The error message.
 * @param {string[]} details Strings detailing the error.
 * @return {{ error: { status: number, message: string, details: string[] }}} The error object.
 */
const raiseError = (status, message, details = []) => {
  return {
    error: { status, message, details }
  };
};

// Exports
module.exports = {
  handleRouteError,
  raiseError
};
