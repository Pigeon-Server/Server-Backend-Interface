/**********************************************
 * @file syncFileManager.ts
 * @desc None
 * @author Half_nothing
 * @since 1.3.0
 * @date 2024.03.04
 **********************************************/
import {Config} from "@/base/config";
import {logger} from "@/base/logger";
import {EncryptUtils} from "@/utils/encryptUtils";
import {FileUtils} from "@/utils/fileUtils";
import {writeFileSync} from "fs";
import {join} from "path";
import lodash from "lodash";

export namespace SyncFileManager {
    import syncConfig = Config.syncConfig;
    import calculateFilesMd5 = FileUtils.calculateFilesMd5;
    import encryptFile = EncryptUtils.encryptFile;
    import encryptMD5 = EncryptUtils.encryptMD5;
    import checkFileExist = FileUtils.checkFileExist;
    import checkDirExist = FileUtils.checkDirExist;

    checkFileExist('config/syncConfigCache.json', true, JSON.stringify(syncConfig, null, 2));

    export const syncConfigCache: SyncCacheConfig = require('@config/syncConfigCache.json');

    export function checkSyncFileUpdate() {
        if (syncConfig.md5 === undefined) {
            syncConfig.md5 = {}
        }
        let needSave = false;
        for (const packName in syncConfig) {
            if (syncConfig.ignoredKey.includes(packName)) continue;
            logger.debug(`Calculate pack config ${packName}.`);
            const md5 = encryptMD5(JSON.stringify(syncConfig[packName]));
            if (!(packName in syncConfigCache)) {
                // @ts-ignore
                syncConfigCache[packName] = lodash.cloneDeep(syncConfig[packName]);
                logger.debug(`New package ${packName} has been added, md5: ${md5}.`);
                syncConfig.md5[packName] = md5;
                needSave = true;
                continue;
            }
            if (syncConfig.md5[packName] === md5) {
                logger.debug(`${packName} has no change.`);
                continue;
            }
            logger.debug(`${packName} has been changed, new md5: ${md5}.`);
            syncConfig.md5[packName] = md5;
            needSave = true;
        }
        for (const packName in syncConfig.md5) {
            if (!(packName in syncConfig)) {
                logger.debug(`Can not find ${packName} config, remove md5`);
                delete syncConfig.md5[packName];
                needSave = true;
            }
        }
        if (needSave) {
            saveSyncConfig();
        }
    }

    export function checkSyncFile() {
        if (syncConfigCache.md5 === undefined) {
            syncConfigCache.md5 = {}
        }
        for (const packName in syncConfigCache) {
            if (syncConfigCache.ignoredKey.includes(packName)) continue;
            if (!(packName in syncConfig)) {
                delete syncConfigCache[packName];
                logger.debug(`Pack config ${packName} don't exist, delete config cache`);
                continue;
            }
            if (syncConfig.md5[packName] !== syncConfigCache.md5[packName]) {
                logger.debug(`Pack config ${packName} has been updated, remake config cache`);
                // @ts-ignore
                syncConfigCache[packName] = lodash.cloneDeep(syncConfig[packName]);
                syncConfigCache.md5[packName] = syncConfig.md5[packName];
                syncConfigCache[packName].init = false;
            }
            const pack = syncConfigCache[packName];
            if (pack.init) {
                logger.debug(`Pack ${packName} has been init, check finish`);
                continue;
            }
            if (pack.data === undefined) {
                pack.data = [];
            }
            const basePath = pack.basePath;
            if (basePath === undefined) {
                logger.error(`Unable to find pack ${packName}'s path.`);
                continue;
            }
            logger.debug(`Package ${packName} now in process.`);
            logger.debug(`Package ${packName}'s path is ${basePath}.`);
            for (const packKey in pack) {
                if (syncConfigCache.ignoredKey.includes(packKey)) continue;
                if (pack.data.includes(packKey)) continue;
                pack.data.push(packKey);
            }
            for (const folderName of pack.data) {
                const path = pack[folderName].serverPath;
                const filePath = join(basePath, path);
                if (!checkDirExist(filePath, true)) {
                    logger.error(`Path ${filePath} not exist, create dir.`);
                }
                const temp = calculateFilesMd5(filePath, pack[folderName].ignore);
                if (pack[folderName].delete !== undefined) {
                    // @ts-ignore
                    for (const packElement of pack[folderName].delete) {
                        temp[packElement] = 'del';
                    }
                }
                pack[folderName].files = temp;
            }
            for (const packKey in pack.files) {
                if (pack.files[packKey] === 'del') continue;
                const path = join(basePath, packKey);
                if (!checkFileExist(path)) {
                    logger.error(`File ${path} not found`);
                    continue;
                }
                pack.files[packKey] = encryptFile(path, encryptMD5);
            }
            if (pack.files === undefined) {
                pack.files = {};
            }
            const clientJson = generateJsonToClient(pack);
            pack.md5 = encryptMD5(JSON.stringify(clientJson));
            pack.init = true;
            logger.debug(`Pack ${packName} init finish`);
        }
        for (const packName in syncConfigCache.md5) {
            if (!(packName in syncConfigCache)) {
                logger.debug(`Can not find ${packName} config, remove md5`);
                delete syncConfigCache.md5[packName];
            }
        }
        saveSyncConfigCache();
    }

    export function generateJsonToClient(pack: SyncPackageCache) {
        // @ts-ignore
        let clientJson: SyncClientConfig = {data: [], files: {}};
        clientJson.data = lodash.cloneDeep(pack.data);
        for (const datum of pack.data) {
            clientJson[datum] = lodash.cloneDeep(pack[datum]);
            delete clientJson[datum].delete;
            delete clientJson[datum].ignore;
        }
        clientJson.files = lodash.cloneDeep(pack.files);
        return clientJson;
    }

    function saveSyncConfig() {
        writeFileSync('config/SyncConfig.json', JSON.stringify(syncConfig, null, 2), 'utf-8');
    }

    function saveSyncConfigCache() {
        writeFileSync('config/syncConfigCache.json', JSON.stringify(syncConfigCache, null, 2), 'utf-8');
    }

    export function checkSyncCache() {
        logger.debug(`Checking sync file`);
        checkSyncFileUpdate();
        checkSyncFile();
        logger.debug(`Sync file check finish`);
    }
}
