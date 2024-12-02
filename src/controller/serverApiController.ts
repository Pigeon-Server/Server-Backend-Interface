import {NextFunction, Request, Response} from "express";
import {api} from "@/base/logger";
import {clearApiCache} from "@/module/apiManager";
import {ServerService} from "@/service/serverService";
import {HttpCode} from "@/utils/httpCode";

export namespace ServerApiController {
    export const getServerStatusHandler = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {fromDate, toDate} = req.body;
            const data = await ServerService.getServerPerformanceData(fromDate, toDate);
            res.status(data.code).json(data.response);
        } catch (err) {
            api.error(err);
            next(err);
        }
    };

    export const clearCacheHandler = async (_: Request, res: Response) => {
        clearApiCache();
        res.status(HttpCode.OK).json({
            status: true
        } as Reply);
    }
}