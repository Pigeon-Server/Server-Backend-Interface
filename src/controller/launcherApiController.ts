/**********************************************
 * @file launcherApiController.ts
 * @desc api接口处理器
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.15
 * @license GNU General Public License (GPL)
 **********************************************/
import {Request, Response} from "express";
import {Config} from "@/base/config";
import {api, file} from "@/base/logger";
import {EncryptUtils} from "@/utils/encryptUtils";
import {Utils} from "@/utils/utils";
import {accessSync, constants} from "fs";
import {SyncFileManager} from "@/module/syncFileManager";
import {Database} from "@/database/database";

export namespace LauncherApiController {
    import updateConfig = Config.updateConfig;
    import encryptSHA1 = EncryptUtils.encryptSHA1;
    import encryptFile = EncryptUtils.encryptFile;
    import generateKey = Utils.generateKey;
    import syncConfigCache = SyncFileManager.syncConfigCache;
    import generateJsonToClient = SyncFileManager.generateJsonToClient;
    import encryptMD5 = EncryptUtils.encryptMD5;

    export const interfaceDeprecatedHandler = (req: Request, res: Response) => {
        api.warn(`Interface ${req.url} accessed by method ${req.method} has been deprecated`);
        res.status(405).json({
            status: false,
            msg: "此接口已被弃用,请更新启动器"
        } as Reply);
    };

    export const getJarHandler = (_: Request, res: Response) => {
        api.info(`Send hmcl jar to client`);
        res.download(updateConfig.launchUpdate.jarPath);
    };

    export const updateLinkHandler = (_: Request, res: Response) => {
        const jarConfig = {
            "jar": updateConfig.launchUpdate.baseUrl + "/api/launcher/get_jar",
            "jarsha1": encryptFile(updateConfig.launchUpdate.jarPath, encryptSHA1),
            "changeLog": updateConfig.launchUpdate.changeLog,
            "version": updateConfig.launchUpdate.version
        };
        api.info(`Send update link to client`);
        res.status(200).json(jarConfig);
    };

    export const getAccessKeyHandler = async (req: Request, res: Response) => {
        const {
            macAddress,
            username,
            uuid,
            packName
        } = req.body;
        const result = await Database.getKey({
            username,
            uuid,
            macAddress,
            packName
        } as PlayerGetKeyInfo).catch(err => api.error(err.message));
        if (result === undefined) {
            api.warn(`Access Denial: Mysql database error.`);
            res.status(500).json({
                status: false,
                msg: "服务器内部出错,请联系管理员"
            } as Reply);
            return;
        }
        if (result !== null) {
            api.info(`Send key ${result.accessKey} for ${username}.`);
            res.status(200).json({
                status: true,
                data: result.accessKey
            } as Reply);
            return;
        }
        const key = generateKey();
        Database.createKey(<PlayerCreateKeyInfo>{
            username,
            uuid,
            macAddress,
            ip: req.ip,
            key,
            packName
        }).then((_) => {
            api.info(`Generate new key ${key} for ${username}.`);
            res.status(200).json({
                status: true,
                data: key
            } as Reply);
        }).catch(err => {
            api.error(err.message);
            res.status(500).json({
                status: false,
                msg: "服务器内部出错,请联系管理员"
            } as Reply);
        })
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
            res.status(515).json({
                status: false,
                msg: "服务器配置文件验证失败,请联系管理员"
            } as Reply);
            return;
        }
        if (localSource !== undefined && (<string>localSource).toLowerCase() === syncConfigCache[<string>packName].md5) {
            api.info(`Same MD5 ${localSource} with client, send nothing.`);
            res.status(304).send();
            return;
        }
        api.info(`Send package config to client for ${packName}`);
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
        const {basePath} = syncConfigCache[<string>packName];
        const destinationPath = `${basePath}/${path}`;
        file.info(`${username}[${uuid}](${macAddress}\\${req.ip}) downloading ${destinationPath}`);
        try {
            accessSync(destinationPath, constants.F_OK);
            api.info(`Send file ${destinationPath} to ${username}`);
            res.download(destinationPath);
        } catch (err: any) {
            api.error(err.message);
            api.warn(`Access Denial: Unable to find file.`);
            res.status(404).json({
                status: false,
                msg: "更新文件出错,请联系管理员"
            } as Reply);
        }
    };
}
