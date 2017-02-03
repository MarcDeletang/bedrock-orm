var Repository = require('../repository.js')
var db = require('../dbLayer.js')
var queryBuilder = require('../queryBuilder.js')
var dataMapper = require('../dataMapper.js')
var lfManager = require('../lifeCycleManager.js')
var argsParser = require('../argsParser.js')
var ormEx = require('../exceptions.js')
var TransactionObject = require('../transaction.js')
var Promise = require('bluebird')
var _ = require('lodash')

// module.exports = function (Repository) {
    console.log('QUERIES CREATE CALLED')
    Repository.prototype._create = function (data, transactionObj) {
        try {
            return new Promise((resolve, reject) => {
                var onCallBeforeCreate = res => { return res }
                var onCallAfterValidate = res => { lfManager.callBeforeCreate(this.modelName, data) }
                var onCallBeforeValidate = res => { return lfManager.callAfterValidate(this.modelName, data) }

                lfManager.callBeforeCreate(this.model, data).then(onCallBeforeValidate).then(onCallAfterValidate).then(onCallBeforeCreate).then(res => {
                    var query = queryBuilder.insert(this.tableName)
                    //Compare prop with model, handle special cases (ex: oneToMany)

                    query = queryBuilder.addSet(this, data, query, true)
                    var queryString = query.toString() + ' RETURNING id'

                    var onCreate = result => {
                        if (result.rowCount == 1) {
                            //Cleanup undefined
                            data = this.feedFromDB(result.rows[0], data)
                            data = _.bindMethodsToObject(this.modelMethods, data)
                            data.id = result.rows[0].id
                            return resolve(data)
                        }
                        console.log('WEIRD CREATE', data)
                        return resolve(data)
                    }

                    if (transactionObj != null)
                        transactionObj.query(queryString).then(onCreate)
                    else
                        db.query(queryString).then(onCreate)


                })

            })
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

                //lfManager.callBeforeCreate(this.model, datas).then(onCallBeforeValidate).then(onCallAfterValidate).then(onCallBeforeCreate).then((() => {

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
            //}).bind(this))
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
// }
