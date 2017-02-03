const chai = require('chai')
const chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)
const expect = chai.expect

const configPath = process.env.CONFIGPATH
const opt = configPath == null ? require('./config.js') : require('./' + configPath)
const repositories = require('./models/Repositories.js')

const Orm = require('../index.js').Orm
const _ = require('lodash')

const userProperties = ['id', 'email', 'password', 'salt', 'firstName', 'lastName', 'createdAt', 'updatedAt', 'carts', 'toJSON']

describe('User', function () {

    describe('Create', function () {

        it('User should be created without errors', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            expect(() => {
                orm.init().then(() => {
                    User.create({
                        email: 'test@test.fr',
                        password: 'password',
                        firstName: 'firstName',
                        lastName: 'lastName'
                    }).then(user => {
                        done()
                    }, err => {
                        console.log('err', err)
                    })
                }).catch(err => {
                    console.log('Main catched', err)
                })
            }).not.to.throw(Error)
        })

        it('Should create an array of 10 users', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            expect(() => {
                return orm.init().then(() => {
                    let i = 0
                    const users = Array.apply(null, Array(10)).reduce(function (res) {
                        res.push({
                            email: 'test' + ++i + '@test.fr',
                            password: 'password',
                            firstName: 'firstName',
                            lastName: 'lastName'
                        })
                        return res
                    }, [])
                    return User.create(users).then(users => {
                        //console.log('users created', users)
                        done()
                    })
                })
            }).not.to.throw(Error)
        })

    })
    describe('Count', function () {

        it('Should return the number of users in database', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            expect(() => {
                return orm.init().then(() => {
                    return User.count().then(count => {
                        expect(count).to.be.equal(11)
                        done()
                    })
                })
            }).not.to.throw(Error)
        })
    })

    describe('Find', function () {
        it('Should return the users in database', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            expect(() => {
                return orm.init().then(() => {
                    return User.find().then(users => {
                        users.map(user=>{
                            expect(user).to.contain.all.keys(userProperties)
                        })
                        done()
                    })
                })
            }).not.to.throw(Error)
        })
    })

    describe('Remove', function () {
        it('Should remove the users from the database', function (done) {
            let orm = new Orm(opt, repositories)
            orm.loadRepositories()
            expect(() => {
                return orm.init().then(() => {
                    return User.find().then(users => {
                        let promises = users.reduce((result, user) => {
                            result.push(User.remove({ id: user.id }))
                            return result
                        }, [])
                        return Promise.all(promises).then(results => {
                            results.map(countRemoved =>{
                                expect(countRemoved).to.equal(1)
                            })
                            done()
                        })
                    })
                    // console.log(users)
                })
            }).not.to.throw(Error)
        })
    })
})
