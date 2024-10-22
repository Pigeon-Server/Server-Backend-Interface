import {Request, Response} from "express";
import {api} from "@/base/logger";
import {clearApiCache, getNextClearTime} from "@/manager/apiManager";
import {PropertyUtils} from "@/utils/propertyUtils";
import os from "node:os";

export namespace ServerApiController {

    export const getServerStatusHandler = async (_: Request, res: Response) => {
        api.info(`Send server status to client`);
        res.status(200).json({
            status: true,
            data: {
                next_flush: getNextClearTime(),
                cpu: await PropertyUtils.instanceCpuUsage(),
                memory: PropertyUtils.instanceMemoryUsage(),
                load: os.loadavg(),
                uptime: os.uptime()
            }
        } as Reply);
    };

    export const clearCacheHandler = async (_: Request, res: Response) => {
        clearApiCache();
        res.status(200).json({
            status: true
        } as Reply);
    }
}