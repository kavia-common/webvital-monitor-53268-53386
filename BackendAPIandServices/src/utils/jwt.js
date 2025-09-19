const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!JWT_SECRET || !REFRESH_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('JWT secrets are not set. Please configure JWT_SECRET and REFRESH_TOKEN_SECRET in .env');
}

// PUBLIC_INTERFACE
function signAccessToken(payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') {
  /** Sign and return a JWT access token. */
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// PUBLIC_INTERFACE
function signRefreshToken(payload, expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d') {
  /** Sign and return a JWT refresh token. */
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn });
}

// PUBLIC_INTERFACE
function verifyAccessToken(token) {
  /** Verify an access token and return decoded payload. */
  return jwt.verify(token, JWT_SECRET);
}

// PUBLIC_INTERFACE
function verifyRefreshToken(token) {
  /** Verify a refresh token and return decoded payload. */
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
