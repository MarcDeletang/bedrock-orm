module.exports = {

	attributes: {

		name: {
			type: 'string',
			size: 50
		},

		price: {
			type: 'integer'
		},

		description: {
			type: 'string'
		},

		cartProducts: {
			collection: 'cartProduct',
			via: 'product'
		}
	}
}