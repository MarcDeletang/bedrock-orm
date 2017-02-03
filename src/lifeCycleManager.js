const _ = require('lodash')
var beforeValidateCallbacks = []
var afterValidateCallbacks = []
var beforeCreateCallbacks = []
var afterCreateCallbacks = []


var callbacks = {
	create: { beforeValidateCallbacks: [], afterValidateCallbacks: [], beforeCreateCallbacks: [], afterCreateCallbacks: [] },
	update: { beforeValidateCallbacks: [], afterValidateCallbacks: [], beforeUpdateCallbacks: [], afterUpdateCallbacks: [] },
	destroy: { beforeDestroy: [], afterDestroy: [] },
}

module.exports = {
	init() {
		this.callbacksHandlers = {
			beforeValidate: this.registerBeforeValidateCallback,
			afterValidate: this.registerAfterValidateCallbacks,
			beforeCreate: this.registerBeforeCreateCallbacks,
			afterCreate: this.registerAfterCreateCallbacks
		}
		return this
	},

	registerBeforeValidateCallback(modelName, method) {
		beforeValidateCallbacks.push({ modelName: modelName, method: method })
	},

	registerAfterValidateCallbacks(modelName, method) {
		afterValidateCallbacks.push({ modelName: modelName, method: method })
	},

	registerBeforeCreateCallbacks(modelName, method) {
		beforeCreateCallbacks.push({ modelName: modelName, method: method })
	},

	registerAfterCreateCallbacks(modelName, method) {
		afterCreateCallbacks.push({ modelName: modelName, method: method })
	},

	callBeforeValidate(modelName, data) {
		var callbacks = _(beforeValidateCallbacks)
			.filter(c => c.modelName == modelName)
			.map(c => c.method)
			.value()
		if (_.isArray(data))
			throw 'NOT IMPLEMENTED'
		return _.applyEachSeries(callbacks, data)
	},

	callAfterValidate(modelName, data) {
		var callbacks = _(afterValidateCallbacks)
			.filter(c => c.modelName == modelName)
			.map(c => c.method)
			.value()
		if (_.isArray(data))
			throw 'NOT IMPLEMENTED'
		return _.applyEachSeries(callbacks, data)
	},

	callBeforeCreate(modelName, data) {
		var callbacks = _(beforeCreateCallbacks)
			.filter(c => c.modelName == modelName)
			.map(c => c.method)
			.value()
		if (_.isArray(data))
			throw 'NOT IMPLEMENTED'
		return _.applyEachSeries(callbacks, data)
	},

	callAfterCreate(modelName, data) {
		var callbacks = _(afterCreateCallbacks)
			.filter(c => c.modelName == modelName)
			.map(c => c.method)
			.value()
		if (_.isArray(data))
			throw 'NOT IMPLEMENTED'
		return _.applyEachSeries(callbacks, data)
	}
}
