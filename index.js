require('./src/lodashExtend.js').init()

const repository = require('./src/repository.js')
const orm = require('./src/orm.js')

module.exports.Orm = orm
module.exports.Repository = repository