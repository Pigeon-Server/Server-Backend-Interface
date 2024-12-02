export class WorkerError extends Error {
    public readonly workerId: string;

    constructor(id: string, message?: string) {
        super(message);
        this.workerId = id;
    }
}

export class WorkerExistError extends WorkerError {
    constructor(id: string) {
        super(id, `Worker ${id} has already exist`);
    }
}

export class WorkerNotFoundError extends WorkerError {
    constructor(id: string) {
        super(id, `Worker ${id} doesn't exist`);
    }
}