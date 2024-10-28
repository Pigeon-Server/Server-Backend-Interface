import {Request, Response} from "express";
import {api} from "@/base/logger";
import {clearApiCache, getNextClearTime} from "@/module/apiManager";
import {PropertyUtils} from "@/utils/propertyUtils";
import os from "node:os";
import {Performance} from "@/database/model/performance";
import {Op} from "@sequelize/core";

export namespace ServerApiController {

    export const getServerStatusHandler = async (req: Request, res: Response) => {
        let {fromDate, toDate} = req.body;
        if (fromDate && toDate) {
            fromDate = Date.parse(fromDate);
            toDate = Date.parse(toDate);
        }
        api.info(`Send server status to client`);
        let data: Performance[];
        if (fromDate && toDate) {
            data = await Performance.findAll({
                where: {
                    createTime: {
                        [Op.between]: [fromDate, toDate]
                    }
                }
            });
        } else {
            data = await Performance.findAll();
        }
        const status: {
            time: string[],
            cpu: number[],
            memory: number[],
            disk: number[],
            load1: number[],
            load5: number[],
            load15: number[]
        } = {
            time: [],
            cpu: [],
            memory: [],
            disk: [],
            load1: [],
            load5: [],
            load15: []
        };
        data.forEach((element) => {
            status.time.push(element.createTime!!.toISOString());
            status.cpu.push(element.cpuUsage);
            status.memory.push(element.memoryUsage);
            status.disk.push(element.diskUsage);
            status.load1.push(element.serverLoad1);
            status.load5.push(element.serverLoad5);
            status.load15.push(element.serverLoad15);
        });
        res.status(200).json({
            status: true,
            data: status
        } as Reply);
    };

    export const clearCacheHandler = async (_: Request, res: Response) => {
        clearApiCache();
        res.status(200).json({
            status: true
        } as Reply);
    }
}