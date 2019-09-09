/**
 * @file src/lib/env.js
 *
 * Loads environment variables from file, checks for required environment
 * variables, and sets default environment variables.
 */

// Imports
const path = require('path');
const fs = require('fs');
const loadEnvFile = require('node-env-file');
const log = require('./log');

// In development mode, load environment variables from a local file.
// In production mode, this will be handled by the hosting platform.
if (process.env.NODE_ENV === 'development') {
  const envFile = path.join(process.cwd(), '.env');
  if (fs.existsSync(envFile) === true) {
    log.info('Loading environment variables...');
    loadEnvFile(envFile);
  } else {
    log.warn(`Development mode - Missing '.env' file!`);
  }
}

/**
 * Checks for a required environment variable with the given string key.
 * Throws an exception if no such variable is found.
 *
 * @param {string} key The environment variable's string key.
 * @param {string[]} values An array of required values.
 */
const checkRequiredEnv = (key, values = []) => {
  if (!process.env[key]) {
    throw new Error(
      `A required environment variable, '${key}', was not found.`
    );
  }

  if (Array.isArray(values) && values.length > 0) {
    const matches = values.filter(v => process.env[key] === v);
    if (matches.length === 0) {
      throw new Error(
        `The environment variable, '${key}', has been set to an invalid value.`
      );
    }
  }
};

/**
 * Checks for an environment variable with the given string key.
 * Loads the key with a default value if no such variable is found.
 *
 * @param {string} key The environment variable's string key.
 * @param {string} value A default value to load if the variable is not found.
 */
const loadDefaultEnv = (key, value) => {
  process.env[key] = process.env[key] || value;
};

// Check for required environment variables here.
checkRequiredEnv('NODE_ENV');
checkRequiredEnv('DATABASE_URI');
checkRequiredEnv('EMAIL_TRANSPORT_METHOD', ['oauth2', 'userpass', 'local']);
checkRequiredEnv('JWT_SECRET');

// Load default environment variables here.
loadDefaultEnv('PORT', 3000);
loadDefaultEnv('FORCE_HTTPS', true);
loadDefaultEnv('SITE_URI', `http://localhost:${process.env.PORT}`);
loadDefaultEnv('SITE_TITLE', 'The Website');
loadDefaultEnv('SITE_AUTHOR', 'The Website Author');
loadDefaultEnv('MAX_LOGIN_ATTEMPTS', 3);
