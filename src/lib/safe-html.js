/**
 * @file server/lib/safe-html.js
 *
 * Function and configuration for sanitizing HTML input.
 */

// Imports
const safeHtml = require('safe-html');

// Safe HTML Configuration
const safeHtmlConfig = {
  allowedTags: ['b', 'i', 'u', 'a'],
  allowedAttributes: {
    href: {
      allowedTags: ['a'],
      filter: value => {
        const httpRegex =
          process.env.NODE_ENV === 'development' ? /^https?:/i : /^https:/i;

        if (httpRegex.exec(value)) {
          return value;
        }
      }
    }
  }
};

/**
 * Sanitizes the given HTML string according to the specified
 * safe-html configuration.
 *
 * @param {string} html The HTML to be sanitized.
 * @return {string} The sanitized HTML string.
 */
const sanitizeHtml = html => safeHtml(html, safeHtmlConfig);

// Exports
module.exports = {
  sanitizeHtml
};
