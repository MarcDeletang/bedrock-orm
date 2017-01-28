module.exports = {

	attributes: {

		totalPrice: {
			type: 'integer'
		},

		coupon: {
			type: 'string'
		},

		user: {
			model: 'user',
			columnName: 'user_id'
		},

		isPaid: {
			type: 'boolean',
			defaultsTo: false
		},

		cartProducts: {
			collection: 'cartProduct',
			via: 'cart'
		}
	}
}