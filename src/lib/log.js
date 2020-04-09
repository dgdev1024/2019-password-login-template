/**
 * @file src/lib/log.js
 *
 * Exposes functions for logging information.
 */

// Imports
const path = require('path');
const fs = require('fs');
const clc = require('cli-color');
const dt = require('./date-time');

// Create the 'logs' folder if it doesn't already exist.
const logFolder = path.join(process.cwd(), 'logs');
if (fs.existsSync(logFolder) === false) {
  fs.mkdirSync(logFolder);
}

// Open today's log file. Create it if it doesn't already exist.
const logFile = path.join(logFolder, `${dt.getCurrentDate()}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

/**
 * Creates a new logging function with the given label and stream.
 * @param {'stdout' | 'stderr'} stream The console logging stream to be used.
 * @param {string} label The label, under which the function will log information.
 * @param {clc.Format} format The command-line-color format to be used.
 * @return {function} The logging function.
 */
const createLogFunction = (stream, label, format) => str =>
  new Promise(resolve => {
    const out = `[${dt.getCurrentTime()}][${label}] ${str}`;

    logStream.write(`${out}\n`, () => {
      process[stream].write(`${format(out)}\n`, () => {
        resolve();
      });
    });
  });

// Exports
module.exports = {
  info: createLogFunction('stdout', 'Info', clc.white),
  warn: createLogFunction('stderr', 'Warning', clc.yellow),
  error: createLogFunction('stderr', 'Error', clc.redBright),
  fatal: createLogFunction('stderr', 'FATAL', clc.red.bold)
};
