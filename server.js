//Vishaun Jones
//Final Project

//Environment variables loaded in and set inside the .env
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
};

//Packages needed for application
const express = require('express'); //Web framework for backed web development
const bodyParser = require('body-parser'); // This packages lets us use json format to send/receive messages
const https = require('https'); //This package allows for external API calls
const bcrypt = require('bcrypt'); //This package hashes passwords for extra security
const passport = require('passport'); //This package allows for user data to be used to access the main page
const flash = require('connect-flash'); //
const session = require('express-session'); //
// const MemoryStore = require('memorystore')(session);
const dotenv = require('dotenv').config();
const app = express();

//Passport Config
require('./passport')(passport);

//Database
const mongoose = require('mongoose');
const db = process.env.DB_URI;

//Mongoose Conncetion
mongoose.connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

//User Model
const User = require('./models/User');


//Body Parser
app.use(express.urlencoded({
  extended: false
})); // support encoded bodies

//These lines configures express in order to use all the static files in the public folder as the files that compose the web page
app.use(express.static('public'));
app.use('/css', express.static(__dirname + 'public/css'));
app.use('/js', express.static(__dirname + 'public/js'));
app.use('/images', express.static(__dirname + 'public/images'));

//EJS & Set views
app.set('views', './views');
app.set('view engine', 'ejs');


//Express Session
app.use(session({
  secret: process.env.SESSION_SECRET, //A key that is kept secret to encrypt data (longer and more random = more secure)
  cookie: { maxAge: 86400000 },
  resave: false, //Don't resave session variables if nothing is changed
  saveUninitialized: false //Don't save empty values
}));

//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

//Connect Flash
app.use(flash());

//Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});



//Main page
app.get('', function(req, res) {
  res.render('main-page');
});


//Sign Up Page
app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {

  const {
    name,
    username,
    password,
    password2
  } = req.body;
  let errors = [];

  //Sign Up Vallidation
  //Validation Failed
  if (!name || !username || !password || !password2) { //All fields are filled out
    errors.push({
      msg: ' Please fill in all fields '
    })
  }
  if (username.length < 6) { //Username length check
    errors.push({
      msg: ' Username must be at least 6 characters '
    })
  }
  if (password !== password2) { //Passwords match check
    errors.push({
      msg: ' Passwords do not match '
    })
  }
  if (password.length < 6) { //Password length check
    errors.push({
      msg: ' Password must be at least 6 characters '
    })
  }
  if (errors.length > 0) {
    res.render('signup', {
      errors,
      name,
      username,
      password,
      password2
    });
    //Validation Passed
  } else {
    User.findOne( {
      username: username
    }).then (user => {
      if(user) {
        error.push({
          msg: 'Username is already registered '
        })
        res.render('signup', {
          errors,
          name,
          username,
          password,
          password2
        })
      } else {
        const newUser = new User({
          name,
          username,
          password
        })
        //Hash Password
        bcrypt.genSalt(10, (err, salt) =>
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if(err) throw err
            //Set password to hashed
            newUser.password = hash;
            // Save user
            newUser.save()
              .then(user => {
                req.flash('success_msg', 'You are now registered! Please login')
                res.redirect('/login')
              })
              .catch(err => console.log(err))
          }))

      }
    })
  }
});


//Login Page
app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/quote-page',
    failureRedirect: '/login',
    failureFlash: true //displays error message from passport.js file
  })(req, res, next);
});

//Quote Page Protection
const { ensureAuthenticated } = require('./auth');

//Handler for inspirational quote page
app.get('/quote-page', ensureAuthenticated, (req, res) => {
  const url = 'https://zenquotes.io/api/random';

  https.get(url, (response) => {

    console.log(response.statusCode);
    response.on("data", function(data) {

      let quoteData = JSON.parse(data);
      let quote = quoteData[0].q;
      let author = quoteData[0].a;
      console.log(quoteData);
      res.render('quote', {
        quote: quote,
        author: author
      })
    })
  })
});

//Local host used for the web server
app.listen(process.env.PORT || 3000, function() {
  console.log("Server is running on port 3000");
});
