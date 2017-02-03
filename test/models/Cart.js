module.exports = {

	attributes: {

		totalPrice: {
			type: 'integer'
		},

		coupon: {
			type: 'string'
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