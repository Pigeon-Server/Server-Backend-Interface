import {Utils} from "@/utils/utils";
import {api} from "@/base/logger";
import {Performance} from "@/database/model/performance";
import {Op} from "@sequelize/core";
import {HttpCode} from "@/utils/httpCode";

export namespace ServerService {
    import getDate = Utils.getDate;
    import TimeOperation = Utils.TimeOperation;
    import translateTime = Utils.translateTime;
    export const getServerPerformanceData = async (fromDate?: any, toDate?: any) => {
        if (fromDate && toDate) {
            fromDate = Date.parse(fromDate);
            toDate = Date.parse(toDate);
        } else {
            fromDate = getDate(TimeOperation.Early, translateTime("1d"));
            toDate = Date.now();
        }
        api.info(`Send server performance data to client`);
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
        return {
            code: HttpCode.OK,
            response: {
                status: true,
                data: performanceData
            } as Reply
        } as ServiceReturn;
    };
}