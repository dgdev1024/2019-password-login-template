/**
 * @file src/controllers/password-token.js
 *
 * Controller functions for our password reset tokens.
 */

// Imports
const userModel = require('../models/user');
const passTokenModel = require('../models/password-token');
const { asyncEndpoint } = require('../lib/async-wrap');
const sendEmail = require('../lib/send-email');
const { raiseError } = require('../lib/error');
const validate = require('../lib/validate');

/**
 * Requests a new password reset token.
 *
 * @param {Request} req
 */
const request = async req => {
  // Get and validate the user's input.
  const { emailAddress } = req.body;
  const validationErrors = [validate.emailAddress(emailAddress)].filter(
    err => !!err
  );
  if (validationErrors.length > 0) {
    return raiseError(
      400,
      'There were issues validating your input.',
      validationErrors
    );
  }

  // Make sure the email address provided resolves to a valid, verified user.
  const user = await userModel.findOne({ emailAddress, verified: true });
  if (!user) {
    return raiseError(404, 'No user exists with this email address.');
  }

  // Make sure that a password token has not already been issued.
  let token = await passTokenModel.findOne({ emailAddress });
  if (token) {
    return raiseError(409, 'A password token has recently been issued.');
  }

  // Create a new password reset token.
  token = new passTokenModel();
  const slug = token.generate();
  token.emailAddress = emailAddress;
  token = await token.save();

  // TODO: Send the user an email letting them know to verify the token.
  try {
    await sendEmail.verifyChangePassword(emailAddress, { slug });
  } catch (err) {
    await token.remove();
    throw err;
  }

  return {
    message: 'Check your email for the password change verification link.'
  };
};

/**
 * Authenticates a requested password reset token.
 *
 * @param {Request} req
 */
const authenticate = async req => {
  // Get the email and slug from the request query.
  const { emailAddress, slug } = req.query;

  // Make sure the email provided resolves to a user account.
  const user = await userModel.findOne({ emailAddress, verified: true });
  if (!user) {
    return raiseError(404, 'Authentication unsuccessful.');
  }

  // Next, make sure the email resolves to an unauthenticated password token.
  const token = await passTokenModel.findOne({
    emailAddress,
    authenticated: false,
    spent: false
  });
  if (!token) {
    return raiseError(404, 'Authentication unsuccessful.');
  }

  // Check to see if the slug submitted matches up to the slug hash in the
  // token.
  if (!token.check(slug)) {
    return raiseError(401, 'Authentication unsuccessful.');
  }

  // The token is now authenticated. Update as proper.
  token.authenticated = true;
  token.authSlugHash = null;
  await token.save();

  return {
    message: 'Your password change request has been authenticated.'
  };
};

/**
 * Uses an authenticated password token to change the user's
 * password.
 *
 * @param {Request} req
 */
const changePassword = async req => {
  // Get the email address, password, and confirmed password.
  const { emailAddress } = req.query;
  const { password, confirm } = req.body;

  // Validate the user's new password.
  const validationErrors = [validate.password(password, confirm)].filter(
    v => !!v
  );
  if (validationErrors.length > 0) {
    return raiseError(
      400,
      'There were issues validating your password',
      validationErrors
    );
  }

  // Make sure the email provided resolves to a user account.
  const user = await userModel.findOne({ emailAddress, verified: true });
  if (!user) {
    return raiseError(404, 'Password change unsuccessful.');
  }

  // Next, make sure the email resolves to an authenticated password token.
  const token = await passTokenModel.findOne({
    emailAddress,
    authenticated: true,
    spent: false
  });
  if (!token) {
    return raiseError(404, 'Password change unsuccessful.');
  }

  // Mark the token as spent.
  token.spent = true;
  await token.save();

  // Update the user's password.
  user.setPassword(password);
  await user.save();

  return {
    message: 'Your password was changed successfully.'
  };
};

// Exports
module.exports = {
  request: asyncEndpoint(request),
  authenticate: asyncEndpoint(authenticate),
  changePassword: asyncEndpoint(changePassword)
};
