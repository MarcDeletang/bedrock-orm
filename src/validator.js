var _ = require('lodash')

module.exports = {

	validate(data, repository) {
		for (var key in data) {
			if (_.has(repository.model, key)) {
				if (_.has(repository.model[key], 'required') && repository.model[key].required == true)
					if (data[key] == null)
						throw new 'Validation ex'
			}
		}
	},


	setDefaults() {

	}
}