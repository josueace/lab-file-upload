// routes/auth.routes.js

const { Router } = require('express');
const router = new Router();
const multer  = require('multer');
const bcryptjs = require('bcryptjs');
const passport = require('passport');
const saltRounds = 10;
const User = require('../models/User.model');
const Post = require('../models/Post.model');
const mongoose = require('mongoose');

const routeGuard = require('../configs/route-guard.config');

////////////////////////////////////////////////////////////////////////
///////////////////////////// SIGNUP //////////////////////////////////
////////////////////////////////////////////////////////////////////////

// .get() route ==> to display the signup form to users

const upload = multer({ dest: './public/uploads/' });

router.get('/signup', (req, res) => res.render('auth/signup'));




// .post() route ==> to process form data
router.post('/signup',upload.single('photo'), (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.render('auth/signup', { errorMessage: 'All fields are mandatory. Please provide your username, email and password.' });
    return;
  }

  // make sure passwords are strong:
  const regex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
  if (!regex.test(password)) {
    res
      .status(500)
      .render('auth/signup', { errorMessage: 'Password needs to have at least 6 chars and must contain at least one number, one lowercase and one uppercase letter.' });
    return;
  }
console.log(req.file);
  bcryptjs
    .genSalt(saltRounds)
    .then(salt => bcryptjs.hash(password, salt))
    .then(hashedPassword => {
      return User.create({
        // username: username
        username,
        email,
        // passwordHash => this is the key from the User model
        //     ^
        //     |            |--> this is placeholder (how we named returning value from the previous method (.hash()))
        passwordHash: hashedPassword,
        path: `/uploads/${req.file.filename}`
      });
    })
    .then(userFromDB => {
      console.log('Newly created user is: ', userFromDB);
      res.redirect('/userProfile');
    })
    .catch(error => {
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(500).render('auth/signup', { errorMessage: error.message });
      } else if (error.code === 11000) {
        res.status(500).render('auth/signup', {
          errorMessage: 'Username and email need to be unique. Either username or email is already used.'
        });
      } else {
        next(error);
      }
    }); // close .catch()
});

////////////////////////////////////////////////////////////////////////
///////////////////////////// LOGIN ////////////////////////////////////
////////////////////////////////////////////////////////////////////////

// .get() route ==> to display the login form to users
router.get('/login', (req, res) => res.render('auth/login'));

// .post() login route ==> to process form data
router.post('/login', (req, res, next) => {
  const { email, password } = req.body;

  if (email === '' || password === '') {
    res.render('auth/login', {
      errorMessage: 'Please enter both, email and password to login.'
    });
    return;
  }

  User.findOne({ email })
    .then(user => {
      if (!user) {
        res.render('auth/login', { errorMessage: 'Email is not registered. Try with other email.' });
        return;
      } else if (bcryptjs.compareSync(password, user.passwordHash)) {
        req.session.currentUser = user;
        res.redirect('/userProfile');
      } else {
        res.render('auth/login', { errorMessage: 'Incorrect password.' });
      }
    })
    .catch(error => next(error));
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/login')
  }
}

router.get('/post-form',routeGuard,(req, res) => {
  
  res.render('posts/post-form');
});

router.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: true,
  passReqToCallback: true
}));


router.post('/post',upload.single('photo'), (req, res, next) => {
  const { content, picName } = req.body;

  console.log(req.session.currentUser);

      const newPost = new Post ({
        content:  content,
        creatorId:  req.session.currentUser._id,
          picName:picName,
          picPath:`/uploads/${req.file.filename}`
      });
    
      newPost.save ((err) => {
        if (err) { return next(err); }
        else {
          res.redirect('/userProfile');
        }
      })
     
    
});

router.get('/posts', (req, res) => {

  Post.find()
  .then(listPost=>{
    res.render('posts/posts',{posts:listPost});
  }).catch(err =>{
    console.log(err);
  })
  
});

router.get('/details/:postId', (req, res) => {
Post.findById(req.params.postId)
.then(post =>{
  res.render('posts/post-details',post);
})
.catch()  
  
});

////////////////////////////////////////////////////////////////////////
///////////////////////////// LOGOUT ////////////////////////////////////
////////////////////////////////////////////////////////////////////////

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

router.get('/userProfile', routeGuard, (req, res) => {
  res.render('users/user-profile');
});

module.exports = router;
