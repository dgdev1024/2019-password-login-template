/**
 * @file src/models/email-token.js
 *
 * Database model for our email-change tokens.
 */

// Imports
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const csprng = require('csprng');

// Schema
const schema = new mongoose.Schema({
  // The email address of the user requesting the change, and the new
  // email address that the user wants to change to.
  emailAddress: { type: String, required: true, unique: true },
  newEmailAddress: { type: String, required: true, unique: true },

  // The token's authentication details.
  authenticated: { type: Boolean, default: false },
  authSlugHash: { type: String },

  // Expiry
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

// Export
module.exports = mongoose.model('email-token', schema);
