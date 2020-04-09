/**
 * @file src/models/password-token.js
 *
 * Database model for a token allowing a user to change their password.
 */

// Imports
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const csprng = require('csprng');

// Schema
const schema = new mongoose.Schema({
  // The email address of the user requesting the password reset.
  emailAddress: { type: String, required: true, unique: true },

  // Flag to determine if the token has been authenticated and.
  authenticated: { type: Boolean, default: false },
  authSlugHash: { type: String },

  // Flag to determine if the token has been spent.
  spent: { type: Boolean, default: false },

  // Whether authenticated or not, this token will expire after a
  // short time.
  authExpiry: {
    type: Date,
    default: Date.now,
    expires: parseInt(process.env.TOKEN_EXPIRY) || 60 * 15
  }
});

// Methods
schema.methods.generate = function() {
  const slug = csprng();
  const salt = bcryptjs.genSaltSync();
  this.authSlugHash = bcryptjs.hashSync(slug, salt);

  return slug;
};

schema.methods.check = function(slug) {
  return bcryptjs.compareSync(slug, this.authSlugHash);
};

// Exports
module.exports = mongoose.model('password-token', schema);
