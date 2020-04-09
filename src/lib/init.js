/**
 * @file src/lib/init.js
 *
 * Performs application initialization.
 */

// Imports
const mongoose = require('mongoose');
const server = require('./server');
const log = require('./log');

log.info(`Running in ${process.env.NODE_ENV} mode...`);

// Treat all unhandled promise rejections as fatal errors.
process.on('unhandledRejection', err => {
  log
    .fatal(`Unhandled Promise Rejection: ${err.stack || err}`)
    .then(() => process.exit(1));
});

// Perform application initialization.
(async () => {
  // Load environment variables.
  require('./env');

  // Connect to database.
  log.info('Connecting to database...');
  await mongoose.connect(process.env.DATABASE_URI, {
    useNewUrlParser: true,
    useCreateIndex: true
  });

  // Start the server.
  server.start();
})().catch(err => {
  log.fatal(err.stack || err).then(() => process.exit(1));
});
