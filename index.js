const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up EJS as the templating engine
app.set('view engine', 'ejs');

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse request body
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize blog posts and categories arrays
let blogPosts = [
  {
    id: 0,
    title: "Understanding Cloud Computing",
    name: "Charlie",
    date: "08/28/2024 9:00 AM",
    content: "Cloud computing offers businesses scalable and flexible computing resources, reducing costs and improving efficiency.",
    category: "Tech"
  },
  {
    id: 1,
    title: "Healthy Lifestyle Tips",
    name: "Bob",
    date: "09/03/2024 2:45 PM",
    content: "Maintaining a healthy lifestyle requires a balanced diet, regular exercise, and mental well-being practices.",
    category: "Lifestyle"
  },
  {
    id: 2,
    title: "The Future of Tech",
    name: "Alice",
    date: "09/05/2024 10:30 AM",
    content: "Technology is advancing faster than ever, with AI and machine learning paving the way for new innovations.",
    category: "Tech"
  }
];

let categories = ["Tech", "Lifestyle", "Education"];

// Function to format the date and time
function formatDateTime() {
  const now = new Date();
  const date = now.toLocaleDateString(); 
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

// Route to render the main blog page
app.get('/', (req, res) => {
  res.render('index', {
    blogTitle: 'Mini Project 1',
    posts: blogPosts,
    categories: categories
  });
});

// Route to handle new blog post submissions
app.post('/add-post', (req, res) => {
  const { title, content, category, name } = req.body;

  // Add the new category if it doesn't exist already
  if (!categories.includes(category)) {
    categories.push(category);
  }

  // Create a new post
  const newPost = {
    // Assign a unique ID based on the array length
    id: blogPosts.length,
    title: title,
    name: name,
    date: formatDateTime(),
    content: content,
    category: category
  };
  // Add the new post to the blogPosts array
  blogPosts.push(newPost);

  res.redirect('/');
});

// Route to handle editing a blog post
app.post('/edit-post/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, name } = req.body;

  // Find the post by ID and update
  const post = blogPosts.find(post => post.id == id);
  if (post) {
    post.title = title;
    post.content = content;
    post.name = name;
    post.date = formatDateTime(); 
  }

  res.redirect('/');
});

// Route to handle deleting a blog post
app.get('/delete-post/:id', (req, res) => {
  const { id } = req.params;

  // Filter out the post with the given ID from the blogPosts array
  blogPosts = blogPosts.filter(post => post.id != id);

  res.redirect('/');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});
