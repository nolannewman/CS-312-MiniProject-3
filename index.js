require('dotenv').config(); // Import dotenv to use environment variables
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const saltRounds = 10; // Define salt rounds for bcrypt

const app = express();
const PORT = process.env.PORT || 3000;

// Set up EJS as the templating engine
app.set('view engine', 'ejs');

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse request body
app.use(bodyParser.urlencoded({ extended: true }));

// Set up PostgreSQL connection pool using environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middleware to track the logged-in user
let currentUser = null;

// Route to render the homepage with blog posts
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blogs');
    res.render('index', {
      blogTitle: 'Mini Project 1',
      posts: result.rows,
      currentUser: currentUser
    });
  } catch (err) {
    console.error(err);
    res.send('Error occurred while fetching blog posts');
  }
});

// Render signup page
app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// Handle user signup
app.post('/signup', async (req, res) => {
  const { user_id, password, name } = req.body;
  try {
    const userExist = await pool.query('SELECT * FROM users WHERE name = $1', [name]);
    if (userExist.rows.length > 0) {
      return res.render('signup', { error: 'User ID already taken. Please choose another one.' });
    }

    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the user with the hashed password
    await pool.query('INSERT INTO users (name, password) VALUES ($1, $2)', [name, hashedPassword]);
    res.redirect('/signin');
  } catch (err) {
    console.error(err);
    res.send('Error occurred during signup');
  }
});

// Render sign-in page
app.get('/signin', (req, res) => {
  res.render('signin', { error: null });
});

// Handle user sign-in
app.post('/signin', async (req, res) => {
  const { user_id, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE name = $1', [user_id]);
    if (result.rows.length === 0) {
      return res.render('signin', { error: 'Invalid User ID or Password.' });
    }

    const user = result.rows[0];

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('signin', { error: 'Invalid User ID or Password.' });
    }

    currentUser = user;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('Error occurred during sign-in');
  }
});

// Handle sign out
app.get('/signout', (req, res) => {
  currentUser = null;
  res.redirect('/');
});

// Render account page for authenticated users
app.get('/account', (req, res) => {
  if (!currentUser) {
    return res.redirect('/signin');
  }
  res.render('account', { currentUser: currentUser, error: null });
});

// Handle account update (change user ID and password)
app.post('/account', async (req, res) => {
  if (!currentUser) {
    return res.redirect('/signin');
  }
  const { new_user_id, new_password } = req.body;

  try {
    // Check if the new user ID is already taken by someone else
    const userExist = await pool.query('SELECT * FROM users WHERE name = $1', [new_user_id]);
    if (userExist.rows.length > 0 && userExist.rows[0].user_id !== currentUser.user_id) {
      return res.render('account', { currentUser: currentUser, error: 'User ID already taken. Please choose another one.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(new_password, saltRounds);

    // Update the user's information in the database
    await pool.query('UPDATE users SET name = $1, password = $2 WHERE user_id = $3', 
                     [new_user_id, hashedPassword, currentUser.user_id]);

    // Update currentUser in session
    currentUser.name = new_user_id;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('Error occurred while updating account');
  }
});

// Route to handle new blog post submissions
app.post('/add-post', async (req, res) => {
  if (!currentUser) {
    return res.redirect('/signin');
  }
  const { title, content, category } = req.body;
  try {
    await pool.query('INSERT INTO blogs (creator_name, creator_user_id, title, body) VALUES ($1, $2, $3, $4)', 
                     [currentUser.name, currentUser.user_id, title, content]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('Error occurred while adding the blog post');
  }
});

// Render the edit post page
app.get('/edit-post/:id', async (req, res) => {
  const { id } = req.params;
  if (!currentUser) {
    return res.redirect('/signin');
  }

  try {
    const result = await pool.query('SELECT * FROM blogs WHERE blog_id = $1 AND creator_user_id = $2', [id, currentUser.user_id]);
    if (result.rows.length === 0) {
      return res.send('You are not authorized to edit this post.');
    }

    res.render('edit-post', { post: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.send('Error occurred while fetching the post.');
  }
});

// Handle updating a post
app.post('/edit-post/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!currentUser) {
    return res.redirect('/signin');
  }

  try {
    const result = await pool.query('SELECT * FROM blogs WHERE blog_id = $1 AND creator_user_id = $2', [id, currentUser.user_id]);
    if (result.rows.length === 0) {
      return res.send('You are not authorized to edit this post.');
    }

    await pool.query('UPDATE blogs SET title = $1, body = $2 WHERE blog_id = $3', [title, content, id]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('Error occurred while updating the post.');
  }
});


// Route to handle deleting a blog post
app.get('/delete-post/:id', async (req, res) => {
  const { id } = req.params;
  if (!currentUser) {
    return res.redirect('/signin');
  }
  try {
    const post = await pool.query('SELECT * FROM blogs WHERE blog_id = $1 AND creator_user_id = $2', [id, currentUser.user_id]);
    if (post.rows.length === 0) {
      return res.send('You are not authorized to delete this post.');
    }
    await pool.query('DELETE FROM blogs WHERE blog_id = $1', [id]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('Error occurred while deleting the blog post');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});
