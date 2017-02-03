var _ = require('lodash')
var db = require('./dbLayer.js')
var queryBuilder = require('./queryBuilder.js')
var dataMapper = require('./dataMapper.js')
var lfManager = require('./lifeCycleManager.js')
var argsParser = require('./argsParser.js')
var ormEx = require('./exceptions.js')
var TransactionObject = require('./transaction.js')

function Repository(modelName, model) {
	//Add the primary key
	model.attributes.id = {
		type: 'integer'
	}
	this.extend = model
	this.modelName = modelName
	this.tableName = '"' + _.toLower(modelName) + '"'
	this.model = {}
	this.modelMethods = {}
	this.autoUpdatedAt = true
	this.autoCreatedAt = true
	//Bind attributes to model, methods to modelMethods
	for (var attrName in model.attributes) {
		if (_.isFunction(model.attributes[attrName]))
			this.modelMethods[attrName] = model.attributes[attrName]
		else
			this.model[attrName] = model.attributes[attrName]
	}
}

Repository.prototype.isValidKey = function (keyName) {
	for (var key in this.model) {
		if (keyName == key || keyName == this.modelName + '.' + key || (_.has(this.model[key], 'columnName') && keyName == this.model[key].columnName) || key == keyName)
			return key
	}
	return false
}

Repository.prototype.isSearchable = function (keyName) {
	for (var key in this.model) {
		if ((keyName == key || keyName == this.modelName + '.' + key) && !_.has(this.model[key], 'collection') /* && !_.has(this.model[key], 'model')*/)
			return this.getColumnName(keyName, false)
	}
	return false
}

Repository.prototype.isSetable = function (keyName) {
	var columnDefinition = this.model[keyName]
	if (columnDefinition) {
		if (!_.has(columnDefinition, 'collection'))
			return true
	}
	return false
}

Repository.prototype.feedFromDB = function (data, model) {
	model = model == null ? {} : model

	//console.log('------------------------------------')
	//console.log('model from db', data)
	//console.log('------------------------------------')
	for (var key in data) {
		var validKey = this.isValidKey(key)


		//BAD
		if (validKey || key == 'updatedAt' || key == 'createdAt') {
			if (key == 'updatedAt')
				validKey = 'updatedAt'
			if (key == 'createdAt')
				validKey = 'createdAt'
			model[validKey] = data[key]
		} else {
			if (_.has(this.modelMethods, key) && _.isFunction(data[key])) {
				model[key] = _.bind(data[key], model)
			}
		}
	}
	for (var key in this.model) {
		if (model[key] == null || model[key] == undefined) {
			if (_.has(this.model[key], 'collection'))
				model[key] = []
			else
				model[key] = null
		}
	}
	model = _.bindMethodsToObject(this.modelMethods, model)
	//console.log('model returned db', model)
	//console.log('------------------------------------')
	return model
}

Repository.prototype.getColumnName = function (field, hideTableName) {
	if (_.has(this.model, 'field'))
		return false
	if (_.has(this.model[field], 'columnName')) {
		if (hideTableName)
			return '"' + this.model[field].columnName + '"'
		else
			return this.tableName + '."' + this.model[field].columnName + '"'
	}
	if (hideTableName)
		return '"' + field + '"'
	else
		return this.tableName + '."' + field + '"'
}

Repository.prototype.getColumns = function (hideCollection) {
	hideCollection = hideCollection == null ? true : hideCollection
	var res = []

	for (var key in this.model) {
		if (_.has(this.model[key], 'collection') && hideCollection)
			continue
		res.push(_.has(this.model[key], 'columnName') ? this.tableName + '."' + this.model[key].columnName + '"' : this.tableName + '."' + key + '"')
	}
	return res
}

Repository.prototype.getAsColumns = function (hideCollection, columnAlias) {
	hideCollection = hideCollection == null ? true : hideCollection
	var res = []

	for (var key in this.model) {
		if (_.has(this.model[key], 'collection') && hideCollection)
			continue
		if (columnAlias != null)
			res.push(columnAlias + '.' + key)
		else
			res.push(key)
	}
	return res
}

Repository.prototype._create = function (data, transactionObj) {
	try {
		return new Promise(((resolve, reject) => {
			var onCallBeforeCreate = (res => { return res }).bind(this)
			var onCallAfterValidate = (res => { lfManager.callBeforeCreate(this.modelName, data) }).bind(this)
			var onCallBeforeValidate = (res => { return lfManager.callAfterValidate(this.modelName, data) }).bind(this)

			lfManager.callBeforeCreate(this.model, data).then(onCallBeforeValidate).then(onCallAfterValidate).then(onCallBeforeCreate).then((res => {
				var query = queryBuilder.insert(this.tableName)
				//Compare prop with model, handle special cases (ex: oneToMany)

				query = queryBuilder.addSet(this, data, query, true)
				var queryString = query.toString() + ' RETURNING id'

				var onCreate = (result => {
					if (result.rowCount == 1) {
						//Cleanup undefined
						data = this.feedFromDB(result.rows[0], data)
						data = _.bindMethodsToObject(this.modelMethods, data)
						data.id = result.rows[0].id
						return resolve(data)
					}
					console.log('WEIRD CREATE', data)
					return resolve(data)
				}).bind(this)

				if (transactionObj != null)
					transactionObj.query(queryString).then(onCreate)
				else
					db.query(queryString).then(onCreate)


			}).bind(this))

		}).bind(this))
	} catch (e) {
		if (e && e.code) {
			//This cannot stay here
			if (e.code == 23505) {
				throw new ormEx.uniqueViolationException(e.detail)
			}
		}
		if (Bedrock.env == 'prod') {
			delete e.file
			delete e.line
		}
		throw e
	}
}

Repository.prototype.createArray = function (datas, transactionObj) {
	try {
		if (datas == null || !datas.length)
			return []
		return new Promise(((resolve, reject) => {
			var onCallBeforeCreate = (res => { return res }).bind(this)
			var onCallAfterValidate = (res => { lfManager.callBeforeCreate(this.modelName, data) }).bind(this)
			var onCallBeforeValidate = (res => { return lfManager.callAfterValidate(this.modelName, data) }).bind(this)

			lfManager.callBeforeCreate(this.model, datas).then(onCallBeforeValidate).then(onCallAfterValidate).then(onCallBeforeCreate).then((res => {

				var query = queryBuilder.insert(this.tableName)
				//Compare prop with model, handle special cases (ex: oneToMany)

				query = queryBuilder.addSetArray(this, datas, query, true)
				var queryString = query.toString() + ' RETURNING id'

				var onCreate = (result => {
					if (result.rows.length != datas.length)
						throw 'WEIRD CREATE DEV'
					for (var i = 0; i != result.rows.length; ++i) {
						var data = datas[i]
						data = _.bindMethodsToObject(this.modelMethods, data)
						data.id = result.rows[i].id
					}
					return resolve(datas)
				}).bind(this)

				if (transactionObj != null)
					transactionObj.query(queryString).then(onCreate)
				else
					db.query(queryString).then(onCreate)

			}).bind(this)).catch(error => {
				reject(error)
			})
		}).bind(this))
	} catch (e) {
		//Bedrock.log.error('Repository.create', e.stack)
		throw e
	}
}

Repository.prototype.create = function (data, transactionObj) {
	//Add transaction and rollback on error
	try {
		if (_.isArray(data)) {
			return this.createArray(data, transactionObj)
		} else {
			return this._create(data, transactionObj)
		}
	} catch (e) {
		//Bedrock.log.error('Repository.create', e.stack)
		throw e
	}
}

Repository.prototype._find = function (criteria) {
	try {
		var query = queryBuilder.select(this.tableName)
		query = queryBuilder.addWhere(this, argsParser.getCriteria(this, criteria), query)
		query = query.limit(200)
		var queryString = query.toString()

		//console.log('Query _find', queryString)
		return db.query(queryString).then((result => {
			var res = []
			for (var i = 0; i != result.rows.length; ++i) {
				res.push(this.feedFromDB(result.rows[i]))
			}
			return res
		}).bind(this))
	} catch (e) {
		//Bedrock.log.error('Repository._find', e.stack)
		throw e
	}
}

Repository.prototype.find = function (criteria, optArgs) {
	try {
		//No deep populate
		if (optArgs == null)
			return this._find(criteria)

		var queryObject = argsParser.parseAndValidate(this, criteria, optArgs)
		queryObject.queryStack = argsParser.extractStack(this, optArgs.populate)
		var queries = queryBuilder.buildFromQueryObject(this, queryObject)
		//console.log(queries)
		//console.log('=====================================================')
		var promises = _.transform(queries, function (acc, q) {
			//console.log(q)
			acc.push(db.query(q))
		}, [])

		return Promise.all(promises).then((results => {
			results = results.map(function (obj) {
				return obj.rows
			})
			return dataMapper.mergeArrays(results, queryObject.queryStack, true, this)
		}).bind(this))

	} catch (e) {
		//Bedrock.log.error('Repository.find', e.stack)
		throw e
	}
}

Repository.prototype._findOne = function (criteria) {
	try {
		var query = queryBuilder.select(this.tableName)
		query = queryBuilder.addWhere(this, argsParser.getCriteria(this, criteria), query)
		query = query.limit(1)
		var queryString = query.toString()
		return db.query(queryString).then((data => {
			if (data.rowCount == 1) {
				data = this.feedFromDB(data.rows[0])
				return data
			}
			return null
		}).bind(this))

	} catch (e) {
		//Bedrock.log.error('Repository.findOne', e.stack)
		throw e
	}
}

Repository.prototype.findOne = function (criteria, optArgs) {
	try {
		//No deep populate
		if (optArgs == null)
			return this._findOne(criteria)

		var queryObject = argsParser.parseAndValidate(this, criteria, optArgs)
		queryObject.queryStack = argsParser.extractStack(this, optArgs.populate)
		var querys = queryBuilder.buildFromQueryObject(this, queryObject)
		var promises = _.transform(querys, function (acc, q) {
			acc.push(db.query(q))
		}, [])
		//console.log('queries', querys)

		return Promise.all(promises).then((results => {
			results = results.map(obj => {
				return obj.rows
			})
			return dataMapper.mergeArrays(results, queryObject.queryStack, false, this)
		}).bind(this))


		//console.log('RESULTS FROM DB', results)
	} catch (e) {
		//Bedrock.log.error('Repository.findOnePopulated', e)
		throw e
	}
}

Repository.prototype.update = function (criteria, data, transactionObj) {
	try {
		var query = queryBuilder.update(this.tableName)

		query = queryBuilder.addSet(this, data, query, false)
		query = queryBuilder.addWhere(this, argsParser.getCriteria(this, criteria), query)

		var queryString = query.toString()
		var result = []
		if (transactionObj != null)
			return transactionObj.query(queryString).then(result => {
				return result.rowCount
			})
		else
			return db.query(queryString).then(result => {
				return result.rowCount
			})
	} catch (e) {
		//Bedrock.log.error('Repository.update', e.stack)
		throw e
	}
}


Repository.prototype.remove = function (criteria, transactionObj) {
	try {
		var query = queryBuilder.remove(this.tableName)
		for (var field in criteria) {
			if (_.has(this.model, field) || field == 'id') {
				var value = criteria[field]
				if (_.isString(value))
					value = "'" + value + "'"
				query = query.where('"' + field + '"=' + value)
			}
		}
		var queryString = query.toString()
		var result = []
		if (transactionObj != null) {
			return transactionObj.query(queryString).then(result => {
				return result.rowCount
			})
		} else
			return db.query(queryString).then(result => {
				return result.rowCount
			})
	} catch (e) {
		Bedrock.log.error('Repository.remove', e.stack)
		throw e
	}
}

//Does not support transaction !
Repository.prototype.count = function (criteria) {
	var query = queryBuilder.select(this.tableName)
	query = queryBuilder.addWhere(this, argsParser.getCriteria(this, criteria), query)

	var queryString = query.toString()
	queryString = queryString.replace('*', 'count(*)')
	return db.query(queryString).then(result => {
		result = result.rows[0].count
		result = _.toInteger(result)
		return result
	})
}

Repository.prototype.startTransaction = function () {
	return new Promise((resolve, reject) => {
		var transactionObj = new TransactionObject()
		transactionObj.start().then(result => {
			resolve(transactionObj)
		}, err => {
			reject(err)
		})
	})
}

Repository.validate = function (data) {
	return true
}

module.exports = Repository