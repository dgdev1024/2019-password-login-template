/**
 * @file src/lib/server.js
 *
 * Function for running the backend server.
 */

// Imports
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const passport = require('passport');
const forceHttps = require('./force-https');
const { handleRouteError } = require('./error');
const log = require('./log');

/**
 * Starts the server and listens for requests.
 */
const start = () => {
  // Express and Middleware
  const app = express();
  app.use(forceHttps);
  app.use(cors());
  app.use(helmet());
  app.use(compression());
  app.use(passport.initialize());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // API Routing
  app.use('/api/user', require('../routes/user'));

  // Handle Route Errors
  app.use(handleRouteError);

  // Listen for Requests
  const port = process.env.PORT;
  app.listen(port, err => {
    if (err) {
      throw err;
    }
    log.info(`Listening for requests on port #${port}...`);
  });
};

// Exports
module.exports = { start };
