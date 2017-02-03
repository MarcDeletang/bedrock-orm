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
    create(data: any, transaction: Transaction): Model
    findOne(criteria: any, optArgs: OptArg): Model
    find(): Model[]
    startTransaction(): Promise<Transaction>
}

export class OptArg {
    populate?: string[]
    sort?: {}
    limit?: number
    skip?: number
    paginate?: { page: number, limit: number }
    where?: [{ field: string, "<"?: string, "<="?: string, ">"?: string, ">="?: string, "!"?: string, like?: string, contains?: string, startsWith?: string, endsWith?: string }]
}