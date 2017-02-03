var repositoryLoader = require('./repository.js')


module.exports.load = (models, setGlobal, log) => {
    return repositoryLoader.load(models, setGlobal, log)
}