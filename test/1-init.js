const expect = require('expect.js')

const UserModel = require('./models/User.js')
const Cart = require('./models/Cart.js')
const CartProduct = require('./models/CartProduct.js')
const Product = require('./models/Product.js')
const opt = require('./config.js')

const Orm = require('../index.js')

var repositories = {
	User: UserModel,
	Cart: Cart,
	CartProduct: CartProduct,
	Product: Product
}

console.log('expect', expect)
it('Orm should be a constructor', function (done) {
console.log('expect in it', expect)
    expect(typeof Orm == 'function').to.be(true)
	setTimeout(done, 1000)
})

it('Orm shoud load with success', function (done) {
    expect(typeof Orm == 'function').to.be(true)
	setTimeout(done, 1000)
})
