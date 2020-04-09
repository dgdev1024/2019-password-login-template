/**
 * @file lib/force-https.js
 *
 * Route middleware function for forcing redirect to HTTPS.
 */

/**
 * Express middleware function for ensuring requests are made over HTTPS
 * and not HTTP.
 *
 * @param {Request} req The HTTP request object.
 * @param {Response} res The HTTP response object.
 * @param {Function} next The next middleware function.
 */
const forceHttps = (req, res, next) => {
  // Production only.
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // This option can be toggled on or off with an environment variable.
  if (process.env.FORCE_HTTPS === 'false') {
    return next();
  }

  if (req.get('X-Forwarded-Proto').indexOf('https') !== -1) {
    return next();
  } else {
    res.redirect('https://' + req.hostname + req.url);
  }
};

// Exports
module.exports = forceHttps;
