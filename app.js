require('dotenv').config();
const path = require("path");
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session); 
const csrf = require('csurf'); 
const flash = require('connect-flash');
const multer = require('multer'); // the package [multer] for handling the incoming requests containing text and binary data

const errorController = require('./controllers/error');
const User = require('./models/user');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const app = express();
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  collection: 'sessions'
});
const csrfProtection = csrf();
// setting the file uploaded config using the method [diskStorage] from the package [multer] and for this multer will turn the buffer(containing the binary data in the buffer format) back to the binary data file stored in the path [images/file], you can use the method [memoryStorage] for storing the file as a buffer in the memory not the disk
const fileStorage = multer.diskStorage({
  // the two functions representing the values of the two keys [destination, filename] will be called for each request 
  destination: function (req, file, cb){
    cb(null, "images"); // this callback function will be called after setting the destination, the first parameter is the error message, here is [null] telling multer that it is ok to store it, the second parameter is the name of the destination/folder where the file will be stored   
    // the "images" folder must be exist(created already), if you set the destination "/images" or "path.join(__dirname, 'images')" it is an absoluted path that the key [path](used to stor the imageURL in the DB) will be the entire path and it is not correct
  }, 
  filename: function (req, file, cb){
    cb(null, Date.now() + file.originalname); // setting a unique name for the file, Note that this name must be valid that the file stored correctly
  }
});

const fileFilter = (req, file, cb) => {
  // storing only the image files of types [jpg, jpeg, png]
  if (file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
    cb(null, true); // the second parameter is [true] if the file should be stored and [false] if we don't to store the file 
  }
  else{
    cb(null, false);
  }
}

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false })); // the parser [urlencoded] is for the text inputs, that these text data can be extracted from the input fields in the form and encoded in the url and accessed as [req.body..], then if the type of the input is a file it will fail that the file is a binary data not text, then we need to install the package [multer] to work with the files data 
app.use(multer({ fileFilter: fileFilter, storage: fileStorage }).single("image")); // adding the multer middlewars, function [multer()] returns an object having the method [single("the input name")](refers to that the form contains only a file not multiple files), the parameter passed to the method [multer] is an object whih can have the key [dest] for the destination that the file uploaded will be stored in and. Instead of using the key [dest], we can use the [storage] key to set more config. 

app.use(express.static(path.join(__dirname, 'public'))); // the requests to the files of the folder of the path defined will be handled automatically and these files will be returned, then for example when linking a css file using the attribute [href] the value of [href] represents request url of the file for example "/css/main.css"  
app.use("/images", express.static(path.join(__dirname, 'images'))); // handling the files of the folder [images](carring the images uploaded), then here the request url(the value of the src attribute) is "/images/image.png" 
// Notes -> About serving the static files 
// the path of the static file like css or js or an image represent the request url that this request will be handled using [express.static("The folder path")]

app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false, store: store})); 
app.use(csrfProtection); 
app.use(flash()); 

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});
app.use((req, res, next) => {
  if (!req.session.user) { 
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user){
        return next();
      }
      req.user = user; 
      next();
    })
    .catch(err => { next(new Error(err))});
});


app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.use(errorController.get404);

app.use((error, req, res, next) => { 
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500', 
  });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(3000, () => {
      console.log("The server starts on the port 3000");
    });
  })
  .catch(err => {
    console.log(err);
  });

