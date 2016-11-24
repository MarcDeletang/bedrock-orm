'use strict'

var pg = require('pg')

module.exports = {
	init(config) {
		try {
			this.pool = new pg.Pool(config)

			this.pool.on('PgError', function (err, client) {
				Bedrock.log.error('pgError fatal db', err.message, err.stack)
			})
			this.pool.on('error', function (err, client) {
				Bedrock.log.error('error fatal db', err.message, err.stack)
			})

		} catch (e) {
			Bedrock.log.error('ex dbLayer.init', e.stack)
		}
	},

	query(query) {
		return this.pool.query(query)
	},

	getClient() {
		var that = this
		return new Promise(function (resolve, reject) {
			that.pool.connect(function (err, client, release) {
				if (err)
					return reject(err)
				else {
					client.release = release
					return resolve(client)
				}
			})
		})
	}
}