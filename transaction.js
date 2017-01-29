//Get a client from pool, passed to repositories to use transactions
//Each client is closed after commit/rollback for now
function TransactionObject() {
    this.client = null
}

TransactionObject.prototype.start = function () {
    function p(resolve, reject) {
        function onClient(client) {
            this.client = client
            this.client.query('BEGIN;').then(result => {
                resolve(this)
            }).catch(error => {
                reject(error)
            })
        }
        if (this.client != null && this.client != 42 && this.client != 43)
            reject('Start transaction can only be call once before commit/rollback')
        db.getClient.then(onClient.bind(this)).catch(error => {
            reject(error)
        })
    }
    return new Promise(p.bind(this))
}

TransactionObject.prototype.commit = function () {
    return new Promise(((resolve, reject) => {
        if (this.client == null)
            reject('Cannot commit before start transaction')
        if (this.client == 42)
            reject('Cannot commit twice')
        if (this.client == 43)
            reject('Cannot commit after rollback')

        this.client.query('COMMIT;').then((result => {
            this.client.release()
            this.client = 42
            resolve(true)
        }, err => {
            console.log('commit error', err)
            reject(err)
        }).bind(this))
    }).bind(this))
}

//Does not use ROLLBACK because node pg does it for us
//https://github.com/brianc/node-postgres/wiki/pg
TransactionObject.prototype.rollback = function () {
    return new Promise((resolve, reject => {
        if (this.client == null)
            reject('Cannot rollback before start transaction')
        if (this.client == 42)
            reject('Cannot rollback twice')
        if (this.client == 43)
            reject('Cannot rollback after commit')
        this.client.release()
        this.client = 43
        resolve(true)
    }).bind(this))
}

TransactionObject.prototype.query = function (query) {
    return new Promise(((resolve, reject) => {
        if (this.client == null)
            reject('Cannot execute query before start transaction')
        if (this.client == 42)
            reject('Cannot execute query after commit')
        if (this.client == 43)
            reject('Cannot execute query after rollback')
        this.client.query(query).then((result => {
            resolve(result)
        }, err => {
            reject(err)
        }).bind(this))
    }).bind(this))
}

module.exports = TransactionObject
