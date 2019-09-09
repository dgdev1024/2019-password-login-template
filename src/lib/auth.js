/**
 * @file src/lib/auth.js
 *
 * Functions and login strategies for handling user authentication.
 */

// Imports
const passportLocal = require('passport-local');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user');
const { asyncMiddleware, asyncPassportLocal } = require('./async-wrap');
const { raiseError } = require('./error');

// Login strategy for logging in via username and password.
const localLoginStrategy = new passportLocal.Strategy(
  {
    usernameField: 'emailAddress',
    session: false
  },
  asyncPassportLocal(async (emailAddress, password) => {
    // Resolve the email address given to a verified user in the
    // database.
    const user = await userModel.findOne({
      emailAddress,
      verified: true
    });
    if (!user) {
      return raiseError(401, 'The username or password given is incorrect.');
    }

    // Has this user recently exceeded the maximum number of login attempts?
    if (user.exceededLoginAttempts) {
      return raiseError(401, 'Too many incorrect logins. Try again later.');
    } else if (user.loginAttemptsExpired) {
      user.loginAttempts = 0;
    }

    // Attempt to check the user's password.
    if (user.checkPassword(password)) {
      return { user };
    } else {
      user.loginAttempts++;
      user.resetLoginAttemptsExpiry();
      await user.save();

      return raiseError(401, 'The username or password given is incorrect.');
    }
  })
);

/**
 * Middleware function for checking to see if a user is logged in before
 * performing an action that requires user authentication.
 *
 * @param {Request} req
 */
const checkLoginToken = async req => {
  // Get the bearer header from the request.
  const bearerHeader = req.headers['authorization'];

  // If the header is not present, then the end-user is not logged in.
  if (typeof bearerHeader === 'undefined') {
    return raiseError(401, 'You are not logged in.');
  }

  // Split the retrieved header at the space and look for the second
  // element. Make sure that it is present!
  const rawToken = bearerHeader.split(' ')[1];
  if (typeof rawToken === 'undefined') {
    return raiseError(401, 'You are not logged in.');
  }

  // Verify the token and get a payload.
  let payload = null;
  try {
    payload = jwt.verify(rawToken, process.env.JWT_SECRET);

    // Make sure our payload contains a valid user ID, expiry claim, and
    // JWT ID nonce.
    if (!payload.id || !payload.exp || !payload.jti) {
      return raiseError(401, 'You are not logged in.');
    }
  } catch (err) {
    if (err.name && err.name === 'TokenExpiredError') {
      const user = await userModel.findById(payload.id);
      if (user) {
        user.removeLoginNonce(payload.jti);
        await user.save();
        return raiseError(401, 'Your login has expired. Please log in again.');
      }
    } else if (err.name && err.name === 'JsonWebTokenError') {
      return raiseError(401, 'You are not logged in.');
    }

    throw err;
  }

  // Attempt to authenticate the login by resolving the ID found in the
  // JWT payload to a user in the database.
  const user = await userModel.findById(payload.id);
  if (!user || user.verified === false) {
    return raiseError(401, 'You are not logged in.');
  }

  if (user.getLoginNonceIndex(payload.jti) === -1) {
    return raiseError(401, 'You are not logged in.');
  }

  // Authentication successful. Send the user, ID, and JWT nonce along to the
  // next middleware function.
  req.login = {
    id: user._id.toString(),
    nonce: payload.jti,
    user
  };
};

// Exports
module.exports = {
  localLoginStrategy,
  checkLoginToken: asyncMiddleware(checkLoginToken),
  requireLoginToken: asyncMiddleware(checkLoginToken, { nextOnError: false })
};
