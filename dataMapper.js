'use strict'

var _ = require('lodash')

module.exports = {

	feedLonelyChild(repository, array, isArray) {
		var res = []
		for (var i = 0; i != array.length; ++i) {
			res.push(repository.feedFromDB(array[i]))
			if (!isArray)
				return res
		}
		return res
	},

	mergeArraysToModel(parentArray, childArray, link) {
		if (childArray.length == 0)
			return parentArray

		if (link.relationType == 'collection') {

			for (var i = 0; i != parentArray.length; ++i) {
				for (var j = 0; j != childArray.length; ++j) {

					if (parentArray[i][link.parentMatchKey] == childArray[j][link.childMatchKey]) {
						if (parentArray[i][link.parentRelationName] == null)
							parentArray[i][link.parentRelationName] = []
						parentArray[i][link.parentRelationName].push(link.childRepository.feedFromDB(childArray[j]))
					}
				}
			}
		}
		if (link.relationType == 'model') {
			for (var i = 0; i != parentArray.length; ++i) {
				for (var j = 0; j != childArray.length; ++j) {
					if (parentArray[i][link.parentMatchKey] == childArray[j][link.childMatchKey]) {
						parentArray[i][link.parentRelationName] = link.childRepository.feedFromDB(childArray[j])
						break
					}
				}
			}
		}
		return parentArray
	},

	mergeArrays(arrays, queryStack, isArray, originRepository) {
		if (arrays.length == 0) {
			if (isArray)
				return []
			else
				return null
		}
		//On deep populate, return multiple empty arrays
		if (arrays[0].length == 0) {
			if (isArray)
				return []
			else
				return null
		}
		if (queryStack.length == 0){
			var root = this.feedLonelyChild(originRepository, arrays[0], isArray)
			return root
		}
		var root = this.feedLonelyChild(queryStack[0][0].parentRepository, arrays.shift(), isArray)
		for (var i = 0; i != queryStack.length; ++i) {
			var links = queryStack[i]

			var children = []
			for (var j = links.length; j != 0; --j) {
				if (j == links.length) {
					var fchildren = arrays.splice(j - 1, 1)[0]
					children = this.feedLonelyChild(links[j - 1].childRepository, fchildren, true)
				} else {
					var newStep = arrays.splice(j - 1, 1)[0]
					children = this.mergeArraysToModel(newStep, children, links[j])
				}
			}
			root = this.mergeArraysToModel(root, children, links[0])
		}
		if (!isArray)
			return root[0]
		return root
	},

}