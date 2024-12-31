require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer'); 
const { validationResult } = require('express-validator'); 
const User = require('../models/user');

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: { 
    user: "youssefalaaalfahl@gmail.com",
    pass: process.env.EMAIL_PASS
  }
});

exports.getLogin = (req, res, next) => {  
  message = req.flash("error");
  if (message.length > 0){
    message = message[0];
  }
  else{
    message = null;  
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login', 
    isAuthenticated: false, 
    errorMessage: message, 
    oldInput: {
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {  
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg, 
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array()
    });
  }

  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        req.flash("error", "Invalid Email or Pasword!");
        return res.redirect('/login');
      }
      bcrypt
        .compare(password, user.password) 
        .then(doMatch => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err => {
              if (err){
                console.log(err);
              }
              else{
                res.redirect('/');
              }
            });
          }
          req.flash("error", "Invalid Email or Pasword!");
          res.redirect('/login');
        })
        .catch(err => {
          console.log(err);
          res.redirect('/login');
        });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    isAuthenticated: false, 
    errorMessage: null, 
    oldInput: {
      email: '',
      password: '',
      confirmPassword: ''
    }, 
    validationErrors: []
  });
};

exports.postSignup = (req, res, next) => { 
  const email = req.body.email;
  const password = req.body.password;
  const errors =  validationResult(req); 
  if (!errors.isEmpty()){
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      isAuthenticated: false,
      errorMessage: errors.array()[0].msg, 
      oldInput: {
        email: email, 
        password: password, 
        confirmPassword: req.body.confirmPassword
      }, 
      validationErrors: errors.array()
    });
  }
  bcrypt.hash(password, 12) 
    .then(hashedPassword => { 
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] }
      });
      return user.save();
    })
    .then(() => {
      const mail = {
        from: "youssefalaaalfahl@gmail.com", 
        to: email, 
        subject: "Confirmation",
        text: "Successfully signed up!" 
      };
      res.redirect('/login');
      transporter.sendMail(mail, err => { 
        if(err){
          console.log(err);
        }
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => { 
    if(!err){
      res.redirect('/');
    }
  })
};

exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message, 
    email: '',
    validationErrors: []
  });
};

exports.postReset = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/reset', {
      path: '/reset',
      pageTitle: 'Reset Password',
      errorMessage: errors.array()[0].msg, 
      email: req.body.email, 
      validationErrors: errors.array()
    });
  }
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex'); 
    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          req.flash('error', 'No account with that email found.');
          return res.redirect('/reset');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then(() => {
        res.redirect('/');
        const mail = {
          from: 'youssefalaaalfahl@gmail.com',
          to: req.body.email,
          subject: 'Password reset',
          html: ` 
            <p>You requested a password reset</p>
            <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
          `
        };
        transporter.sendMail(mail)
          .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
          });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      if (!user){
        res.send("Error During Verification!");
        return setTimeout(() => {res.redirect("/pageNotFound")}, 1000);
      }
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: null,
        userId: user._id.toString(), 
        passwordToken: token, 
        password: '',
        validationErrors: []
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/new-password', {
      path: '/new-password',
      pageTitle: 'New Password',
      errorMessage: errors.array()[0].msg, 
      userId: userId,
      passwordToken: passwordToken, 
      password: newPassword, 
      validationErrors: errors.array()
    });
  }
  
  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId 
  })
    .then(user => {
      if (!user){
        res.send("Error During Verification!");
        return setTimeout(() => { res.redirect("/pageNotFound") }, 1000);
      }
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save(); 
    })
    .then(() => {
      res.redirect('/login');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

