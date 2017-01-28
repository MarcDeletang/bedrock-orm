const expect = require('chai').expect

const opt = require('./config.js')
const repositories = require('./models/Repositories.js')

const Orm = require('../index.js')
const _ = require('lodash')

describe('Init', function () {
	describe('Constructor', function () {
		it('Orm should be a constructor', function (done) {
			expect(Orm).to.be.a('function')
			done()
		})

		it('Orm shoud throw an error on config', function (done) {
			expect(() => {
				new Orm()
			}).to.throw('ConfigError: No config')
			done()
		})


		it('Orm shoud throw an error on database', function (done) {
			var optCloned = _.clone(opt)
			delete optCloned.database
			expect(() => {
				new Orm(optCloned)
			}).to.throw('ConfigError: No database')
			done()
		})

		it('Orm shoud throw an error on password', function (done) {
			var optCloned = _.clone(opt)
			delete optCloned.password
			expect(() => {
				new Orm(optCloned)
			}).to.throw('ConfigError: No password')
			done()
		})

		it('Orm shoud throw an error on user', function (done) {
			var optCloned = _.clone(opt)
			delete optCloned.user
			expect(() => {
				new Orm(optCloned)
			}).to.throw('ConfigError: No user')
			done()
		})

		it('Orm loaded should be an object without errors', function (done) {
			var orm = new Orm(opt, repositories)
			expect(orm).to.be.an('object')
			done()
		})
	})

	describe('Testing globals', function () {
		it('Should have not set any globals', function (done) {
			var orm = new Orm(opt, repositories)
			orm.loadRepositories()
			for (var key in repositories) {
				expect(global[key]).to.be.undefined
			}
			done()
		})

		it('Should have set globals', function (done) {
			var optCloned = _.clone(opt)
			optCloned.setGlobal = true
			var orm = new Orm(optCloned, repositories)
			orm.loadRepositories()
			for (var key in repositories) {
				expect(global[key]).to.be.an('object')
			}
			done()
		})
	})

	describe('Loading repositories', function () {
		it('Repositories should load without errors', function (done) {
			var orm = new Orm(opt, repositories)
			expect(() => {
				orm.loadRepositories()
			}).not.to.throw(Error)
			done()
		})
	})




	describe('Setup database', function () {
		it('Orm init should failed: repositories empty', function (done) {
			var orm = new Orm(opt, repositories)
			expect(() => {
				orm.init()
			}).to.throw('InitError: cannot init before loadRepositories')
			done()
		})

		it('Orm init should work without errors', function (done) {
			var orm = new Orm(opt, repositories)
			orm.loadRepositories()
			expect(() => {
				orm.init()

				User.create({
					email: 'test@test.fr',
					password: 'password',
					firstName: 'firstName',
					lastName: 'lastName'
				}).then(user => {
					console.log('user', user)
				}, err => {
					console.log('err', err)
				})
				
			}).not.to.throw(Error)
			done()
		})


	})



})