/**
 * @file src/lib/async-wrap.js
 *
 * Functions for wrapping async/await functions for various purpouses.
 */

// Default objects to be passed into our async wrapper functions.
const asyncMiddlewareDefaults = {
  nextOnError: true
};

const asyncEndpointDefaults = {
  okStatus: 200
};

/**
 * Wraps an async function for use with an Express route middleware.
 *
 * @param {function} callable The async/await function to be wrapped.
 * @return {function} The wrapped function.
 */
const asyncMiddleware = (callable, options = asyncMiddlewareDefaults) => (
  req,
  res,
  next
) => {
  options = { ...asyncMiddlewareDefaults, ...options };

  callable(req)
    .then(ret => {
      if (ret && ret.error) {
        if (options.nextOnError === true) {
          req.error = ret.error;
        } else {
          const { error } = ret;
          return res.status(error.status || 500).json({ error });
        }
      } else if (ret) {
        req.previous = { ...req.previous, ret };
      }

      return next();
    })
    .catch(next);
};

/**
 * Wraps an async/await function for use with an Express route endpoint.
 *
 * @param {function} callable The async/await function to be wrapped.
 * @param {object} options Additional options to be passed in.
 * @param {number} options.okStatus The status to return if the function is successful.
 * @return {function} The wrapped function.
 */
const asyncEndpoint = (callable, options = asyncEndpointDefaults) => (
  req,
  res,
  next
) => {
  options = { ...asyncEndpointDefaults, ...options };

  callable(req)
    .then(ret => {
      if (ret && ret.error) {
        const { error } = ret;
        return res.status(error.status || 500).json({ error });
      } else if (ret) {
        return res.status(options.okStatus || 200).json(ret);
      }

      return res.status(options.okStatus || 200).end();
    })
    .catch(next);
};

/**
 * Wraps an async/await function for use with a Passport local login
 * strategy.
 *
 * @param {function} callable The async/await function to be wrapped.
 * @return {function} The wrapped function.
 */
const asyncPassportLocal = callable => (username, password, done) => {
  callable(username, password)
    .then(ret => {
      if (ret.error) {
        return done(null, false, ret.error);
      }

      if (ret.user) {
        return done(null, ret.user);
      } else {
        throw new Error('Passport Local Login - User object missing.');
      }
    })
    .catch(done);
};

// Exports
module.exports = {
  asyncMiddleware,
  asyncEndpoint,
  asyncPassportLocal
};
