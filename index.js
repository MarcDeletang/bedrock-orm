var dbLayer = require('./dbLayer.js')
var repository = require('./repository.js')
var modelLoader = require('./modelLoader.js')
require('./lodashExtend.js').init()

var _ = require('lodash')

function Orm(config, models, bedrock) {
	this.config = config
	this.models = models
	this.bedrock = bedrock
}

Orm.prototype.init = function () {
	dbLayer.init(this.config)
	var repositories = modelLoader.load(this.models, this.bedrock)
	if (this.config.setTrigger == true) {
		this.setupDatabase(repositories, this.bedrock)
	} else {
		console.log('Trigger not set')
	}
}

Orm.prototype.setupDatabase = async function (repositories, bedrock) {
	var queryFunctionAutoCreated = 'CREATE OR REPLACE FUNCTION update_created_column()\
	RETURNS TRIGGER AS $$\
	BEGIN\
	NEW."createdAt" = now();\
	RETURN NEW;\
	END;\
	$$ language \'plpgsql\';'
	var queryFunctionAutoUpdated = 'CREATE OR REPLACE FUNCTION update_modified_column()\
	RETURNS TRIGGER AS $$\
	BEGIN\
	NEW."updatedAt" = now();\
	RETURN NEW;\
	END;\
	$$ language \'plpgsql\';'
	var rawQueryDropOldCreatedAt = 'DROP TRIGGER trigger_create_{modelName} ON {tableName};'
	var rawQueryDropOldUpdatedAt = 'DROP TRIGGER trigger_update_{modelName} ON {tableName};'
	var rawQueryAutoCreatedAt = 'CREATE TRIGGER {triggerName} BEFORE INSERT ON {tableName} FOR EACH ROW EXECUTE PROCEDURE update_created_column();'
	var rawQueryAutoUpdatedAt = 'CREATE TRIGGER {triggerName} BEFORE UPDATE ON {tableName} FOR EACH ROW EXECUTE PROCEDURE update_modified_column();'

	try {
		await this.query(queryFunctionAutoCreated)
		await this.query(queryFunctionAutoUpdated)
	} catch (e) {
		bedrock.log.error('Orm.setupDatabase', e)
	}

	for (var i = 0; i != repositories.length; ++i) {
		var queryDropOldCreatedAt = rawQueryDropOldCreatedAt.replace('{modelName}', _.toLower(repositories[i].modelName)).replace('{tableName}', repositories[i].tableName)
		var queryDropOldUpdatedAt = rawQueryDropOldUpdatedAt.replace('{modelName}', _.toLower(repositories[i].modelName)).replace('{tableName}', repositories[i].tableName)
		var queryAutoCreatedAt = rawQueryAutoCreatedAt.replace('{triggerName}', 'trigger_create_' + _.toLower(repositories[i].modelName)).replace('{tableName}', repositories[i].tableName)
		var queryAutoUpdatedAt = rawQueryAutoUpdatedAt.replace('{triggerName}', 'trigger_update_' + _.toLower(repositories[i].modelName)).replace('{tableName}', repositories[i].tableName)
		try {
			if (repositories[i].autoCreatedAt)
				await this.query(queryDropOldCreatedAt)
		} catch (e) {}
		try {
			if (repositories[i].autoUpdatedAt)
				await this.query(queryDropOldUpdatedAt)
		} catch (e) {}
		try {
			if (repositories[i].autoCreatedAt)
				await this.query(queryAutoCreatedAt)
		} catch (e) {}
		try {
			if (repositories[i].autoUpdatedAt)
				await this.query(queryAutoUpdatedAt)
		} catch (e) {}
	}
	this.bedrock.log.info('Orm loaded')
}

Orm.prototype.query = function (query) {
	return dbLayer.query(query)
}

module.exports = Orm