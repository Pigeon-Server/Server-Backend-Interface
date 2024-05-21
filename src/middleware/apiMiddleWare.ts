import {Tracker} from "@/manager/trackerManager";
import {Config} from "@/base/config";
import {Request, Response, NextFunction} from "express";
import {api} from "@/base/logger";
import {getPlayerStatus} from "@/manager/apiManager";
import {Database} from "@/base/mysql";
import {accessSync, constants} from "fs";
import {SyncFileManager} from "@/manager/syncFileManager";

export namespace ApiMiddleWare {
    import serverConfig = Config.serverConfig;
    import syncConfigCache = SyncFileManager.syncConfigCache;
    const tracker = new Tracker(serverConfig.callLimit.count, serverConfig.callLimit.time);

    export const checkCallLimit = (req: Request, res: Response, next: NextFunction) => {
        const {macAddress} = req.method === 'GET' ? req.query : req.body;
        api.info(`New access from ${req.ip}`);
        // api访问限制
        if (!tracker.trackIP(req.ip!, <string>macAddress)) {
            api.warn(`Access Denial: Api call limit`);
            res.status(429).json({status: false, msg: "超出API访问限制"});
            return;
        }
        next();
    };

    export const verifyArgs = async (req: Request, res: Response, next: NextFunction) => {
        const {
            macAddress,
            uuid,
            username,
            packName
        } = req.method === 'GET' ? req.query : req.body;
        api.debug(`Argument mac: ${macAddress}, uuid: ${uuid}, username: ${username}, packName: ${packName}`);
        // 验证参数
        if ([macAddress, uuid, username].includes(undefined)) {
            api.warn(`Access Denial: Missing parameter`);
            res.status(401).json({status: false, msg: "无身份标识,拒绝访问"});
            return;
        }
        // 验证账号
        if (!(await getPlayerStatus(<string>username, <string>uuid, res))) {
            api.warn(`Access Denial: Account verification failed`);
            return;
        }
        const result = await Database.INSTANCE.checkUserAccount(<PlayerLiteInfo>{
            username,
            uuid,
            macAddress
        }).catch(err => api.error(err.message));
        if (result === undefined) {
            api.warn(`Access Denial: Mysql database error.`);
            res.status(500).json({status: false, msg: "服务器内部出错,请联系管理员"});
            return;
        }
        if (result.length === 1) {
            Database.INSTANCE.updateTime(<PlayerUpdateInfo>{
                username,
                uuid,
                macAddress,
                ip: req.ip,
                packName
            }).catch(err => api.error(err.message));
        } else {
            Database.INSTANCE.addUserAccount(<PlayerFullInfo>{
                username,
                uuid,
                macAddress,
                ip: req.ip,
                packName
            }).catch(err => api.error(err.message));
        }
        if (packName === undefined) {
            api.warn(`Access Denial: No packName`);
            res.status(439).json({status: false, msg: "未指定包名"});
            return;
        }
        next();
    };

    export const verifyPackageConfig = async (req: Request, res: Response, next: NextFunction) => {
        const {
            uuid,
            username,
            accessKey,
            packName,
            macAddress
        } = req.method === 'GET' ? req.query : req.body;
        api.debug(`Argument accessKey: ${accessKey}`);
        if (accessKey === undefined) {
            api.warn(`Access Denial: No accessKey`);
            res.status(403).json({status: false, msg: "无accessKey"});
            return;
        }
        const response = await Database.INSTANCE.getKey(<PlayerGetKeyInfo>{
            username,
            uuid,
            macAddress,
            packName
        }).catch(err => api.error(err.message));
        if (response === undefined) {
            api.warn(`Access Denial: Mysql database error.`);
            res.status(500).json({status: false, msg: "服务器内部出错,请联系管理员"});
            return;
        }
        if (response.length === 0 || response[0].accessKey !== accessKey) {
            api.warn(`Access Denial: Invalid accessKey ${accessKey}`);
            res.status(438).json({status: false, msg: "accessKey无效"});
            return;
        }
        if (syncConfigCache[<string>packName] === undefined) {
            api.warn(`Access Denial: The consolidation package configuration file could not be found.`);
            res.status(441).json({status: false, msg: "无法找到该整合包配置文件"});
            return;
        }
        const {basePath} = syncConfigCache[<string>packName];
        if (basePath === undefined) {
            api.warn(`Access Denial: Unable to get baseBath for pack ${packName}.`);
            res.status(440).json({status: false, msg: "无法获取更新信息"});
            return;
        }
        try {
            accessSync(`${basePath}`, constants.F_OK);
        } catch (ignored) {
            api.warn(`Access Denial: Unable to read basePath ${basePath} for pack ${packName}.`);
            res.status(440).json({status: false, msg: "无法获取更新信息"});
            return;
        }
        next();
    };
}