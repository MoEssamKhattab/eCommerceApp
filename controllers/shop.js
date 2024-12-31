const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit"); // [PDFDocument] is a constructor, Note that you must install the package [functions-have-names] till the package [pdfkit] works
const stripe = require('stripe')('sk_test_26PHem9AhJZvU623DfE1x4sd'); // this package for adding payment using Stripe, the parameter specifies the API_key of your account on the stripe website

const Product = require('../models/product');
const User = require('../models/user');
const Order = require('../models/order');

const ITEM_PER_PAGE = 1;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1; 
  let totalItems;

  Product.find().countDocuments() 
    .then(countNum => {
      totalItems = countNum;
      return Product.find()
        .skip((page - 1) * ITEM_PER_PAGE)
        .limit(ITEM_PER_PAGE)
    })
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'Products',
        path: '/products',
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

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId) 
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products'
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1; // if the value of [req.query.page] is NaN, then the value of the page will be 1 
  let totalItems;

  Product.find().countDocuments() //[.count()] This method was used in earlier versions of Mongoose (pre-v5.0.0) to count the number of documents that matched a query. It's now considered deprecated, and you should use [countDocuments()] instead.  
    .then(countNum => {
      totalItems = countNum;
      return Product.find()
        .skip((page - 1) * ITEM_PER_PAGE)
        .limit(ITEM_PER_PAGE)
    })
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/', 
        hasNextPage: ITEM_PER_PAGE * page < totalItems, 
        hasPreviousPage: page>1, 
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

exports.getCart = (req, res, next) => {
  const promises = req.user.cart.items.map(element => {
    return Product.findById(element.productId)
      .then(product => {
        return { ...product, quantity: element.quantity };
      });
  });

  Promise.all(promises)
    .then(products => {
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        totalPrice: req.user.cart.totalPrice
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      req.user.addToCart(product) 
        .then(() => {
          res.redirect('/cart');
        })
        .catch(err => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
        });
    });
};



exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
  .then(product => {
    req.user
      .deleteItemFromCart(product)
      .then(() => {
        res.redirect('/cart');
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  })
};



exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then(order => {
      if (!order) {
        return next(new Error('No order found.'));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error('Unauthorized'));
      }
      invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("invoices", invoiceName);
      // Option 1 --> Reading the file from the memory and this option is not prefered in case the bigger files, the response must wait for the file till be read
        // fs.readFile(invoicePath, (err, data) => {
        //   if (err){
        //     return next(err);
        //   }
        //   res.setHeader("Content-Type", "application/pdf");
        //   res.setHeader('Content-Disposition', `inline; filename=${invoiceName}`); // [inline] -> the file will be opened in the browser, it can be [attachment] -> displaying a window to download the file
        //   res.send(data);
      //  });

      // Option 2 --> Streaming the file -> reading chunks and responding them one by one
        // const file = fs.createReadStream(invoicePath);
        // res.setHeader('Content-Type', 'application/pdf');
        // res.setHeader(
        //   'Content-Disposition',
        //   'inline; filename="' + invoiceName + '"'
        // );
        // file.pipe(res);

      // Option 3 --> Using the package [pdfkit] for creating the PDF file and piping it as a respone
      const pdfDoc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath)); // First, creating streams
      pdfDoc.pipe(res); // Second, piping it as a response 

      // Styling and adding text to the PDF file created 
      pdfDoc.fontSize(26).text('Invoice', {
        underline: true
      });
      pdfDoc.text('-----------------------');
      order.products.forEach(prod => {
        pdfDoc
          .fontSize(14)
          .text(
            prod.product.title +
            ' - ' +
            prod.quantity +
            ' x ' +
            '$' +
            prod.product.price
          );
      });
      pdfDoc.text('---');
      pdfDoc.fontSize(20).text('Total Price: $' + order.totalPrice);

      pdfDoc.end();
    })
  .catch (err => {
    return next(err);
  })
};

exports.createOrder = (req, res, next) => {
  req.user
    .spread()
    .then(products => {
      const order = new Order({
        products: products,
        user: {
          email: req.user.email,
          userId: req.user
        },
        totalPrice: req.user.cart.totalPrice
      });
      return order.save();
    })
    .then(() => {
      return req.user.clearCart();
    })
    .then(() => {
      res.json({ message: 'Order created successfully!', redirectUrl: '/orders' });
    })
    // .then(() => {
    //   res.redirect('/orders'); // it won't work --> If your route is being called via JavaScript (fetch, axios, etc.), res.redirect will not work on API requests. Redirects only work for browser-initiated requests.
    // })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};


// exports.getCheckout = async(req, res, next) => {
//   req.user
//     .spread()
//     .then(async(products) => {
//       const session = await stripe.checkout.sessions.create({
//         payment_method_types: ["card"],
//         line_items: products.map(p => {
//           return {
//             price_data: {
//               currency: 'usd',
//               product_data: {
//                 name: p.product._doc.title
//                 // images: [] // you can add the key images whose valus is an array of URL images of a product
//               },
//               unit_amount: p.product._doc.price * 100
//             },
//             quantity: p.quantity
//           }
//         }),
//         mode: "payment",
//         success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:3000/checkout/success -> this URL will be visited when success
//         cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
//       });
//       res.json({ id: session.id });
//     })
//     .catch(err => {
//       console.log(err);
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });        
// };

// exports.getCheckoutSuccess = (req, res, next) => {
//   req.user
//     .spread()
//     .then(products => {
//       const order = new Order({
//         products: products,
//         user: {
//           email: req.user.email,
//           userId: req.user
//         },
//         totalPrice: req.user.cart.totalPrice
//       });
//       return order.save();
//     })
//     .then(() => {
//       return req.user.clearCart();
//     })
//     .then(() => {
//       res.redirect('/orders');
//     })
//     .catch(err => {
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
// };