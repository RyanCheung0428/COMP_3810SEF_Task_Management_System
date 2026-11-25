// Start Express and mount the page and REST routes.
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const passport = require('passport');
const mongoose = require('mongoose');
const User = require('./models/User');
const auth = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const apiRoutes = require('./routes/api');

function showError(req, res, status, message) {
  if (/^\/api(?:[/?]|$)/i.test(req.originalUrl)) {
    return res.status(status).json({ error: message });
  }
  return res.status(status).render('error', { status, message });
}

async function start() {
  if (!process.env.MONGODB_URI) throw new Error('Set the Atlas connection string in MONGODB_URI.');
  if (!/^[a-f0-9]{64}$/i.test(process.env.SESSION_SECRET || '')) {
    throw new Error('Set SESSION_SECRET to 64 random hexadecimal characters.');
  }
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Set PORT to a number between 1 and 65535.');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  } catch {
    throw new Error('Could not connect to MongoDB Atlas. Check MONGODB_URI, the database user, and the Atlas IP access list.');
  }
  try {
    await User.init();
  } catch {
    throw new Error('Could not initialize the unique username index.');
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.use(session({
    name: auth.cookieName,
    secret: process.env.SESSION_SECRET,
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      dbName: mongoose.connection.name
    }),
    resave: false,
    saveUninitialized: false,
    cookie: { ...auth.cookieOptions, maxAge: auth.sessionLifetime }
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  const requirePageLogin = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    return res.redirect('/login');
  };
  const guestPage = (view) => (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/tasks');
    return res.render(view);
  };

  app.get('/', (req, res) => res.redirect(req.isAuthenticated() ? '/tasks' : '/login'));
  app.get('/login', guestPage('login'));
  app.get('/register', guestPage('register'));
  app.get('/forgot-password', guestPage('forgot-password'));
  app.get('/dashboard', requirePageLogin, (req, res) => res.redirect('/tasks'));
  app.use('/tasks', requirePageLogin, taskRoutes);
  app.use('/api/auth', auth.router);
  app.use('/api/tasks', auth.requireLogin, auth.checkApiWrite, express.json({ limit: '16kb' }), apiRoutes);

  // These handlers run after the routes for unmatched URLs and failed requests.
  app.use((req, res) => showError(req, res, 404, 'Page not found.'));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.status >= 400 && error.status < 500) {
      return showError(req, res, error.status, 'Invalid request data.');
    }
    // Keep database URLs, credentials and request bodies out of logs.
    console.error('Request failed:', error.name);
    return showError(req, res, 500, 'Something went wrong. Please try again.');
  });

  // Accept requests after setup is complete. Close the database connection if the port fails.
  const server = app.listen(port, '0.0.0.0', () => console.log(`TaskFlow is listening on port ${port}.`));
  server.on('error', async () => {
    console.error('Could not start the web server. Check PORT.');
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}

// Exit with a failure status if startup cannot finish.
start().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
