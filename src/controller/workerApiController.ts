import {NextFunction, Request, Response} from "express";
import {WorkerManager} from "@/module/workerManager";
import {TargetNotFoundError} from "@/error/requestError";
import {HttpCode} from "@/utils/httpCode";

export namespace WorkerApiController {
    export const checkWorker = async (req: Request, res: Response, next: NextFunction) => {
        const {id} = req.query;
        const worker = WorkerManager.getWorker(id as string);
        if (!worker) {
            next(new TargetNotFoundError(`Worker ${id} not found`));
            return;
        }
        res.status(HttpCode.OK).json({
            status: true,
            data: {
                finished: worker.finished,
                exception: worker.exception !== undefined
            }
        } as Reply);
    }
}