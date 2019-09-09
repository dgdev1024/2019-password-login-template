/**
 * @file src/controllers/user.js
 *
 * Controller functions for our registered user.
 */

// Imports
const passport = require('passport');
const userModel = require('../models/user');
const validate = require('../lib/validate');
const { localLoginStrategy } = require('../lib/auth');
const { getIpAddress } = require('../lib/ip');
const sendEmail = require('../lib/send-email');
const { asyncEndpoint } = require('../lib/async-wrap');
const { raiseError } = require('../lib/error');
const log = require('../lib/log');

// Use the local login strategy.
passport.use('local-login', localLoginStrategy);

/**
 * Creates a new user account. The registering user will need to
 * verify their account by clicking a link inside of an email sent to
 * their specified email address.
 *
 * @param {Request} req
 */
const register = async req => {
  // Get the user's input from the request body.
  const { emailAddress, password, confirm } = req.body;

  // Attempt to validate the user's inputs.
  const validationErrors = [
    validate.emailAddress(emailAddress),
    validate.password(password, confirm)
  ].filter(err => !!err);

  // Why didn't I think of this before? Thanks, Codewars!
  if (validationErrors.length > 0) {
    return raiseError(
      400,
      'There were issues validating your user details.',
      validationErrors
    );
  }

  // Make sure there isn't another user with the given email address.
  const existingUser = await userModel.findOne({ emailAddress });
  if (existingUser) {
    return raiseError(409, 'This email address is taken.', [
      ['emailAddress', 'This email address is taken.']
    ]);
  }

  // Create the new user and save it into the database.
  let user = new userModel();
  const verification = user.generateVerification(getIpAddress(req));
  user.emailAddress = emailAddress;
  user.setPassword(password);
  user = await user.save();

  // Attempt to send the user an email asking them to verify
  // their account.
  try {
    await sendEmail.verifyAccount(emailAddress, {
      slug: verification.slug
    });
  } catch (err) {
    await user.remove();
    throw err;
  }

  // Return a message asking the user to verify their new account.
  return {
    message: 'Check your email for an account verification link!'
  };
};

/**
 * Attempts to verify a newly-created user account.
 *
 * @param {Request} req
 */
const verify = async req => {
  // Get the verification slug from the request query, and the encoded
  // verification nonce from the request body.
  const { email, slug } = req.query;

  // Also, get the verifying user's IP address.
  const ipAddress = getIpAddress(req);

  // Find an un-verified user with the verification slug provided.
  const user = await userModel.findOne({
    emailAddress: email,
    verified: false
  });
  if (!user) {
    return raiseError(404, 'Verification Failed');
  }

  // Check the slug and IP address to complete verification.
  if (!user.checkVerification(slug, ipAddress)) {
    return raiseError(400, 'Verification Failed');
  }

  // The user's new account is now verified.
  user.verified = true;
  user.verificationExpiry = null;
  user.verificationSlugHash = null;
  user.verificationIpHash = null;
  await user.save();

  // Return a message.
  return {
    message: 'Your account has been verified. You may now log in.'
  };
};

/**
 * Attempts to log a user in to their verified account.
 *
 * @param {Request} req
 * @param {Response} res
 */
const login = (req, res) => {
  passport.authenticate('local-login', (err, user, info) => {
    if (err) {
      return res.status(err.status || 500).json({ error: err });
    }

    if (!user) {
      return res.status(info.status || 500).json(info);
    }

    user
      .generateLoginToken()
      .then(token => {
        return res.status(200).json({ token });
      })
      .catch(err => {
        return res.status(err.status || 500).json({ error: err });
      });
  })(req, res);
};

/**
 * Attempts to log an authenticated user out on a single device.
 *
 * @param {Request} req
 */
const logout = async req => {
  const { user, nonce } = req.login;
  user.removeLoginNonce(nonce);
  await user.save();

  return { message: 'You are now logged out.' };
};

/**
 * Attempts to log an authenticated user out on all devices.
 *
 * @param {Request} req
 */
const logoutAll = async req => {
  const { user } = req.login;
  user.removeAllLoginNonces();
  await user.save();

  return { message: 'You are now logged out.' };
};

/**
 * Deletes the account of the authenticated user, thereby logging
 * that user out.
 *
 * @param {Request} req
 */
const remove = async req => {
  const { user } = req.login;
  const { consent } = req.body;

  if (typeof consent !== 'boolean' || consent === false) {
    return raiseError(400, 'Account deletion requires explicit consent.');
  }

  await user.remove();
  return { message: 'Your account has been deleted.' };
};

// Exports
module.exports = {
  register: asyncEndpoint(register),
  verify: asyncEndpoint(verify),
  login,
  logout: asyncEndpoint(logout),
  logoutAll: asyncEndpoint(logoutAll),
  remove: asyncEndpoint(remove)
};
