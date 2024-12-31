const Product = require('../models/product');

const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const cartItemSchema = new Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    quantity: {
        type: Number
    }
});

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    resetToken: String,
    resetTokenExpiration: Date,
    cart: {
        items: [cartItemSchema], 
        totalPrice: {
            type: Number,
            default: 0
        }
    }
});


userSchema.methods.spread = function(){
    const promises = this.cart.items.map(element => {
        return Product.findById(element.productId)
            .then(product => {
                return { product: { ...product }, quantity: element.quantity };
            });
    });
    return Promise.all(promises); 
};

userSchema.methods.addToCart = function(product){ 
    const cartProductIndex = this.cart.items.findIndex(cp => { 
        return cp.productId.toString() === product._id.toString();
    });
    

    if (cartProductIndex >= 0) {
        this.cart.items[cartProductIndex].quantity += 1;
    } else {
        this.cart.items.push({
            productId: product._id,
            quantity: 1
        });
    }
    this.cart.totalPrice += product.price;
    return this.save(); 
};

userSchema.methods.deleteItemFromCart = function (product){
    let prodQuantity;
    const updatedCartItems = this.cart.items.filter(item => {
        if (item.productId.toString() === product._id.toString()){
            prodQuantity = item.quantity;
        }
        return item.productId.toString() !== product._id.toString();
    });
    this.cart.items = updatedCartItems;
    
    this.cart.totalPrice -= product.price * prodQuantity;
    return this.save();
}

userSchema.methods.clearCart = function () {
    this.cart = { items: [], totalPrice: 0};
    return this.save();
};

module.exports = mongoose.model('User', userSchema);
