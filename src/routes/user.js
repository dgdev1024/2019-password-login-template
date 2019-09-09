/**
 * @file src/routes/user.js
 *
 * API routing for our registered user functions.
 */

// Imports
const express = require('express');
const user = require('../controllers/user');
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

// Exports
module.exports = router;
