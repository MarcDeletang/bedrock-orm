var _ = require('lodash')

module.exports = {
	init() {

		_.mixin({
			'indexOfObject': function (array, obj) {
				for (var i = 0; i != array.length; i++) {
					if (_.isEqual(array[i], obj))
						return i
				}
				return -1
			}
		})

		//http://caolan.github.io/async/docs.html#.applyEachSeries
		_.mixin({
			'applyEachSeries': (callbacks, data) => {
				var that = {}
				that.callbacks = callbacks
				that.data = data
				return new Promise((resolve, reject) => {
					that.resolve = resolve
					that.finalResults = []
					var next = (finalResult) => {
						if (that.callbacks.length == 0)
							resolve(that.finalResults)
						if (finalResult != null)
							that.finalResults.push(finalResult)
						var method = that.callbacks.shift()
						if (method)
							method(that.data, that.next)
					}
					that.next = next
					next()
				})
			}
		})


		//If object already has prop, does not bind
		_.mixin({
			'bindMethodsToObject': function (methods, model) {
				for (var methodName in methods) {
					if (!_.hasIn(model, methodName))
						model[methodName] = _.bind(methods[methodName], model)
				}
				return model
			}
		})

	}
}