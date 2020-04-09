/**
 * @file src/models/user.js
 *
 * The database model for our registered users.
 */

// Imports
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const csprng = require('csprng');
const jwt = require('jsonwebtoken');

// Schema
const schema = new mongoose.Schema({
  // Note: Add more fields here as you need them.

  // The user's email address.
  emailAddress: { type: String, required: true, unique: true },

  // The user's salt-and-hashed password.
  passwordHash: { type: String, required: true },

  // A counter of how many login attempts the user has made. Too many failed
  // attempts will lock the user out for a short time.
  loginAttempts: { type: Number, default: 0 },
  loginAttemptsExpiry: { type: Date, default: Date.now },

  // A container of login nonces. Each nonce represents a device on which
  // the user is logged in to the application.
  loginNonces: [{ type: String }],

  // Some information pertaining to whether the user's newly-created account
  // has been verified and is ready for use.
  verified: { type: Boolean, default: false },
  verificationSlugHash: { type: String },
  verificationIpHash: { type: String },
  verificationExpiry: {
    type: Date,
    default: Date.now,
    expires: parseInt(process.env.UNVERIFIED_USER_EXPIRY) || 60 * 15
  }
});

// Virtuals
schema.virtual('exceededLoginAttempts').get(function() {
  const maxLoginAttempts = process.env.MAX_LOGIN_ATTEMPTS;
  return (
    Date.now() < this.loginAttemptsExpiry &&
    this.loginAttempts >= maxLoginAttempts
  );
});

schema.virtual('loginAttemptsExpired').get(function() {
  return Date.now() >= this.loginAttemptsExpiry;
});

// Methods
schema.methods.generateVerification = function(ip) {
  // Salt-and-hash the IP address.
  const ipSalt = bcryptjs.genSaltSync();
  this.verificationIpHash = bcryptjs.hashSync(ip, ipSalt);

  // Create the verification slug.
  const slug = csprng();

  // Set the salt-and-hashed slug in the document.
  const slugSalt = bcryptjs.genSaltSync();
  this.verificationSlugHash = bcryptjs.hashSync(slug, slugSalt);

  // Return the slug.
  return { slug };
};

schema.methods.checkVerification = function(slug, ip) {
  return (
    bcryptjs.compareSync(slug, this.verificationSlugHash) &&
    bcryptjs.compareSync(ip, this.verificationIpHash)
  );
};

schema.methods.setPassword = function(password) {
  // Create a salt and use it to hash the password.
  const salt = bcryptjs.genSaltSync();
  this.passwordHash = bcryptjs.hashSync(password, salt);
};

schema.methods.checkPassword = function(password) {
  // Make sure a password was set.
  if (this.passwordHash === null) {
    return false;
  }

  // Compare the submitted password to the hashed password stored.
  return bcryptjs.compareSync(password, this.passwordHash);
};

schema.methods.resetLoginAttemptsExpiry = function() {
  this.loginAttemptsExpiry = Date.now() + 1000 * 60 * 5;
};

schema.methods.generateLoginNonce = function() {
  // Generate the nonce, then salt-and-hash it.
  const nonce = csprng();
  const nonceSalt = bcryptjs.genSaltSync();
  const nonceHash = bcryptjs.hashSync(nonce, nonceSalt);

  // Add the login nonce to our active nonces.
  this.loginNonces.push(nonceHash);

  return nonce;
};

schema.methods.getLoginNonceIndex = function(nonce) {
  const index = this.loginNonces.findIndex(hash =>
    bcryptjs.compareSync(nonce, hash)
  );
  return index;
};

schema.methods.removeLoginNonce = function(nonce) {
  const index = this.getLoginNonceIndex(nonce);
  if (index !== -1) {
    this.loginNonces.splice(index, 1);
    return true;
  }

  return false;
};

schema.methods.removeAllLoginNonces = function() {
  this.loginNonces = [];
};

schema.methods.generateLoginToken = async function() {
  let date = new Date();
  date.setDate(date.getDate() + 2);

  const loginNonce = this.generateLoginNonce();
  await this.save();

  return jwt.sign(
    {
      id: this._id.toString(),
      exp: Math.floor(date.getTime() / 1000),
      jti: loginNonce
    },
    process.env.JWT_SECRET
  );
};

// Exports
module.exports = mongoose.model('user', schema);
