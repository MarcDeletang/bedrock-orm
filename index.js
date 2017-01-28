const dbLayer = require('./dbLayer.js')
const repository = require('./repository.js')
const repositoryLoader = require('./repositoryLoader.js')
require('./lodashExtend.js').init()

const _ = require('lodash')
const Promise = require('bluebird')

function setConfig(config, log) {
	if (config == null)
		throw new Error('ConfigError: No config')
	let result = {
		host: '127.0.0.1',
		port: 5432,
		max: 100,
		idleTimeoutMillis: 500,
		setTrigger: false,
		setGlobal: false
	}
	if (_.isString(config.database))
		result.database = config.database
	else
		throw new Error('ConfigError: No database')
	if (_.isString(config.user))
		result.user = config.user
	else
		throw new Error('ConfigError: No user')
	if (_.isString(config.password))
		result.password = config.password
	else
		throw new Error('ConfigError: No password')
	if (_.isString(config.host))
		result.host = config.host
	else
		log.warn('ConfigError: Invalid host, default to', result.host)
	if (_.isNumber(config.port))
		result.port = config.port
	else
		log.warn('ConfigError: Invalid port, default to', result.port)
	if (_.isNumber(config.max))
		result.max = config.max
	else
		log.warn('ConfigError: Invalid max, default to', result.max)
	if (_.isNumber(config.idleTimeoutMillis))
		result.idleTimeoutMillis = config.idleTimeoutMillis
	else
		log.warn('ConfigError: Invalid idleTimeoutMillis, default to', result.idleTimeoutMillis)
	if (_.isBoolean(config.setTrigger))
		result.setTrigger = config.setTrigger
	else
		log.warn('ConfigError: Invalid setTrigger, default to', result.setTrigger)
	if (_.isBoolean(config.setGlobal))
		result.setGlobal = config.setGlobal
	else
		log.warn('ConfigError: Invalid setGlobal, default to', result.setGlobal)
	return result
}

function Orm(config, models, log) {
	if (log == null) {
		this.log = {
			info: function (...message) {
				console.log(...message)
			},
			warn: function (...message) {
				console.log(...message)
			},
			error: function (...message) {
				console.log(...message)
			}
		}
	}
	else
		this.log = log
	this.config = setConfig(config, this.log)
	this.models = models
	this.repositories = null
}

Orm.prototype.loadRepositories = function () {
	this.repositories = repositoryLoader.load(this.models, this.config.setGlobal, this.log)
}

Orm.prototype.init = function () {
	if (this.repositories == null)
		throw new Error('InitError: cannot init before loadRepositories')
	return dbLayer.init(this.config).then((res => {
		if (this.config.setTrigger == true) {
			return this.setupDatabase().then(result => {
				return this.repositories
			})
		} else {
			console.log('Trigger not set')
			return this.repositories
		}
	}).bind(this))
}

Orm.prototype.setupDatabase = function () {
	const queryFunctionAutoCreated = `CREATE OR REPLACE FUNCTION update_created_column()
	RETURNS TRIGGER AS $$
	BEGIN
	NEW."createdAt" = now();
	RETURN NEW;
	END;
	$$ language 'plpgsql';`
	const queryFunctionAutoUpdated = `CREATE OR REPLACE FUNCTION update_modified_column()
	RETURNS TRIGGER AS $$
	BEGIN
	NEW."updatedAt" = now();
	RETURN NEW;
	END;
	$$ language 'plpgsql';`

	let startCreate = (result => {
		console.log('finished drop')
		console.log('started create')
		let promisesCreate = this.repositories.reduce((result, repository) => {
			let rawQueryAutoCreatedAt = 'CREATE TRIGGER {triggerName} BEFORE INSERT ON {tableName} FOR EACH ROW EXECUTE PROCEDURE update_created_column();'
			let rawQueryAutoUpdatedAt = 'CREATE TRIGGER {triggerName} BEFORE UPDATE ON {tableName} FOR EACH ROW EXECUTE PROCEDURE update_modified_column();'
			if (repository.autoCreatedAt)
				result.push(this.query(rawQueryAutoCreatedAt.replace('{triggerName}', 'trigger_create_' + _.toLower(repository.modelName)).replace('{tableName}', repository.tableName)))
			if (repository.updatedAt)
				result.push(this.query(rawQueryAutoUpdatedAt.replace('{triggerName}', 'trigger_create_' + _.toLower(repository.modelName)).replace('{tableName}', repository.tableName)))
			return result
		}, [])
		return Promise.all(promisesCreate)
	}).bind(this)

	let startDrop = (result => {
		console.log('started drop')
		let promisesDrop = this.repositories.reduce((result, repository) => {
			let rawQueryDropOldCreatedAt = 'DROP TRIGGER trigger_create_{modelName} ON {tableName};'
			let rawQueryDropOldUpdatedAt = 'DROP TRIGGER trigger_update_{modelName} ON {tableName};'
			if (repository.autoCreatedAt)
				result.push(this.query(rawQueryDropOldCreatedAt.replace('{modelName}', _.toLower(repository.modelName)).replace('{tableName}', repository.tableName)))
			if (repository.updatedAt)
				result.push(this.query(rawQueryDropOldUpdatedAt.replace('{triggerName}', 'trigger_create_' + _.toLower(repository.modelName)).replace('{tableName}', repository.tableName)))
			return result
		}, [])
		return Promise.all(promisesDrop)
	}).bind(this)

	return Promise.all([this.query(queryFunctionAutoCreated), this.query(queryFunctionAutoUpdated)]).then(startDrop).catch(err => {
		//We don't care here
		return Promise.resolve('continue')
	}).then(startCreate)
}

Orm.prototype.query = function (query) {
	return dbLayer.query(query)
}

module.exports = Orm