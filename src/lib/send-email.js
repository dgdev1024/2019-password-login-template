/**
 * @file src/lib/send-email.js
 *
 * Functions for sending email.
 */

// Imports
const nodemailer = require('nodemailer');
const { sanitizeHtml } = require('./safe-html');

// Get the email transport that we are using. Set up our configuration
// as appropriate.
const transportMethod = process.env.EMAIL_TRANSPORT_METHOD;
let transportConfig = null;
switch (transportMethod) {
  case 'oauth2':
    transportConfig = {
      service: process.env.EMAIL_TRANSPORT_SERVICE,
      port: 465,
      secure: true,
      auth: {
        type: 'oauth2',
        user: process.env.EMAIL_TRANSPORT_ADDRESS,
        clientId: process.env.EMAIL_TRANSPORT_CLIENT_ID,
        clientSecret: process.env.EMAIL_TRANSPORT_CLIENT_SECRET,
        refreshToken: process.env.EMAIL_TRANSPORT_REFRESH_TOKEN,
        accessToken: process.env.EMAIL_TRANSPORT_ACCESS_TOKEN
      }
    };
    break;
  case 'userpass':
    transportConfig = {
      service: process.env.EMAIL_TRANSPORT_SERVICE,
      auth: {
        user: process.env.EMAIL_TRANSPORT_ADDRESS,
        pass: process.env.EMAIL_TRANSPORT_PASSWORD
      }
    };
    break;
  case 'local':
    transportConfig = {
      host: process.env.EMAIL_TRANSPORT_DOMAIN,
      port: process.env.EMAIL_TRANSPORT_PORT,
      secure: false
    };
    break;
  default:
    break;
}

// A sender string to send along with our emails.
const senderString = `${process.env.EMAIL_TRANSPORT_NAME} <${process.env.EMAIL_TRANSPORT_ADDRESS}>`;

// Create the email transport.
const emailTransport = nodemailer.createTransport(transportConfig);

/**
 * Creates a function for sending a templated email with specific
 * parameters.
 *
 * @param {object} config An object for configuring the email template.
 * @param {string} config.subject The email subject.
 * @param {string} config.body The email body template.
 * @param {object} config.params Some extra parameters to bundle with the template.
 * @param {'html' | 'text'} config.bodyType The type of email body.
 * @return {function} The email-sending function.
 */
const createEmailFunction = config => {
  // Get the subject, body, and body type from the given config.
  const { subject, body } = config;
  let { bodyType } = config;

  // Make sure the body type was set to either 'html' or 'text'.
  bodyType = bodyType === 'html' || bodyType === 'text' ? bodyType : 'html';

  /**
   * Return an async function to send our templated email.
   *
   * @param {string} email The email address to send to.
   * @param {object} params Our parameters to parse the email template with.
   */
  return async (email, params) => {
    // Make a copy of the email subject and body for parsing.
    let formattedSubject = subject;
    let formattedBody = body;

    // Bundle the user's email address with the template parameters.
    params = { ...params, email };

    // Also include any parameters that were included with the create-email function
    // call.
    if (typeof config.params === 'object' && !Array.isArray(config.params)) {
      params = { ...params, ...config.params };
    }

    // Make sure an object was provided before attempting to parse.
    if (typeof params === 'object' && !Array.isArray(params)) {
      // String variables in this case are enclosed in double curly braces.
      // For example: Replace '{{name}}' with the parameter with the key of
      // 'name', if one was provided.
      //
      // Iterate over the template parameters provided and parse our string
      // as appropriate.
      Object.keys(params).forEach(key => {
        // Make sure a parameter with that key exists, and that parameter
        // is either a string or a number before attempting to parse.
        const paramType = typeof params[key];
        if (paramType === 'string' || paramType === 'number') {
          // Create a regular expression matching the key.
          const regex = new RegExp('{{' + key + '}}', 'gi');

          // Use the regular expression above to parse our subject and body.
          formattedSubject = formattedSubject.replace(regex, params[key]);
          formattedBody = formattedBody.replace(regex, params[key]);
        }
      });
    }

    // Using the email transport we created above, attempt to send the
    // formatted email.
    await emailTransport.sendMail({
      from: senderString,
      to:
        typeof params['name'] === 'string' && params['name'] !== ''
          ? `${params['name']} <${email}>`
          : email,
      subject: sanitizeHtml(formattedSubject),
      [bodyType]: sanitizeHtml(formattedBody)
    });
  };
};

// Exports
module.exports = {
  verifyAccount: createEmailFunction({
    params: {
      siteTitle: process.env.SITE_TITLE,
      verifyEndpoint: `${process.env.SITE_URI}/api/user/verify`
    },
    subject: '{{siteTitle}} - Verify New Account',
    body: `
      <div>
        <h1>{{siteTitle}}</h1>
        <p>
          Hello, {{name}}!<br /><br />
          Click on the following link to verify your new account:<br /><br />
          <a href="{{verifyEndpoint}}?email={{email}}&slug={{slug}}">
            {{verifyEndpoint}}?email={{email}}&slug={{slug}}
          </a>
        </p>
      </div>
    `
  })
};
