import {PropertyUtils} from "@/utils/propertyUtils";
import os from "node:os";
import {Performance} from "@/database/model/performance";
import {ServerLifeCycle, ServerLifeCycleEvent} from "@/base/lifeCycle";
import {Utils} from "@/utils/utils";
import {Config} from "@/base/config";
import {Op} from "@sequelize/core";
import instanceCpuUsage = PropertyUtils.instanceCpuUsage;
import instanceMemoryUsage = PropertyUtils.instanceMemoryUsage;
import instanceDiskUsage = PropertyUtils.instanceDiskUsage;
import translateTime = Utils.translateTime;
import serverConfig = Config.serverConfig;
import getDate = Utils.getDate;
import TimeOperation = Utils.TimeOperation;

export class PropertyMonitor {
    private static _monitorId?: NodeJS.Timeout;

    static initMonitor() {
        this._monitorId = setInterval(this.collectData, translateTime(serverConfig.monitor.recordInterval) * 1000);
        ServerLifeCycle.addEventHandler(ServerLifeCycleEvent.ServerExit, () => {
            clearInterval(this._monitorId);
        });
    }

    static async collectData() {
        const cpuUsage = await instanceCpuUsage();
        const memoryUsage = instanceMemoryUsage();
        const diskUsage = await instanceDiskUsage();
        const loads = os.loadavg();
        const performance = Performance.build({
            cpuUsage: cpuUsage,
            memoryUsage: memoryUsage.usage,
            serverLoad1: loads[0],
            serverLoad5: loads[1],
            serverLoad15: loads[2],
            diskUsage: diskUsage.usage
        });
        await Performance.destroy({
            where: {
                createTime: {
                    [Op.lt]: getDate(TimeOperation.Early, translateTime(serverConfig.monitor.retentionDays))
                }
            }
        });
        return performance.save();
    }
}