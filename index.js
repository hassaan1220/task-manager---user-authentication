// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Required packages
import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql2';
import session from 'express-session';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App setup
const app = express();
const PORT = process.env.PORT || 3000;

// MySQL database connection setup
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');

// Helper middleware
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Serialize/Deserialize User
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

/* ----------------- GOOGLE STRATEGY ----------------- */
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
  const email = profile.emails[0].value;
  const name = profile.displayName;

  const sql = 'SELECT * FROM users WHERE email = ?';
  connection.query(sql, [email], (err, results) => {
    if (err) return done(err);
    if (results.length > 0) {
      return done(null, results[0]);
    } else {
      const insertSql = 'INSERT INTO users (name, email) VALUES (?, ?)';
      connection.query(insertSql, [name, email], (err, result) => {
        if (err) return done(err);
        const newUser = { id: result.insertId, name, email };
        return done(null, newUser);
      });
    }
  });
}));

/* ----------------- ROUTES ----------------- */

// Google Auth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/login',
  successRedirect: '/dashboard'
}));

// Signup route
app.get('/', (req, res) => res.render('signup'));

// Login route
app.get('/login', (req, res) => res.render('login'));

// Dashboard (Fetch tasks from DB)
app.get('/dashboard', isAuthenticated, (req, res) => {
  const userId = req.user.id;
  const sql = 'SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC';

  connection.query(sql, [userId], (err, tasks) => {
    if (err) return res.send('Error fetching tasks.');

    // Convert created_at to Date object if exists
    tasks = tasks.map(t => ({
      ...t,
      created_at: t.created_at ? new Date(t.created_at) : null
    }));

    res.render('dashboard', { user: req.user, tasks });
  });
});

// Logout Route
app.get('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy();
    res.redirect('/login');
  });
});

// Edit task Route
app.get('/edit/:id', (req, res) => {
  const taskId = req.params.id;

  const sql = 'SELECT * FROM tasks WHERE id = ?';
  connection.query(sql, [taskId], (err, results) => {
    if (err || results.length === 0) {
      return res.send('Task not found.');
    }
    const task = results[0];
    res.render('edit-task.ejs', { task });
  });
});

// Deleter task Route
app.get('/delete/:id', (req, res) => {
  const taskId = req.params.id;

  const sql = 'DELETE FROM `tasks` WHERE id = ?';
  connection.query(sql, [taskId], (err) => {
    if (err) {
      return res.send('Something went wrong while deleting the task.');
    }
    res.redirect('/dashboard');
  });
});

// Signup Route
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';

  connection.query(sql, [name, email, hashedPassword], (err) => {
    if (err) return res.send('Something went wrong during signup.');
    res.redirect('/login');
  });
});

// Login Route
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ?';

  connection.query(sql, [email], async (err, results) => {
    if (err || results.length === 0) return res.send('User not found or error occurred.');

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      req.login(user, err => {
        if (err) return res.send('Login error');
        res.redirect('/dashboard');
      });
    } else {
      res.send('Incorrect password.');
    }
  });
});

// Add Task Route
app.post('/task', isAuthenticated, (req, res) => {
  const { task } = req.body;
  const userId = req.user.id;

  if (!task || task.trim() === '') {
    return res.send('Task cannot be empty.');
  }

  const sql = 'INSERT INTO tasks (user_id, task) VALUES (?, ?)';
  connection.query(sql, [userId, task], (err) => {
    if (err) {
      return res.send('Something went wrong while adding the task.');
    }
    res.redirect('/dashboard');
  });
});

// Edit task route
app.post('/edit/:id', isAuthenticated, (req, res) => {
  const taskId = req.params.id;
  const { task } = req.body;

  if (!task || task.trim() === '') {
    return res.send('Task cannot be empty.');
  }

  const sql = 'UPDATE tasks SET task = ? WHERE id = ?';
  connection.query(sql, [task, taskId], (err) => {
    if (err) {
      return res.send('Something went wrong while updating the task.');
    }
    res.redirect('/dashboard');
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
