const chai = require('chai')
const chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)
const expect = chai.expect

const configPath = process.env.CONFIGPATH
const opt = configPath == null ? require('./config.js') : require('./' + configPath)
const repositories = require('./models/Repositories.js')

const Orm = require('../index.js').Orm
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
			let optCloned = _.clone(opt)
			delete optCloned.database
			expect(() => {
				new Orm(optCloned)
			}).to.throw('ConfigError: No database')
			done()
		})

		//Fail on travis
		// it('Orm shoud throw an error on password', function (done) {
		// 	let optCloned = _.clone(opt)
		// 	delete optCloned.password
		// 	expect(() => {
		// 		new Orm(optCloned)
		// 	}).to.throw('ConfigError: No password')
		// 	done()
		// })

		it('Orm shoud throw an error on user', function (done) {
			let optCloned = _.clone(opt)
			delete optCloned.user
			expect(() => {
				new Orm(optCloned)
			}).to.throw('ConfigError: No user')
			done()
		})

		it('Orm loaded should be an object without errors', function (done) {
			let orm = new Orm(opt, repositories)
			expect(orm).to.be.an('object')
			done()
		})
	})

	describe('Testing globals', function () {
		it('Should have not set any globals', function (done) {
			let orm = new Orm(opt, repositories)
			orm.loadRepositories()
			for (let key in repositories) {
				expect(global[key]).to.be.undefined
			}
			done()
		})

		it('Should have set globals', function (done) {
			let optCloned = _.clone(opt)
			optCloned.setGlobal = true
			let orm = new Orm(optCloned, repositories)
			orm.loadRepositories()
			for (let key in repositories) {
				expect(global[key]).to.be.an('object')
			}
			done()
		})
	})

	describe('Loading repositories', function () {

		it('Repositories should load without errors', function (done) {
			let orm = new Orm(opt, repositories)
			let loadRes = orm.loadRepositories()
			expect(loadRes).to.be.an('array')
			done()
		})

	})




	describe('Testing init database', function () {
		it('Orm init should failed: repositories empty', function (done) {
			let orm = new Orm(opt, repositories)
			orm.loadRepositories()
			expect(orm.init()).to.be.fulfilled.notify(done)
		})

		it('Orm init should failed: invalid password', function (done) {
			let optCloned = _.clone(opt)
			optCloned.password = "fail"
			let orm = new Orm(optCloned, repositories)
			orm.loadRepositories()
			expect(orm.init()).to.be.rejectedWith(Error).notify(done)
		})

	


	})



})