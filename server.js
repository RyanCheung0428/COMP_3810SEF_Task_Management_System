// Start the Express server and handle login, sessions, and shared request checks.
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('./models/User');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');

const cookieName = 'taskflow.sid';
// Browser JavaScript cannot read this cookie. Enable Secure when the site uses HTTPS.
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true'
};
// The sv-SE locale formats the day as YYYY-MM-DD, which sorts by calendar date.
const hongKongDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Hong_Kong' });

// Identify API URLs so the server can choose the correct response format.
function isApi(req) {
  return /^\/api(?:[/?]|$)/i.test(req.originalUrl);
}

// API clients receive JSON errors, and browser pages use the EJS error template.
function showError(req, res, status, message) {
  if (isApi(req)) {
    return res.status(status).json({ error: message });
  }
  return res.status(status).render('error', { status, message });
}

// Stop requests without a signed-in session before they reach task routes.
function requireLogin(req, res, next) {
  if (req.session.userId) return next();
  if (isApi(req)) return showError(req, res, 401, 'Please sign in first.');
  return res.redirect('/login');
}

// For write requests, check that the form or API token belongs to this session.
function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const token = isApi(req) ? req.get('X-CSRF-Token') : req.body?._csrf;
  if (req.session.csrfToken && token === req.session.csrfToken) return next();
  return showError(req, res, 403, 'Invalid form token. Reload the page and try again.');
}

// Display the stored due date as YYYY-MM-DD without shifting the calendar day.
function displayDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

// A task is overdue when it is incomplete and its due date is before today in Hong Kong.
function isOverdue(task) {
  const due = displayDate(task.dueDate);
  return Boolean(due && task.status !== 'Completed' && due < hongKongDate.format(new Date()));
}

// Validate the environment settings before connecting to MongoDB and opening the web port.
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

  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.locals.displayDate = displayDate;
  app.locals.isOverdue = isOverdue;

  // Parse the URL-encoded fields sent by the HTML forms.
  const form = express.urlencoded({ extended: false, limit: '16kb' });
  app.use(express.static(path.join(__dirname, 'public')));
  // Tell browsers not to cache dynamic pages containing private task or session data.
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.locals.signedIn = false;
    res.locals.csrfToken = '';
    next();
  });
  // The browser stores a signed session ID. The session data lives in MongoDB.
  app.use(session({
    name: cookieName,
    secret: process.env.SESSION_SECRET,
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      dbName: mongoose.connection.name
    }),
    resave: false,
    saveUninitialized: false,
    cookie: { ...cookieOptions, maxAge: 2 * 60 * 60 * 1000 }
  }));
  // Make the login state and form token available to all EJS templates.
  app.use((req, res, next) => {
    res.locals.signedIn = Boolean(req.session.userId);
    res.locals.csrfToken = req.session.csrfToken || '';
    next();
  });

  // Send visitors to the right page based on whether they are already signed in.
  app.get('/', (req, res) => res.redirect(req.session.userId ? '/tasks' : '/login'));

  // Prepare a token for the login form in the visitor's session.
  app.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/tasks');
    if (!req.session.csrfToken) req.session.csrfToken = randomBytes(32).toString('hex');
    res.locals.csrfToken = req.session.csrfToken;
    res.render('login', { username: '', error: '' });
  });

  // Look up the username and check the submitted password against its stored hash.
  app.post('/login', form, requireCsrf, async (req, res, next) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = req.body?.password;
    let user;
    if (username && username.length <= 64 && typeof password === 'string' &&
        password && Buffer.byteLength(password) <= 72) {
      user = await User.findOne({ username }).select('+passwordHash');
    }
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).render('login', { username, error: 'Invalid username or password.' });
    }

    // Replace the guest session and save the user ID before redirecting to the task list.
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = user._id.toString();
      req.session.csrfToken = randomBytes(32).toString('hex');
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.redirect(303, '/tasks');
      });
    });
  });

  // Delete the session from MongoDB and clear its cookie in the browser.
  app.post('/logout', requireLogin, form, requireCsrf, (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie(cookieName, cookieOptions);
      res.redirect(303, '/login');
    });
  });

  // Check login before routing. Browser forms use URL-encoded data and the API uses JSON.
  app.use('/tasks', requireLogin, form, requireCsrf, taskRoutes);
  app.use('/dashboard', requireLogin, dashboardRoutes);
  app.use('/api/tasks', requireLogin, express.json({ limit: '16kb' }), requireCsrf, apiRoutes);

  // These handlers run after the routes for unmatched URLs and failed requests.
  app.use((req, res) => showError(req, res, 404, 'Page not found.'));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.status >= 400 && error.status < 500) {
      return showError(req, res, 400, 'Invalid request data.');
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
