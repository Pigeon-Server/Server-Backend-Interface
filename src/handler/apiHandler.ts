import {NextFunction, Request, Response} from "express";
import {Tracker} from "@/manager/trackerManager";
import {Config} from "@/base/config";
import {api} from "@/base/logger";
import {clearApiCache, getNextClearTime, getPlayerStatus} from "@/manager/apiManager";
import {EncryptUtils} from "@/utils/encryptUtils";
import {Database} from "@/base/mysql";
import {Utils} from "@/utils/utils";
import {accessSync, constants} from "fs";
import {SyncFileManager} from "@/manager/syncFileManager";

export namespace ApiHandler {
    import serverConfig = Config.serverConfig;
    import updateConfig = Config.updateConfig;
    import encryptSHA1 = EncryptUtils.encryptSHA1;
    import encryptFile = EncryptUtils.encryptFile;
    import generateKey = Utils.generateKey;
    import syncConfigCache = SyncFileManager.syncConfigCache;
    import generateJsonToClient = SyncFileManager.generateJsonToClient;
    import encryptMD5 = EncryptUtils.encryptMD5;

    const tracker = new Tracker(serverConfig.callLimit.count, serverConfig.callLimit.time);

    export const limitHandler = (req: Request, res: Response, next: NextFunction) => {
        const {macAddress} = req.method === 'GET' ? req.query : req.body;
        api.debug(`New access from ${req.ip}`);
        // api访问限制
        if (!tracker.trackIP(req.ip!, <string>macAddress)) {
            api.warn(`Access Denial: Api call limit`);
            res.status(429).json({status: false, msg: "超出API访问限制"});
            return;
        }
        next();
    };

    export const getServerStatusHandler = (req: Request, res: Response) => {
        res.status(200).json({
            status: true,
            next_flush: getNextClearTime()
        });
    };

    export const clearApiCacheHandler = (req: Request, res: Response) => {
        const {key} = req.body;
        if (key === updateConfig.auth.key) {
            clearApiCache();
            res.status(200).json({status: true});
            return;
        }
        res.status(403).json({status: false});
    };

    export const getJarHandler = (_: Request, res: Response) => {
        res.download(updateConfig.launchUpdate.jarPath);
    };

    export const updateLinkHandler = (_: Request, res: Response) => {
        const jarConfig = {
            "jar": updateConfig.launchUpdate.baseUrl + "/api/get_jar",
            "jarsha1": encryptFile(updateConfig.launchUpdate.jarPath, encryptSHA1),
            "changeLog": updateConfig.launchUpdate.changeLog,
            "version": updateConfig.launchUpdate.version
        };
        res.status(200).json(jarConfig);
    };

    export const verifyHandler = async (req: Request, res: Response, next: NextFunction) => {
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

    export const getAccessKeyHandler = async (req: Request, res: Response) => {
        const {
            macAddress,
            username,
            uuid,
            packName
        } = req.body;
        const result = await Database.INSTANCE.getKey(<PlayerGetKeyInfo>{
            username,
            uuid,
            macAddress,
            packName
        }).catch(err => api.error(err.message));
        if (result === undefined) {
            api.warn(`Access Denial: Mysql database error.`);
            res.status(500).json({status: false, msg: "服务器内部出错,请联系管理员"});
            return;
        }
        if (result.length === 1) {
            api.info(`Send key ${result[0].accessKey} for ${username}.`);
            res.status(200).json({status: true, key: result[0].accessKey});
            return;
        }
        const key = generateKey();
        Database.INSTANCE.setKey(<PlayerSetKeyInfo>{
            username,
            uuid,
            macAddress,
            ip: req.ip,
            key,
            packName
        }).then((_) => {
            api.info(`Generate new key ${key} for ${username}.`);
            res.status(200).json({status: true, key});
        }).catch(err => {
            api.error(err.message);
            res.status(500).json({status: false, msg: "服务器内部出错,请联系管理员"});
        })
    };

    export const packageConfigHandler = async (req: Request, res: Response, next: NextFunction) => {
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

    export const checkUpdateHandler = (req: Request, res: Response) => {
        const {
            packName,
            localSource
        } = req.body;
        res.setHeader("X-Update-Max-Threads", updateConfig.updateMaxThread);
        const clientJson = generateJsonToClient(syncConfigCache[<string>packName]);
        if (encryptMD5(JSON.stringify(clientJson)) !== syncConfigCache[<string>packName].md5) {
            api.warn(`Access Denial: Profile MD5 validation failed.`);
            res.status(515).json({status: false, msg: "服务器配置文件验证失败,请联系管理员"});
            return;
        }
        if (localSource !== undefined && (<string>localSource).toLowerCase() === syncConfigCache[<string>packName].md5) {
            api.info(`Same MD5 ${localSource} with client, send nothing.`);
            res.status(304).send();
            return;
        }
        res.status(200).json(clientJson);
    };

    export const getSourceHandler = (req: Request, res: Response) => {
        const {
            macAddress,
            uuid,
            username,
            packName
        } = req.query;
        const path = req.params.path;
        Database.INSTANCE.addUserAccess(<PlayerViewInfo>{
            username,
            uuid,
            macAddress,
            ip: req.ip,
            packName,
            path
        }).catch(err => api.error(err.message));
        const {basePath} = syncConfigCache[<string>packName];
        const destinationPath = `${basePath}/${path}`;
        try {
            accessSync(destinationPath, constants.F_OK);
            api.info(`Send file ${destinationPath} to ${username}`);
            res.download(destinationPath);
        } catch (err: any) {
            api.error(err.message);
            api.warn(`Access Denial: Unable to find file.`);
            res.status(404).json({status: false, message: "更新文件出错,请联系管理员"});
        }
    };
}
