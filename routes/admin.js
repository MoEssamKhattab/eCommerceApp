const express = require('express');
const { check, body } = require('express-validator');

const adminController = require('../controllers/admin');
const isAuth = require('../controllers/is-auth');

const router = express.Router();

router.get('/products', isAuth, adminController.getProducts); 
router.get('/add-product', isAuth, adminController.getAddProduct);
router.post(
    '/add-product',
    [
        body("title", "Invalid Title, the title must be minimum 3 characters!").isString().isLength({ min: 3 }).trim(),  
        body("price", "Invalid Prie, the price must be floating number!").isFloat(),
        body("description", "Invalid Description, the description must be minimum 5 characters and maximum 400!").isString().isLength({ min: 5, max: 400}).trim()
    ],
    isAuth,
    adminController.postAddProduct);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);
router.post(
    '/edit-product',
    [
        body("title", "Invalid Title, the title must be minimum 3 characters!").isString().isLength({ min: 3 }).trim(), 
        body("price", "Invalid Prie, the price must be floating number!").isFloat(),
        body("description", "Invalid Description, the description must be minimum 5 characters and maximum 400!").isString().isLength({ min: 5, max: 400 }).trim()
    ],
    isAuth,
    adminController.postEditProduct);

// router.post('/delete-product', isAuth, adminController.postDeleteProduct); // we wanna make deleting a product is an asynchronous request that instead of the form, posting the request, deleting the prod and returning to the same page -> we can delete the prod without reloading the page by the asynchronous request 
router.delete('/product/:productId', isAuth, adminController.deleteProduct); // using the verb [delete] instead of [post], then the delete request won't have the object [req.body]

module.exports = router;
