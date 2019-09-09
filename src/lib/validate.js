/**
 * @file src/lib/validate.js
 *
 * Functions for validating user input.
 */

// Regular expressions for use with our validation functions.
const regex = {
  symbols: /[$-/:-?{-~!"^_`\[\]!@]/,
  letters: /[a-zA-Z]/,
  capitals: /[A-Z]/,
  numbers: /[0-9]/,
  emails: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
};

// A collection of character limits.
const limits = {
  name: { min: 1, max: 60 },
  password: { min: 8, max: 32 }
};

const createNameValidator = (field, which) => name => {
  if (typeof name !== 'string' || name.length === 0) {
    return [field, `Please enter your ${which}.`];
  }

  if (name.length < limits.name.min || name.length > limits.name.max) {
    return [
      field,
      `Your ${which} must contain between ${limits.name.min} and ${
        limits.name.max
      } characters.`
    ];
  }

  if (regex.numbers.test(name) || regex.symbols.test(name)) {
    return [field, `Your ${which} cannot contain numbers of symbols.`];
  }

  return null;
};

const emailAddress = email => {
  if (typeof email !== 'string' || email.length === 0) {
    return ['emailAddress', 'Please enter your email address'];
  }

  if (regex.emails.test(email) === false) {
    return [
      'emailAddress',
      'Your email address must be in the form "name@domain.tld".'
    ];
  }

  return null;
};

const password = (password, confirm) => {
  if (typeof password !== 'string' || password.length === 0) {
    return ['password', 'Please enter your password.'];
  }

  if (
    password.length < limits.password.min ||
    password.length > limits.password.max
  ) {
    return [
      'password',
      `Your password must contain between ${limits.password.min} and ${
        limits.password.max
      } characters.`
    ];
  }

  if (
    regex.letters.test(password) === false ||
    regex.capitals.test(password) === false ||
    regex.numbers.test(password) === false ||
    regex.symbols.test(password) === false
  ) {
    return [
      'password',
      'Your password must contain at least one lowercase letter, one uppercase letter, one number, and one symbol.'
    ];
  }

  if (typeof confirm !== 'string' || confirm.length === 0) {
    return ['password', 'Please confirm your password.'];
  }

  if (password !== confirm) {
    return ['password', 'The passwords do not match.'];
  }

  return null;
};

// Exports
module.exports = {
  regex,
  firstName: createNameValidator('firstName', 'first name'),
  lastName: createNameValidator('lastName', 'last name'),
  emailAddress,
  password
};
