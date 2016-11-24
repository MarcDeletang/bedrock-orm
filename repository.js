var _ = require('lodash')
var db = require('./dbLayer.js')
var queryBuilder = require('./queryBuilder.js')
var dataMapper = require('./dataMapper.js')
var lfManager = require('./lifeCycleManager.js')
var argsParser = require('./argsParser.js')
var ormEx = require('./exceptions.js')

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
		if ((keyName == key || keyName == this.modelName + '.' + key) && !_.has(this.model[key], 'collection') /* && !_.has(this.model[key], 'model')*/ )
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

Repository.prototype._create = async function (data, transactionObj) {
	try {
		await lfManager.callBeforeValidate(this.modelName, data)
			//Quick validation
		await lfManager.callAfterValidate(this.modelName, data)
		await lfManager.callBeforeCreate(this.modelName, data)

		var query = queryBuilder.insert(this.tableName)
			//Compare prop with model, handle special cases (ex: oneToMany)

		query = queryBuilder.addSet(this, data, query, true)
		var queryString = query.toString() + ' RETURNING id'
		var result = []
		if (transactionObj != null)
			result = await transactionObj.query(queryString)
		else
			result = await db.query(queryString)

		if (result.rowCount == 1) {
			//Cleanup undefined
			data = this.feedFromDB(result.rows[0], data)
			data = _.bindMethodsToObject(this.modelMethods, data)
			data.id = result.rows[0].id
			return data
		}
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!', result)
		console.log('Repository._create IS SUPER WEIRD')
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
		return data
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

Repository.prototype.createArray = async function (datas, transactionObj) {
	try {
		if (datas == null || !datas.length)
			return []
		for (var i = 0; i != datas.length; ++i) {
			var data = datas[i]
			await lfManager.callBeforeValidate(this.modelName, data)
				//Quick validation
			await lfManager.callAfterValidate(this.modelName, data)
			await lfManager.callBeforeCreate(this.modelName, data)
		}



		var query = queryBuilder.insert(this.tableName)
			//Compare prop with model, handle special cases (ex: oneToMany)

		query = queryBuilder.addSetArray(this, datas, query, true)
		var queryString = query.toString() + ' RETURNING id'
		var result = []
		if (transactionObj != null)
			result = await transactionObj.query(queryString)
		else
			result = await db.query(queryString)
		if (result.rows.length != datas.length)
			throw 'WEIRD CREATE DEV'
		for (var i = 0; i != result.rows.length; ++i) {
			var data = datas[i]
			data = _.bindMethodsToObject(this.modelMethods, data)
			data.id = result.rows[i].id
		}
		return datas
	} catch (e) {
		//Bedrock.log.error('Repository.create', e.stack)
		throw e
	}
}

Repository.prototype.create = async function (data, transactionObj) {
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

Repository.prototype._find = async function (criteria) {
	try {
		var query = queryBuilder.select(this.tableName)
		query = queryBuilder.addWhere(this, argsParser.getCriteria(this, criteria), query)
		query = query.limit(10)
		var queryString = query.toString()

		//console.log('Query _find', queryString)
		var result = await db.query(queryString)
			//console.log('results', result)
		var res = []
		for (var i = 0; i != result.rows.length; ++i) {
			res.push(this.feedFromDB(result.rows[i]))
		}
		return res
	} catch (e) {
		//Bedrock.log.error('Repository._find', e.stack)
		throw e
	}
}

Repository.prototype.find = async function (criteria, optArgs) {
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
		var results = (await Promise.all(promises)).map(function (obj) {
			return obj.rows
		})
		return dataMapper.mergeArrays(results, queryObject.queryStack, true, this)
	} catch (e) {
		//Bedrock.log.error('Repository.find', e.stack)
		throw e
	}
}

//Optimizd findOne
Repository.prototype._findOne = async function (criteria) {
	try {
		var query = queryBuilder.select(this.tableName)
		query = queryBuilder.addWhere(this, argsParser.getCriteria(this, criteria), query)
		query = query.limit(1)
		var queryString = query.toString()
		var data = await db.query(queryString)
		if (data.rowCount == 1) {
			data = this.feedFromDB(data.rows[0])
			return data
		}
		return null
	} catch (e) {
		//Bedrock.log.error('Repository.findOne', e.stack)
		throw e
	}
}

Repository.prototype.findOne = async function (criteria, optArgs) {
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
		var results = (await Promise.all(promises)).map(function (obj) {
				return obj.rows
			})
			//console.log('RESULTS FROM DB', results)
		return dataMapper.mergeArrays(results, queryObject.queryStack, false, this)
	} catch (e) {
		//Bedrock.log.error('Repository.findOnePopulated', e)
		throw e
	}
}

Repository.prototype.update = async function (criteria, data, transactionObj) {
	try {
		var query = queryBuilder.update(this.tableName)

		query = queryBuilder.addSet(this, data, query, false)
		query = queryBuilder.addWhere(this, argsParser.getCriteria(this, criteria), query)

		var queryString = query.toString()
		var result = []
		if (transactionObj != null)
			result = await transactionObj.query(queryString)
		else
			result = await db.query(queryString)
		return result.rowCount
	} catch (e) {
		//Bedrock.log.error('Repository.update', e.stack)
		throw e
	}
}


Repository.prototype.remove = async function (criteria, transactionObj) {
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
			result = await transactionObj.query(queryString)
		} else
			result = await db.query(queryString)
		return result.rowCount
	} catch (e) {
		Bedrock.log.error('Repository.remove', e.stack)
		throw e
	}
}

Repository.prototype.count = async function (criteria) {
	try {
		var query = queryBuilder.select(this.tableName)
		query = queryBuilder.addWhere(this, argsParser.getCriteria(this, criteria), query)

		var queryString = query.toString()
		queryString = queryString.replace('*', 'count(*)')
		var result = []
		result = await db.query(queryString)
		result = result.rows[0].count
		result = _.toInteger(result)
		return result
	} catch (e) {
		throw e
	}
}

Repository.prototype.startTransaction = async function () {
	var transactionObj = new TransactionObject()
	await transactionObj.start()
	return transactionObj
}

Repository.validate = function (data) {
	return true
}

//Get a client from pool, passed to repositories to use transactions
//Each client is closed after commit/rollback for now
function TransactionObject() {
	this.client = null
}

TransactionObject.prototype.start = async function (query) {
	if (this.client != null && this.client != 42 && this.client != 43)
		throw 'Start transaction can only be call once before commit/rollback'
	this.client = await db.getClient()
	await this.client.query('BEGIN;')
}

TransactionObject.prototype.commit = async function (query) {
	if (this.client == null)
		throw 'Cannot commit before start transaction'
	if (this.client == 42)
		throw 'Cannot commit twice'
	if (this.client == 43)
		throw 'Cannot commit after rollback'
	await this.client.query('COMMIT;')
	this.client.release()
	this.client = 42
}

TransactionObject.prototype.rollback = async function (query) {
	if (this.client == null)
		throw 'Cannot rollback before start transaction'
	if (this.client == 42)
		throw 'Cannot rollback twice'
	if (this.client == 43)
		throw 'Cannot rollback after commit'
	try {
		await this.client.query('ROLLBACK;')
		this.client.release()
	} catch (e) {
		Bedrock.log.error('Fatal error rollback !!')
	}
	this.client = 43
}

TransactionObject.prototype.query = function (query) {
	if (this.client == null)
		throw 'Cannot execute query before start transaction'
	if (this.client == 42)
		throw 'Cannot execute query after commit'
	if (this.client == 43)
		throw 'Cannot execute query after rollback'
	var that = this
		//This is super weird, but necessary to actually send an error to the caller
	return new Promise(function (resolve, reject) {
		var res = that.client.query(query).then(function (result) {
			resolve(result)
		}).catch(function (err) {
			reject(err)
		})
	})
}

module.exports = Repository