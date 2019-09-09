/**
 * @file src/lib/async-wrap.js
 *
 * Functions for wrapping async/await functions for various purpouses.
 */

/**
 * Wraps an async function for use with an Express route middleware.
 *
 * @param {function} callable The async/await function to be wrapped.
 * @return {function} The wrapped function.
 */
const asyncMiddleware = callable => (req, res, next) => {
  callable(req)
    .then(ret => {
      if (ret && ret.error) {
        req.error = ret.error;
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
const asyncEndpoint = (callable, { okStatus }) => (req, res, next) => {
  callable(req)
    .then(ret => {
      if (ret && ret.error) {
        const { error } = ret;
        return res.status(error.status || 500).json({ error });
      } else if (ret) {
        return res.status(okStatus || 200).json(ret);
      }

      return res.status(okStatus || 200).end();
    })
    .catch(next);
};

// Exports
module.exports = {
  asyncMiddleware,
  asyncEndpoint
};
