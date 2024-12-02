import {Database} from "@/database/database";
import {api} from "@/base/logger";
import {HttpCode} from "@/utils/httpCode";
import {Utils} from "@/utils/utils";
import {SyncFileManager} from "@/module/syncFileManager";
import {EncryptUtils} from "@/utils/encryptUtils";
import {RequestError} from "@/error/requestError";

export namespace LauncherService {
    import generateKey = Utils.generateKey;
    import generateJsonToClient = SyncFileManager.generateJsonToClient;
    import encryptMD5 = EncryptUtils.encryptMD5;
    import syncConfigCache = SyncFileManager.syncConfigCache;
    export const getAccessKey = async (info: PlayerCreateKeyInfo) => {
        const result = await Database.getKey(info);
        if (result !== null) {
            api.info(`Send key ${result.accessKey} for ${info.username}.`);
            return {
                code: HttpCode.OK,
                response: {
                    status: true,
                    data: result.accessKey
                } as Reply
            } as ServiceReturn;
        }
        const key = generateKey();
        info.key = key;
        await Database.createKey(info);
        return {
            code: HttpCode.OK,
            response: {
                status: true,
                data: key
            } as Reply
        } as ServiceReturn;
    };

    export const getPackageConfigFile = async (packName: string, localSource: string) => {
        const clientJson = generateJsonToClient(syncConfigCache[<string>packName]);
        if (encryptMD5(JSON.stringify(clientJson)) !== syncConfigCache[<string>packName].md5) {
            api.warn(`Access Denial: Profile MD5 validation failed.`);
            throw new RequestError(HttpCode.ConfigValidationFail, "服务器配置文件验证失败,请联系管理员");
        }
        if (localSource !== undefined && (<string>localSource).toLowerCase() === syncConfigCache[<string>packName].md5) {
            api.info(`Same MD5 ${localSource} with client, send nothing.`);
            return {
                code: HttpCode.NotModified,
                response: {}
            } as ServiceReturn;
        }
        api.info(`Send package config to client for ${packName}`);
        return {
            code: HttpCode.OK,
            response: clientJson as any
        } as ServiceReturn;
    };
}