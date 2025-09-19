const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../utils/prisma');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

// PUBLIC_INTERFACE
async function register(req, res) {
  /** Register via email/password */
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password required' });
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: 'email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });
  await prisma.alertPreference.create({ data: { userId: user.id } });

  const access = signAccessToken({ sub: user.id, email: user.email });
  const refresh = signRefreshToken({ sub: user.id });
  await saveRefreshToken(user.id, refresh);

  return res.status(201).json({ accessToken: access, refreshToken: refresh, user: publicUser(user) });
}

// PUBLIC_INTERFACE
async function login(req, res) {
  /** Login with email/password */
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const access = signAccessToken({ sub: user.id, email: user.email });
  const refresh = signRefreshToken({ sub: user.id });
  await saveRefreshToken(user.id, refresh);

  return res.json({ accessToken: access, refreshToken: refresh, user: publicUser(user) });
}

// PUBLIC_INTERFACE
async function googleAuth(req, res) {
  /** Google OAuth token exchange (id_token) */
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: 'idToken required' });

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const email = payload.email;
  const googleId = payload.sub;

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        googleId,
        name: payload.name || null,
      },
    });
    await prisma.alertPreference.create({ data: { userId: user.id } });
  } else if (!user.googleId) {
    await prisma.user.update({ where: { id: user.id }, data: { googleId } });
  }

  const access = signAccessToken({ sub: user.id, email: user.email });
  const refresh = signRefreshToken({ sub: user.id });
  await saveRefreshToken(user.id, refresh);

  return res.json({ accessToken: access, refreshToken: refresh, user: publicUser(user) });
}

// PUBLIC_INTERFACE
async function refresh(req, res) {
  /** Refresh an access token given refresh token */
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

  const decoded = verifyRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.userId !== decoded.sub) return res.status(401).json({ message: 'Invalid refresh token' });

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  const access = signAccessToken({ sub: user.id, email: user.email });
  return res.json({ accessToken: access });
}

// PUBLIC_INTERFACE
async function me(req, res) {
  /** Return current user profile */
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  return res.json({ user: publicUser(user) });
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, subscriptionTier: u.subscriptionTier };
}

async function saveRefreshToken(userId, token) {
  const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token, userId, expiresAt: exp } });
}

module.exports = { register, login, googleAuth, refresh, me };
