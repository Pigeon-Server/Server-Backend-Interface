import {NextFunction, Request, Response} from "express";
import {logger} from "@/base/logger";
import {WorkerService} from "@/service/workerService";

export namespace WorkerApiController {
    export const checkWorker = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.query;
            const data = await WorkerService.getWorkerStatus(id as string);
            res.status(data.code).json(data.response);
        } catch (err) {
            logger.error(err);
            next(err);
        }
    }
}