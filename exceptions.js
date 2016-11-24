function ValidationException(message) {
	this.name = 'ValidationException'
	this.message = message
	this.stack = (new Error()).stack
}

ValidationException.prototype = Object.create(Error.prototype)
ValidationException.prototype.constructor = ValidationException

function UniqueViolationException(message) {
	this.name = 'UniqueViolationException'
	this.message = message
	this.stack = (new Error()).stack
}

UniqueViolationException.prototype = Object.create(Error.prototype)
UniqueViolationException.prototype.constructor = UniqueViolationException

module.exports = {
	validationException: ValidationException,
	uniqueViolationException: UniqueViolationException
}