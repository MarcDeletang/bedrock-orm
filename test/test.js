// var Orm = require('../index.js')
// var UserModel = require('./models/User.js')
// var Cart = require('./models/Cart.js')
// var CartProduct = require('./models/CartProduct.js')
// var Product = require('./models/Product.js')

// var repositories = {
// 	User: UserModel,
// 	Cart: Cart,
// 	CartProduct: CartProduct,
// 	Product: Product
// }
// var log = {
// 	info: function (...message) {
// 		console.log(...message)
// 	},
// 	warn: function (...message) {
// 		console.log(...message)
// 	},
// 	error: function (...message) {
// 		console.log(...message)
// 	}
// }

// var orm = new Orm(opt, repositories, log)

//console.log('orm', orm)
// orm.init().then(function (res) {
// 	//console.log('Enter main', res)
// 	//console.log('User', User)
// 	User.create(null).then(user => {
// 		console.log('result on null', user)
// 	}, err => {
// 		console.log('err on null', err)
// 	})
// 	// User.create({
// 	// 	email: 'test@test.fr',
// 	// 	password: 'password',
// 	// 	firstName: 'firstName',
// 	// 	lastName: 'lastName'
// 	// }).then(user => {
// 	// 	console.log('user', user)
// 	// }, err => {
// 	// 	console.log('err', err)
// 	// })
// }).catch(err => {
// 	console.log('main error', err)
// })