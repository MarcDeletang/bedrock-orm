const UserModel = require('./User.js')
const Cart = require('./Cart.js')
const CartProduct = require('./CartProduct.js')
const Product = require('./Product.js')

module.exports = {
    User: UserModel,
    Cart: Cart,
    CartProduct: CartProduct,
    Product: Product
}