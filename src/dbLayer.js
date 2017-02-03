'use strict'

var pg = require('pg')

module.exports = {
	init(config) {
		return new Promise(((resolve, reject) => {
			this.pool = new pg.Pool(config)
			this.pool.on('PgError', function (err, client) {
				console.log('pgError fatal db', err.message, err.stack)
			})
			this.pool.on('error', function (err, client) {
				console.log('error fatal db', err.message, err.stack)
			})
			return resolve(true)
		}).bind(this))
	},

	query(query) {
		return this.pool.query(query)
	},

	getClient() {
		return new Promise(((resolve, reject) => {
			this.pool.connect(function (err, client, release) {
				if (err)
					return reject(err)
				else {
					client.release = release
					return resolve(client)
				}
			})
		}).bind(this))
	}
}