/**
 * @file src/controllers/email-token.js
 *
 * Controller functions for our email change tokens.
 */

// Imports
const userModel = require('../models/user');
const passTokenModel = require('../models/password-token');
const emailTokenModel = require('../models/email-token');
const { asyncEndpoint } = require('../lib/async-wrap');
const sendEmail = require('../lib/send-email');
const { raiseError } = require('../lib/error');
const validate = require('../lib/validate');

/**
 * Requests a change in the account's associated email address.
 *
 * @param {Request} req
 */
const request = async req => {
  // Get the currently-logged in user.
  const { user } = req.login;

  // Get and validate the submitted email address.
  const { newEmailAddress } = req.body;
  const validationErrors = [validate.emailAddress(newEmailAddress)].filter(
    v => !!v
  );
  if (validationErrors.length > 0) {
    return raiseError(
      400,
      'There were issues validating your input.',
      validationErrors
    );
  }

  // Make sure another user is not already using the email address
  // that we want to change to.
  const existingUser = await userModel.findOne({
    emailAddress: newEmailAddress
  });
  if (existingUser) {
    return raiseError(409, 'This email address is taken.', [
      ['emailAddress', 'This email address is taken.']
    ]);
  }

  // Make sure another user isn't trying to change their email address
  // to the one given.
  const existingToken = await emailTokenModel.findOne({
    newEmailAddress
  });
  if (existingToken) {
    return raiseError(
      409,
      'This email address is temporarly unavailable. Try again later.',
      [
        [
          'emailAddress',
          'This email address is temporarly unavailable. Try again later.'
        ]
      ]
    );
  }

  // Create and save the email token.
  let newToken = new emailTokenModel();
  const slug = newToken.generate();
  newToken.emailAddress = user.emailAddress;
  newToken.newEmailAddress = newEmailAddress;
  newToken = await newToken.save();

  // Send an email to the old address letting them know the email change was
  // requested. Send another email to the new address letting them know to
  // verify the email change.
  try {
    await sendEmail.emailChangeRequested(newToken.emailAddress);
    await sendEmail.verifyEmailChange(newToken.newEmailAddress, {
      slug
    });
  } catch (err) {
    console.log(err);
    await newToken.remove();
    throw err;
  }

  return {
    message: 'Check your new email inbox for the verification link.'
  };
};

/**
 * Authenticates a requested email change token.
 *
 * @param {Request} req
 */
const authenticate = async req => {
  // Get the currently logged-in user.
  const { user } = req.login;

  // Get the authentication slug.
  const { slug } = req.query;

  // Make sure there is an unauthenticated email token with the user's
  // email address on it.
  const token = await emailTokenModel.findOne({
    emailAddress: user.emailAddress,
    authenticated: false
  });
  if (!token) {
    return raiseError(404, 'Email Change Unsuccessful.');
  }

  // Make sure the slug submitted matches up with the token's slug hash.
  if (!token.check(slug)) {
    return raiseError(400, 'Email Change Unsuccessful.');
  }

  // Token is authenticated.
  token.authenticated = true;
  await token.save();

  // Change the user's email address.
  user.emailAddress = token.newEmailAddress;
  await user.save();

  return {
    message: "Your account's email address was changed successfully."
  };
};

// Exports
module.exports = {
  request: asyncEndpoint(request),
  authenticate: asyncEndpoint(authenticate)
};
