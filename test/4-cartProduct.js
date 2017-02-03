const chai = require('chai')
const chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)
const expect = chai.expect

const configPath = process.env.CONFIGPATH
const opt = configPath == null ? require('./config.js') : require('./' + configPath)
const repositories = require('./models/Repositories.js')

const Orm = require('../index.js').Orm
const _ = require('lodash')

const cartProperties = ['id', 'totalPrice', 'coupon', 'isPaid', 'cartProducts']
const cartProductProperties = ['id', 'dateAdded', 'cart', 'numberOf']

const coupon = 'CouponTestCartProduct'
let savedCartId = null

describe('CartProduct', function () {

    describe('Test create', function () {

        it('Cart and cartProduct should be created without errors', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            orm.init().then(() => {
                return Cart.create({
                    totalPrice: 0,
                    coupon: coupon,
                    isPaid: false
                }).then(cart => {
                    savedCartId = cart.id
                    expect(cart).to.contain.all.keys(cartProperties)
                    return CartProduct.create({
                        dateAdded: new Date(),
                        cart: cart.id,
                        numberOf: 1
                    }).then(cartProduct => {
                        done()
                    })
                })
            })
        })

        it('Should find the cart and cart products not populated (one to many)', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            orm.init().then(() => {
                return Cart.findOne({ coupon: coupon }).then(cart => {
                    expect(cart).to.contain.all.keys(cartProperties)
                    expect(cart.cartProducts.length).to.be.equal(0)
                    done()
                })
            })
        })

        it('Should find the cart and cart products populated (one to many)', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            orm.init().then(() => {
                return Cart.findOne({ coupon: coupon }, { populate: ['cartProducts'] }).then(cart => {
                    expect(cart).to.contain.all.keys(cartProperties)
                    expect(cart.cartProducts.length).to.be.equal(1)
                    expect(cart.cartProducts[0]).to.contain.all.keys(cartProductProperties)
                    done()
                })
            })
        })

        it('Should add a cartProduct to the existing cart', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            orm.init().then(() => {
                return CartProduct.create({
                    dateAdded: new Date(),
                    cart: savedCartId,
                    numberOf: 3
                }).then(cartProduct => {
                    done()
                })
            })
        })

        it('Should find the cart and cart products populated (one to many)', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            orm.init().then(() => {
                return Cart.findOne({ coupon: coupon }, { populate: ['cartProducts'] }).then(cart => {
                    expect(cart).to.contain.all.keys(cartProperties)
                    expect(cart.cartProducts.length).to.be.equal(2)
                    expect(cart.cartProducts[0]).to.contain.all.keys(cartProductProperties)
                    expect(cart.cartProducts[1]).to.contain.all.keys(cartProductProperties)
                    done()
                })
            })
        })


    })
})