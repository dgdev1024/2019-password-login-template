/**
 * @file src/routes/user.js
 *
 * API routing for our registered user functions.
 */

// Imports
const express = require('express');
const user = require('../controllers/user');
const passToken = require('../controllers/password-token');
const emailToken = require('../controllers/email-token');
const auth = require('../lib/auth');

// Express Router
const router = express.Router();

// Routes
router.post('/register', user.register);
router.get('/verify', user.verify);
router.post('/login', user.login);
router.get('/logout', auth.requireLoginToken, user.logout);
router.get('/logout-all', auth.requireLoginToken, user.logoutAll);
router.delete('/delete', auth.requireLoginToken, user.remove);

router.post('/request-change-password', passToken.request);
router.get('/verify-change-password', passToken.authenticate);
router.post('/change-password', passToken.changePassword);

router.post(
  '/request-change-email',
  auth.requireLoginToken,
  emailToken.request
);
router.get(
  '/verify-change-email',
  auth.requireLoginToken,
  emailToken.authenticate
);

// Exports
module.exports = router;
