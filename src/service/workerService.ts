import {ParamMismatchError, TargetNotFoundError} from "@/error/requestError";
import {WorkerManager} from "@/module/workerManager";
import {HttpCode} from "@/utils/httpCode";

export namespace WorkerService {
    export const getWorkerStatus = async (workerId?: string) => {
        if (workerId === undefined) {
            throw new ParamMismatchError(`No worker id provided`);
        }
        const worker = WorkerManager.getWorker(workerId);
        if (worker === undefined) {
            throw new TargetNotFoundError(`Worker ${workerId} not found`);
        }
        return {
            code: HttpCode.OK,
            response: {
                status: true,
                data: {
                    finished: worker.finished,
                    exception: worker.exception !== undefined
                }
            } as Reply
        } as ServiceReturn;
    };
}