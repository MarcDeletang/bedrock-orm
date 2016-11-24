'use strict'

var Repository = require('./repository.js')
var lifeCycleManager = require('./lifeCycleManager.js').init()
var _ = require('lodash')

module.exports = {

	load(models, bedrock){
		try{
			var repositories = []
			for (var modelName in models){
				repositories.push(new Repository(modelName, models[modelName]))
			}
			for (var i = 0; i != repositories.length; ++i){
				if (repositories[i].modelName == 'User'){
					repositories[i]
				}
				this.loadExtend(repositories[i], bedrock)
				global[repositories[i].modelName] = repositories[i]
			}
			return repositories
		}
		catch (e){
			bedrock.log.error('modelLoader.load', e.stack)
		}
	},

	loadExtend(repository, bedrock){
		for (var key in repository.extend){
			if (_.has(lifeCycleManager.callbacksHandlers, key)){
				lifeCycleManager.callbacksHandlers[key](repository.modelName, repository.extend[key])
				continue
			}
			if (key == 'tableName'){
				if (!_.isString(repository.extend[key])){
					bedrock.log.warn('Invalid table name for repository: ' + repository.modelName + ' (Must be a string)')
					continue
				}
				repository.tableName = '"' + repository.extend[key] + '"'
			}
			if (key == 'autoCreatedAt'){
				if (!_.isBoolean(repository.extend[key])){
					bedrock.log.warn('Invalid field autoCreatedAt for repository: ' + repository.modelName + ' (Must be a boolean)')
					continue
				}
				repository.autoCreatedAt = repository.extend[key]
			}
			if (key == 'autoUpdatedAt'){
				if (!_.isBoolean(repository.extend[key])){
					bedrock.log.warn('Invalid field autoUpdatedAt for repository: ' + repository.modelName + ' (Must be a boolean)')
					continue
				}
				repository.autoUpdatedAt = repository.extend[key]
			}
			if (_.isFunction(repository.extend[key])){
				if (_.hasIn(repository, key)){
					bedrock.log.warn('Cannot add method: ' + key + ' for repository: ' + repository.modelName + ' (Already binded)')
					continue
				}
				repository[key] = _.bind(repository[key], repository.extend[key])
			}
		}
	}
}