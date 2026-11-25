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
const usernameError = 'Enter a username of 1 to 64 characters.';
const passwordError = 'Use at least 8 characters after trimming spaces and at most 72 bytes.';

function readUsername(body) {
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  return username.length <= 64 ? username : '';
}

function isValidNewPassword(password) {
  return typeof password === 'string' && password.trim().length >= 8 && Buffer.byteLength(password) <= 72;
}

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
    const user = await User.findById(id);
    if (!user || (user.authVersion ?? 0) !== (req.session.authVersion ?? 0)) return done(null, false);
    return done(null, user);
  } catch (error) {
    return done(error);
  }
});

function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Please sign in first.' });
}

function checkApiWrite(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const site = req.get('Sec-Fetch-Site');
  if (site && site !== 'same-origin') {
    return res.status(403).json({ error: 'Use TaskFlow from the same origin.' });
  }
  // JSON writes and DELETE require a browser preflight across origins. This API serves no CORS grants.
  if (req.method !== 'DELETE' && !req.is('application/json')) {
    return res.status(415).json({ error: 'Send an application/json request body.' });
  }
  return next();
}

const json = express.json({ limit: '16kb' });

router.post('/register', checkApiWrite, json, async (req, res) => {
  const username = readUsername(req.body);
  const password = req.body?.password;
  if (!username) return res.status(400).json({ error: usernameError });
  if (!isValidNewPassword(password)) return res.status(400).json({ error: passwordError });
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await User.create({ username, passwordHash });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return res.status(409).json({ error: 'That username is already taken.' });
  }
  return res.status(201).json({ message: 'Account created. Please log in.' });
});

router.post('/reset-password', checkApiWrite, json, async (req, res) => {
  const username = readUsername(req.body);
  const password = req.body?.password;
  if (!username) return res.status(400).json({ error: usernameError });
  if (!isValidNewPassword(password)) return res.status(400).json({ error: passwordError });
  if (password !== req.body.confirmPassword) {
    return res.status(400).json({ error: 'The new passwords do not match.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { matchedCount } = await User.updateOne({ username }, {
    $set: { passwordHash },
    $inc: { authVersion: 1 }
  });
  if (!matchedCount) return res.status(404).json({ error: 'Username not found.' });
  return res.status(200).json({ message: 'Password reset. Please log in with your new password.' });
});

router.post('/login', checkApiWrite, json, (req, res, next) => {
  const username = readUsername(req.body);
  const password = req.body?.password;
  const message = 'Invalid username or password.';
  if (!username || typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
    return res.status(401).json({ error: message });
  }
  req.body.username = username;
  return passport.authenticate('local', (error, user) => {
    if (error) return next(error);
    if (!user) return res.status(401).json({ error: message });
    req.logIn(user, (loginError) => {
      if (loginError) return next(loginError);
      req.session.authExpiresAt = Date.now() + sessionLifetime;
      req.session.authVersion = user.authVersion ?? 0;
      return res.status(200).json({ message: 'Signed in.' });
    });
  })(req, res, next);
});

router.post('/logout', requireLogin, checkApiWrite, json, (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((destroyError) => {
      if (destroyError) return next(destroyError);
      res.clearCookie(cookieName, cookieOptions);
      return res.status(204).end();
    });
  });
});

module.exports = { router, requireLogin, checkApiWrite, cookieName, cookieOptions, sessionLifetime };
