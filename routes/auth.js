const { randomBytes, timingSafeEqual } = require('node:crypto');
const express = require('express');
const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();
const sessionLifetime = 2 * 60 * 60 * 1000;
const cookieName = 'taskflow.sid';
const cookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true'
};

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username }).select('+passwordHash');
    return done(null, user && await bcrypt.compare(password, user.passwordHash) ? user : false);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (req, id, done) => {
  if (!(req.session.authExpiresAt > Date.now())) return done(null, false);
  try {
    return done(null, await User.findById(id) || false);
  } catch (error) {
    return done(error);
  }
});

function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Please sign in first.' });
}

function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = req.session.csrfToken;
  const submitted = req.get('X-CSRF-Token') || '';
  if (expected && /^[0-9a-f]{64}$/.test(submitted) &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(submitted))) {
    return next();
  }
  return res.status(403).json({ error: 'Invalid form token. Please try again.' });
}

function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'Send an application/json request body.' });
  }
  return next();
}

const json = express.json({ limit: '16kb' });

router.get('/csrf', (req, res) => {
  req.session.csrfToken ??= randomBytes(32).toString('hex');
  return res.json({ csrfToken: req.session.csrfToken });
});

router.post('/register', requireJson, requireCsrf, json, async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = req.body?.password;
  if (!username || username.length > 64) {
    return res.status(400).json({ error: 'Enter a username of 1 to 64 characters.' });
  }
  if (typeof password !== 'string' || password.trim().length < 8 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({
      error: 'Use at least 8 characters after trimming spaces and at most 72 bytes.'
    });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await User.create({ username, passwordHash });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return res.status(409).json({ error: 'That username is already taken.' });
  }
  return res.status(201).json({ message: 'Account created. Please log in.' });
});

router.post('/login', requireJson, requireCsrf, json, (req, res, next) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = req.body?.password;
  const message = 'Invalid username or password.';
  if (!username || username.length > 64 || typeof password !== 'string' ||
      !password || Buffer.byteLength(password) > 72) {
    return res.status(401).json({ error: message });
  }
  req.body.username = username;
  return passport.authenticate('local', (error, user) => {
    if (error) return next(error);
    if (!user) return res.status(401).json({ error: message });
    req.logIn(user, (loginError) => {
      if (loginError) return next(loginError);
      req.session.authExpiresAt = Date.now() + sessionLifetime;
      req.session.csrfToken = randomBytes(32).toString('hex');
      return res.status(200).json({ message: 'Signed in.' });
    });
  })(req, res, next);
});

router.post('/logout', requireLogin, requireCsrf, (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((destroyError) => {
      if (destroyError) return next(destroyError);
      res.clearCookie(cookieName, cookieOptions);
      return res.status(204).end();
    });
  });
});

module.exports = { router, requireLogin, requireCsrf, cookieName, cookieOptions, sessionLifetime };
