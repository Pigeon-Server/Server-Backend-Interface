import {Request, Response} from "express";
import {api} from "@/base/logger";
import {clearApiCache} from "@/module/apiManager";
import {Performance} from "@/database/model/performance";
import {Op} from "@sequelize/core";
import {Utils} from "@/utils/utils";
import TimeOperation = Utils.TimeOperation;
import {Config} from "@/base/config";

export namespace ServerApiController {

    import getDate = Utils.getDate;
    import translateTime = Utils.translateTime;
    import serverConfig = Config.serverConfig;
    export const getServerStatusHandler = async (req: Request, res: Response) => {
        let {fromDate, toDate} = req.body;
        if (fromDate && toDate) {
            fromDate = Date.parse(fromDate);
            toDate = Date.parse(toDate);
        } else {
            fromDate = getDate(TimeOperation.Early, translateTime(serverConfig.monitor.retentionDays));
            toDate = Date.now();
        }
        api.info(`Send server status to client`);
        const data = await Performance.findAll({
            where: {
                createTime: {
                    [Op.between]: [fromDate, toDate]
                }
            }
        });
        const performanceData: PerformanceData = {
            time: [],
            cpu: [],
            memory: [],
            disk: [],
            load1: [],
            load5: [],
            load15: []
        };

        data.forEach((element) => {
            performanceData.time.push(element.createTime!!.toISOString());
            performanceData.cpu.push(element.cpuUsage);
            performanceData.memory.push(element.memoryUsage);
            performanceData.disk.push(element.diskUsage);
            performanceData.load1.push(element.serverLoad1);
            performanceData.load5.push(element.serverLoad5);
            performanceData.load15.push(element.serverLoad15);
        });
        res.status(200).json({
            status: true,
            data: performanceData
        } as Reply);
    };

    export const clearCacheHandler = async (_: Request, res: Response) => {
        clearApiCache();
        res.status(200).json({
            status: true
        } as Reply);
    }
}