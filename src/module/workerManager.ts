import {v4, v5} from "uuid";
import {Utils} from "@/utils/utils";
import generateKey = Utils.generateKey;
import {WorkerExistError, WorkerNotFoundError} from "@/error/workerError";


export enum ExitCode {
    Normal,
    Exception
}

export class Worker {
    public readonly workerId: string;
    public readonly workerName: string;
    public finished: boolean = false;
    public exitCode?: ExitCode;
    public exception?: Error;

    constructor(workerId: string, workerName: string) {
        this.workerId = workerId;
        this.workerName = workerName;
    }
}


export class WorkerManager {
    private static workerMap: Map<string, Worker> = new Map();
    private static readonly namespace: string = v4();

    static addWorker(worker: Worker) {
        this.workerMap.set(worker.workerId, worker);
    }

    static newWorker(workerName?: string) {
        workerName = workerName || generateKey();
        const workerId = v5(workerName, this.namespace);
        if (this.workerMap.has(workerId)) {
            const worker = this.workerMap.get(workerId)!!;
            if (worker.finished) {
                this.workerMap.delete(workerId);
            } else {
                throw new WorkerExistError(workerId);
            }
        }
        const worker = new Worker(workerId, workerName);
        this.addWorker(worker);
        return workerId;
    }

    static workerFinish(workerId: string, exitCode: ExitCode, exception?: Error) {
        const worker = this.workerMap.get(workerId);
        if (!worker) {
            throw new WorkerNotFoundError(workerId);
        }
        worker.finished = true;
        worker.exitCode = exitCode;
        worker.exception = exception;
    }

    static getWorker(workerId: string) {
        return this.workerMap.get(workerId);
    }

    static removeWorker(workerId: string) {
        this.workerMap.delete(workerId);
    }
}