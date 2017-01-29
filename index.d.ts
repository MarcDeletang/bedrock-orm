import * as Promise from 'bluebird'

export class Model {
}

export class Transaction {
    constructor()
    start(): Promise<Transaction>
    commit(): Promise<boolean>
    rollback(): Promise<boolean>
    query(query: string): Promise<any>
}

export class Repository {
    constructor(name: string, model: any)
    create(data: any): Model
    findOne(): Model
    find(): Model[]
    startTransaction(): Promise<Transaction>
}