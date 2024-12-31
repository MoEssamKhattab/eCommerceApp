const express = require('express');
const { check, body } = require('express-validator'); 

const authController = require('../controllers/auth');
const isAuth = require('../controllers/is-auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);
router.post(
    '/login',
    [ 
        check('email')
            .isEmail() 
            .withMessage('Please enter a valid email.'),
        body(
            'password',
            'Please enter a password with only numbers and text and at least 5 characters.' 
        )
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim() 
    ],
authController.postLogin);

router.get('/signup', authController.getSignup);
router.post(
    '/signup',
    [ 
        check('email')
            .isEmail()
            .withMessage('Please enter a valid email.')
            .custom((value, { req }) => { 
                return User.findOne({ email: value })
                    .then(userDoc => {
                        if (userDoc) {
                            return Promise.reject("Email exists, please, pick a different one!");
                        }
                    })
            }),
        body( 
            'password',
            'Please enter a password with only numbers and text and at least 5 characters.' 
        )
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim(),
        body('confirmPassword').trim().custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords have to match!');
            }
            return true;
        })
    ],
    authController.postSignup
);

router.post('/logout', isAuth, authController.postLogout);

router.get('/reset', authController.getReset);
router.post(
    '/reset',
    check('email')
        .isEmail()
        .withMessage('Please enter a valid email.'),
    authController.postReset);

router.get('/reset/:token', authController.getNewPassword);
router.post(
    '/new-password',
    body(
        'password',
        'Please enter a password with only numbers and text and at least 5 characters.'
    )
        .isLength({ min: 5 })
        .isAlphanumeric()
        .trim(),
    authController.postNewPassword);

module.exports = router;