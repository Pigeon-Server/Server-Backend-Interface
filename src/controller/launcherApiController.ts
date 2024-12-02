/**********************************************
 * @file launcherApiController.ts
 * @desc api接口处理器
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.15
 * @license GNU General Public License (GPL)
 **********************************************/
import {NextFunction, Request, Response} from "express";
import {Config} from "@/base/config";
import {api, file, logger} from "@/base/logger";
import {EncryptUtils} from "@/utils/encryptUtils";
import {accessSync, constants} from "fs";
import {SyncFileManager} from "@/module/syncFileManager";
import {HttpCode} from "@/utils/httpCode";
import {InternalServerError, TargetNotFoundError} from "@/error/requestError";
import {LauncherService} from "@/service/launcherService";

export namespace LauncherApiController {
    import updateConfig = Config.updateConfig;
    import encryptSHA1 = EncryptUtils.encryptSHA1;
    import encryptFile = EncryptUtils.encryptFile;
    import syncConfigCache = SyncFileManager.syncConfigCache;

    export const interfaceDeprecatedHandler = (req: Request, res: Response) => {
        api.warn(`Interface ${req.url} accessed by method ${req.method} has been deprecated`);
        res.status(HttpCode.MethodNotAllowed).json({
            status: false,
            msg: "此接口已被弃用,请更新启动器"
        } as Reply);
    };

    export const getJarHandler = (_: Request, res: Response) => {
        api.info(`Send hmcl jar to client`);
        res.download(updateConfig.launchUpdate.jarPath);
    };

    export const updateLinkHandler = (_: Request, res: Response) => {
        api.info(`Send update link to client`);
        res.status(HttpCode.OK).json({
            "jar": `${updateConfig.launchUpdate.baseUrl}/api/launcher/get_jar`,
            "jarsha1": encryptFile(updateConfig.launchUpdate.jarPath, encryptSHA1),
            "changeLog": updateConfig.launchUpdate.changeLog,
            "version": updateConfig.launchUpdate.version
        });
    };

    export const getAccessKeyHandler = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {macAddress, username, uuid, packName} = req.body;
            const data = await LauncherService.getAccessKey({
                ip: req.ip, key: "", macAddress, packName, username, uuid
            } as PlayerCreateKeyInfo);
            res.status(data.code).json(data.response);
        } catch (err) {
            logger.error(err);
            next(new InternalServerError());
        }
    };

    export const checkUpdateHandler = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {packName, localSource} = req.body;
            const data = await LauncherService.getPackageConfigFile(packName, localSource);
            res.setHeader("X-Update-Max-Threads", updateConfig.updateMaxThread);
            res.status(data.code).json(data.response);
        } catch (err) {
            logger.error(err);
            next(err);
        }
    };

    export const getSourceHandler = (req: Request, res: Response, next: NextFunction) => {
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
            next(new TargetNotFoundError("更新文件出错,请联系管理员"));
        }
    };
}
