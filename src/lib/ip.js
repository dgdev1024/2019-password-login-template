/**
 * @file src/lib/ip.js
 *
 * Function for getting the IP address of a client request.
 */

/**
 * Gets a client's IP address from the request header.
 *
 * @param {Request} req
 * @return {string} The client's IP address.
 */
const getIpAddress = req => {
  // Check for the 'X-Forwarded-For' request header.
  const forwardedFor = req.headers['x-forwarded-for'];

  // Get the client IP from the header if it is present.
  if (forwardedFor) {
    const splitHeader = forwardedFor.split(',');
    return splitHeader[0];
  } else {
    // Otherwise, return the remote address.
    return req.connection.remoteAddress;
  }
};

// Exports
module.exports = {
  getIpAddress
};
