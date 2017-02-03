'use strict'

var _ = require('lodash')
var squel = require('squel')
var escape = require('pg-escape')

squel.registerValueHandler(Date, function (date) {
	var dateIso = date.toISOString()
	return "'" + dateIso + "'"
})

squel.registerValueHandler('string', function (str) {
	if (str.length == 0)
		return "''"
	return escape.dollarQuotedString(str)
})

module.exports = {
	insert(tableName) {
		return squel.insert().into(tableName)
	},

	select(tableName) {
		return squel.select().from(tableName)
	},

	update(tableName) {
		return squel.update().table(tableName)
	},

	remove(tableName) {
		return squel.remove().from(tableName)
	},

	formatValue(value, model) {
		if (_.isString(value))
			return "'" + value + "'"
		return value
	},

	addColumnsToSelect(repository, query, columnAlias) {
		var columns = repository.getColumns(true)
		var asColumns = repository.getAsColumns(true)

		for (var i = 0; i != columns.length; ++i) {
			query = query.field(columns[i], asColumns[i])
		}
		return query
	},

	addWhere(repository, whereArgs, query) {
		for (var i = 0; i != whereArgs.length; i++) {
			query = query.where(whereArgs[i].column + ' ' + whereArgs[i].operator + ' ' + this.formatValue(whereArgs[i].value))
		}
		return query
	},

	addSet(repository, model, query, useDefault) {
		if (useDefault) {
			for (var field in repository.model) {
				if (!_.has(model, field) && _.has(repository.model[field], 'defaultsTo')) {
					model[field] = repository.model[field].defaultsTo
				}
			}
		}
		for (var field in model) {
			if (_.has(repository.model, field)) {
				var columnName = repository.getColumnName(field, true)
				var value = model[field]
				if (value === null)
					continue
				if (columnName != false) {
					if (value == undefined)
						value = null
					if (repository.isSetable(field))
						query = query.set(columnName, value)
				}
			}
		}
		return query
	},

	addSetArray(repository, datas, query, useDefault) {
		var fieldRows = []
		for (var i = 0; i != datas.length; ++i) {
			var model = datas[i]
			if (useDefault) {
				for (var field in repository.model) {
					if (!_.has(model, field) && _.has(repository.model[field], 'defaultsTo')) {
						model[field] = repository.model[field].defaultsTo
					}
				}
			}
			var fieldRow = {}
			for (var field in model) {
				if (_.has(repository.model, field)) {
					var columnName = repository.getColumnName(field, true)
					var value = model[field]
					if (value === null)
						continue
					if (columnName != false) {
						if (value == undefined)
							value = null
						if (repository.isSetable(field))
							fieldRow[columnName] = value
					}
				}
			}
			fieldRows.push(fieldRow)
		}
		query = query.setFieldsRows(fieldRows)
		return query
	},

	addLimitSkipPaginate(repository, queryObject, query) {
		var tmpQuery = squel.select().field('id').from(repository.tableName)
		if (queryObject.paginate) {
			var offset = queryObject.paginate.page * queryObject.paginate.limit
			var limit = queryObject.paginate.limit
			tmpQuery = tmpQuery.limit(limit).offset(offset)
		} else {
			if (queryObject.limit != null) {
				tmpQuery = tmpQuery.limit(queryObject.limit)
			}
			if (queryObject.skip != null) {
				tmpQuery = tmpQuery.offset(queryObject.skip)
			}
		}
		tmpQuery = this.addWhere(repository, queryObject.where, tmpQuery)
		tmpQuery = this.addSort(repository, queryObject, tmpQuery)
		query = query.where(repository.tableName + '.id IN (' + tmpQuery.toString() + ')')
		return query
	},

	addSort(repository, queryObject, query) {
		if (_.isObject(queryObject.sort)) {
			for (var column in queryObject.sort) {
				if (_.toLower(queryObject.sort[column]) == 'asc')
					query = query.order(repository.tableName + '.' + column)
				else if (_.toLower(queryObject.sort[column] == 'desc'))
					query = query.order(repository.tableName + '.' + column, false)
			}
		} else {
			if (_.isString(queryObject.sort))
				query = query.order(repository.tableName + '.' + queryObject.sort)
		}
		return query
	},

	buildRootQuery(repository, queryObject) {
		var query = this.select(repository.tableName)
		query = this.addColumnsToSelect(repository, query)
		query = this.addLimitSkipPaginate(repository, queryObject, query)
			//query = this.addSort(repository, queryObject, query)
			//query = query.limit(1)
		return query.toString()
	},

	buildChildQuery(pathStack, queryObject, index) {
		var relation = pathStack[index]
		var query = this.select(relation.childRepository.tableName)

		query = this.addColumnsToSelect(relation.childRepository, query)
		for (var i = index; i >= 0; --i) {
			var link = pathStack[i]
				//In this case, no join but use a where clause
			if (relation.parentRepository.tableName == relation.childRepository.tableName)
				console.log('CHILD AND PARENT SAME TABLE')
			query = query.left_join(link.parentRepository.tableName, null, link.primary + ' = ' + link.foreign)
		}
		var rootRepository = pathStack[0].parentRepository

		query = this.addLimitSkipPaginate(rootRepository, queryObject, query)
			//query = this.addSort(rootRepository, queryObject, query)

		return query.toString()
	},

	buildPathQuery(pathStack, queryObject) {
		var res = []

		for (var i = 0; i != pathStack.length; ++i) {
			res.push(this.buildChildQuery(pathStack, queryObject, i))
		}
		return res
	},

	buildFromQueryObject(repository, queryObject) {
		var res = []
		res.push(this.buildRootQuery(repository, queryObject))
		for (var i = 0; i != queryObject.queryStack.length; ++i) {
			res = res.concat(this.buildPathQuery(queryObject.queryStack[i], queryObject))
		}
		return res
	}

}