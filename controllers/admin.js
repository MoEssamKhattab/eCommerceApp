const {validationResult} = require("express-validator");

const Product = require('../models/product'); 
const fileHelper = require('../util/file'); 

const ITEM_PER_PAGE = 2;

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false, 
    hasErrors: false, 
    errorMessage: null, 
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const price = req.body.price;
  const image = req.file; // after setting the multer middleware(without passing the object [{ dest: "images" }] to the multer method), [req.file] is an object -->
  // {
  //   fieldname: 'image',
  //   originalname: 'WIN_20230208_18_09_44_Pro.jpg',
  //   encoding: '7bit',
  //   mimetype: 'image/jpeg', 
  //   buffer: it is the way node handles the binary data, 
  //   size: ....
  // }
  const description = req.body.description;

  if (!image){
    return res.status(422).render('admin/edit-product', {
      path: '/admin/add-product',
      pageTitle: 'Add Product',
      editing: false,
      hasErrors: true,
      errorMessage: "The attached file is not an image.",
      product: {
        title: title,
        price: price,
        description: description
      },
      validationErrors: []
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      path: '/admin/add-product',
      pageTitle: 'Add Product',
      editing: false,
      hasErrors: true,
      errorMessage: errors.array()[0].msg,
      product: {
        title: title,
        price: price,
        description: description
      },
      validationErrors: errors.array()
    });
  }

  const imageUrl = image.path; //  when the file is valid(accepted and stored), [image] -> is an object carring the file info

  const product = new Product({ 
    title: title, 
    price: price, 
    description: description, 
    imageUrl: imageUrl, 
    userId: req.user._id 
  });
  product.save()  
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch(err => { 
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error); 
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        hasErrors: false,
        errorMessage: null,
        product: product, 
        validationErrors: []
      });
    })
    .catch(err => { 
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      path: '/admin/edit-product',
      pageTitle: 'Edit Product',
      editing: true,
      hasErrors: true,
      errorMessage: errors.array()[0].msg,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc, 
        _id: prodId
      },
      validationErrors: errors.array()
    });
  }
  Product.findById(prodId)
    .then(product => { 
      if (product.userId.toString() !== req.user._id.toString()) { 
        return res.redirect("/");
      }
      product.title = updatedTitle; 
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image){
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      product.save()
        .then(() => {
          res.redirect('/admin/products');
        })
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find({ userId: req.user._id }).countDocuments()
    .then(countNum => {
      totalItems = countNum;
      return Product.find()
        .skip((page - 1) * ITEM_PER_PAGE)
        .limit(ITEM_PER_PAGE)
    })
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products', 

        hasNextPage: ITEM_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        currentPage: page,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEM_PER_PAGE)
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product){
        return next(new Error("Product Not Found!"));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      // res.redirect('/admin/products');
      res.status(200).json({message: "Success!"}); // here retuning some data instead of returning to the page and reloading it 
    })
    .catch(err => {
      // const error = new Error(err);
      // error.httpStatusCode = 500;
      // return next(error);
      res.status(500).json({ message: "Failed!" });
    });
};
