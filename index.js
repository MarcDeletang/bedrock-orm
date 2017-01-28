let dbLayer = require('./dbLayer.js')
let repository = require('./repository.js')
let modelLoader = require('./modelLoader.js')
require('./lodashExtend.js').init()

let _ = require('lodash')
let Promise = require('bluebird')

function Orm(config, models, log) {
	this.config = config
	this.models = models
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
	this.log = log
}

Orm.prototype.init = function () {
	return dbLayer.init(this.config).then((res => {
		let repositories = modelLoader.load(this.models, this.log)
		if (this.config.setTrigger == true) {
			return this.setupDatabase(repositories, this.log).then(result => {
				return repositories
			})
		} else {
			console.log('Trigger not set')
			return repositories
		}
	}).bind(this))
}

Orm.prototype.setupDatabase = function (repositories, log) {
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
		let promisesCreate = repositories.reduce((result, repository) => {
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
		let promisesDrop = repositories.reduce((result, repository) => {
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