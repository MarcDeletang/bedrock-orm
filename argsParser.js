var _ = require('lodash')
var whereRules = require('./whereRules.js')

module.exports = {
	//Check if the string is valid with properties in repositories
	// return [{ repository, childRepository, childMatchKey, parentMatchKey, primary, foreign, relationType, parentRelationName }}
	checkPath(repository, path, arr){
		var split = _.split(path, '.')
		var key = split[0]

		//Init on first loop (recursive)
		if (arr == null)
			arr = []
		//Check is source has the valid selected path
		if (_.has(repository.model, key) && _.isObject(repository.model[key]) && (_.has(repository.model[key], 'model') || _.has(repository.model[key], 'collection'))){
			var child = repository.model[key]
			var modelType = child.model == null ? child.collection : child.model
			var targetRepository = global[_.upperFirstLetter(modelType)]
			var primary = null
			var foreign = null
			var relationType = null
			var childMatchKey = null
			var parentMatchKey = null

			//This side has the foreign key
			if (_.has(child, 'model')){
				if (!_.has(child, 'columnName'))
					throw new Error('Invalid model definition (no columnName set on model)' + JSON.stringify(child))
				parentMatchKey = key
				childMatchKey = 'id'
				primary = repository.tableName + '.' + child.columnName
				foreign = targetRepository.tableName + '."id"'
				relationType = 'model'
			}
			//This side has the collection (foreign)
			else if (_.has(child, 'collection')){
				primary = repository.tableName + '."id"'
				if (!_.has(child, 'via'))
					throw new Error('Invalid model definition (no via set on collection)' + JSON.stringify(child))
				if (!_.has(targetRepository.model, child.via))
					throw new Error('Invalid model definition (no via linked to nothing)' + JSON.stringify(child))
				if (_.has(targetRepository.model[child.via], 'collection')){
					console.log('many to many')
				}
				else{
					foreign = targetRepository.model[child.via].columnName
					childMatchKey = child.via
					parentMatchKey = 'id'
					foreign = targetRepository.tableName + '."' + foreign + '"'
					relationType = 'collection'
				}
			}
			arr.push({ parentRepository: repository, childRepository: targetRepository, childMatchKey: childMatchKey, parentMatchKey: parentMatchKey, primary: primary, foreign : foreign, relationType: relationType, parentRelationName: key })
			if (split.length == 1){
				//arr.push({ repository: targetRepository, childRepository: null, parentMatchKey: null })
				return arr
			}
			split.shift()
			var newPath = _.join(split, '.')
			return this.checkPath(targetRepository, newPath, arr)
		}
		else
			return false
	},

	extractStack(repository, optArgs){
		var queryStack = []

		if (optArgs == null || optArgs.length == null)
			return []


		for (var i = 0; i != optArgs.length; ++i){
			//Handle simple string
			if (_.isString(optArgs[i])){
				var stack = this.checkPath(repository, optArgs[i])
				if (stack && _.indexOfObject(queryStack, stack) == -1){
					queryStack.push(stack)
				}
			}
			//Should handle objects later
		}
		return queryStack
	},

	getCriteria(repository, criteria){
		var res = []

		for (var fieldName in criteria){
			var columnName = repository.isSearchable(fieldName)

			if (columnName){
				res.push({ column: columnName, operator: '=', value: criteria[fieldName] })
			}
			else
				Bedrock.log.warn('Invalid criteria field:', fieldName)
		}
		return res
	},

	getWhereElem(repository, fieldName, criteria){
		var columnName = repository.isSearchable(fieldName)
		var res = []
		if (columnName){
			for (var operator in criteria){
				var value = criteria[operator]
				if (_.has(whereRules.operators, operator)){
					res.push({ column: columnName, operator: whereRules.operators[operator], value: value })
				}
				else
					Bedrock.log.warn('Invalid search operator', operator)
			}
		}
		else
			Bedrock.log.warn('Invalid search property', fieldName)
		return res
	},

	getWhere(repository, criteria, args){
		var res = []

		if (!_.isArray(args.where)){
			for (var field in args.where){
				var elems = this.getWhereElem(repository, field, args.where[field])
				res = res.concat(elems)
			}
		}
		else{
			for (var i = 0; i != args.where.length; ++i){
				for (var field in args.where[i]){
					var elems = this.getWhereElem(repository, field, args.where[i][field])
					res = res.concat(elems)
				}
			}
		}
		res = res.concat(this.getCriteria(repository, criteria))
		return res
	},

	parseAndValidate(repository, criteria, args){
		var res = {}

		res.queryStack = this.extractStack(repository, args.populate)
		//Bad
		res.sort = args.sort != null ? args.sort : {}
		res.limit = (args.limit != null && _.isNumber(args.limit)) ? args.limit : null
		res.skip = (args.skip != null && _.isNumber(args.skip)) ? args.skip : null
		res.paginate = (args.paginate != null && _.has(args.paginate, 'page') && _.has(args.paginate, 'limit')
			&& _.isNumber(args.paginate.page) && _.isNumber(args.paginate.limit)) ? args.paginate : null
		if (res.paginate != null){
			if (res.limit != null || res.skip != null)
				Bedrock.log.warn('Ignore limit and skip if paginate is set: ', repository.modelName)
			res.limit = null
			res.skip = null
		}
		res.where = this.getWhere(repository, criteria, args)
		return res
	},



}