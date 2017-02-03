const chai = require('chai')
const chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)
const expect = chai.expect

const configPath = process.env.CONFIGPATH
const opt = configPath == null ? require('./config.js') : require('./' + configPath)
const repositories = require('./models/Repositories.js')

const Orm = require('../index.js').Orm
const _ = require('lodash')

const userProperties = ['id', 'email', 'password', 'salt', 'firstName', 'lastName', 'cart', 'toJSON']
const cartProperties = ['id', 'totalPrice', 'coupon', 'isPaid', 'cartProducts']
const email = 'testOneToOne@email.fr'


let savedCartId = null

describe('UserCart', function () {

    describe('Test create', function () {
        it('User and cart should be created without errors', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            orm.init().then(() => {
                return Cart.create({
                    totalPrice: 0,
                    coupon: 'None',
                    isPaid: false
                }).then(cart => {
                    savedCartId = cart.id
                    expect(cart).to.contain.all.keys(cartProperties)
                    return User.create({
                        email: email,
                        password: 'password',
                        firstName: 'firstName',
                        lastName: 'lastName',
                        cart: cart.id
                    }).then(user => {
                        expect(user).to.contain.all.keys(userProperties)
                        done()
                    })
                })
            })
        })

        it('Should find the user with the cart populated (test one to one)', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            orm.init().then(() => {
                return User.findOne({ email: email }, { populate: ['cart'] }).then(user => {
                    expect(user).to.contain.all.keys(userProperties)
                    expect(user.cart).to.contain.all.keys(cartProperties)
                    done()
                })
            })
        })

        it('Should find the user with the cart not populated (test one to one)', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            orm.init().then(() => {
                return User.findOne({ email: email }).then(user => {
                    expect(user).to.contain.all.keys(userProperties)
                    expect(user.cart).to.be.equal(savedCartId)
                    done()
                })
            })
        })
    })
})