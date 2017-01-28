module.exports = {

	attributes: {

		dateAdded: {
			type: 'dateTime'
		},

		cart: {
			model: 'cart',
			columnName: 'cart_id'
		},

		product: {
			model: 'product',
			columnName: 'cart_id'
		},

		numberOf: {
			type: 'integer',
			required: true
		}
	}
}