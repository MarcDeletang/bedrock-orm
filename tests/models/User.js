var hasher = require('bcryptjs')
var _ = require('lodash')

module.exports = {

	attributes: {

		email: {
			type: 'email',
			size: 64
		},

		password: {
			type: 'string',
			size: 60,
			required: true
		},

		salt: {
			type: 'string',
			size: 60,
			required: true,
			defaultsTo: '1'
		},

		firstName: {
			type: 'string',
			size: 128,
		},

		lastName: {
			type: 'string',
			size: 128,
		},

		carts: {
			collection: 'cart',
			via: 'user'
		},

		toJSON: function () {
			var obj = _.clone(this)
			delete obj.password
			delete obj.salt
			return obj
		},
	},

	beforeCreate: function (attrs, next) {
		if (!attrs.password) {
			next()
			return
		}
		hasher.genSalt(10, function (err, salt) {
			if (err)
				Bedrock.log.error(err)
			attrs.salt = salt
			hasher.hash(attrs.password, salt, function (err, hash) {
				if (err)
					Bedrock.log.error(err)
				attrs.password = hash
				next()
			})
		})
	}

}