/**
 * @file src/lib/date-time.js
 *
 * Functions for getting the current date and time.
 */

// Imports
const moment = require('moment');

/**
 * Gets the current date as a string.
 * @return {string} The current date.
 */
const getCurrentDate = () => moment().format('YYYY-MM-DD');

/**
 * Gets the current time as a string.
 * @return {string} The current time.
 */
const getCurrentTime = () => moment().format('h:mm:ss a');

// Exports
module.exports = { getCurrentDate, getCurrentTime };
