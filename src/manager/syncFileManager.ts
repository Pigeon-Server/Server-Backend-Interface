/**********************************************
 * @file syncFileManager.ts
 * @desc 同步配置文件解析和缓存生成
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.04
 * @license GNU General Public License (GPL)
 **********************************************/
import {Config} from "@/base/config";
import {logger} from "@/base/logger";
import {EncryptUtils} from "@/utils/encryptUtils";
import {FileUtils} from "@/utils/fileUtils";
import {writeFileSync} from "fs";
import {join} from "path";
import lodash from "lodash";
import {Database} from "@/base/mysql";
import {SyncConfigBaseData} from "@/type/database";

export namespace SyncFileManager {
    import syncConfig = Config.syncConfig;
    import calculateFilesMd5 = FileUtils.calculateFilesMd5;
    import encryptFile = EncryptUtils.encryptFile;
    import encryptMD5 = EncryptUtils.encryptMD5;
    import checkFileExist = FileUtils.checkFileExist;
    import checkDirExist = FileUtils.checkDirExist;
    import updateConfig = Config.updateConfig;

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

    function translateStringToArray(data: SyncConfigBaseData[]) {
        for (const datum of data) {
            if (datum.syncFiles) {
                if (typeof datum.syncFiles === "string") {
                    datum.syncFiles = datum.syncFiles.split(',');
                }
            } else {
                datum.syncFiles = [];
            }
            if (datum.ignoreFile) {
                if (typeof datum.ignoreFile === "string") {
                    datum.ignoreFile = datum.ignoreFile.split(',');
                }
            } else {
                datum.ignoreFile = [];
            }
            if (datum.deleteFile) {
                if (typeof datum.deleteFile === "string") {
                    datum.deleteFile = datum.deleteFile.split(',');
                }
            } else {
                datum.deleteFile = [];
            }
        }
    }

    async function getStoredSyncConfig() {
        const data = await Database.INSTANCE.getAllSyncConfig();
        translateStringToArray(data);
        for (const datum of data) {
            if (datum.enable === 0) {
                // config disable
                // if it has stored in local file
                // delete it
                if (datum.configName in syncConfig) {
                    delete syncConfig[datum.configName];
                }
                if (datum.configName in syncConfig.md5) {
                    delete syncConfig.md5[datum.configName]
                }
                continue;
            }
            const temp = {
                basePath: datum.serverPath,
                files: (<string[]>datum.syncFiles).reduce((tmp, value) => {
                    tmp[value] = null;
                    return tmp;
                }, {} as { [key: string]: null })
            } as SyncPackage;
            // select sync folders from database
            const detail = await Database.INSTANCE.getSyncConfig(datum.ruleId);
            if (detail.length !== 0) {
                translateStringToArray(detail);
                for (const re of detail) {
                    temp[re.clientPath] = {
                        mode: re.syncMode,
                        serverPath: re.serverPath,
                        ignore: re.ignoreFile as string[],
                        delete: re.deleteFile as string[]
                    } as SyncFolder;
                }
            }
            const md5 = encryptMD5(JSON.stringify(temp));
            if (datum.md5 === undefined || datum.md5 !== md5) {
                datum.md5 = md5;
                await Database.INSTANCE.updateSyncConfigMd5(datum.ruleId, md5);
            }
            // syncConfig stored in syncConfigFile and has md5 record
            if (datum.configName in syncConfig &&
                datum.configName in syncConfig.md5 &&
                syncConfig.md5[datum.configName] === datum.md5) {
                // save md5, change nothing
                continue;
            }
            // if syncConfig not stored in syncConfigFile or
            // no md5 record or
            // has difference between local md5 and database md5
            // write md5 and syncConfig to local file
            syncConfig.md5[datum.configName] = datum.md5;
            syncConfig[datum.configName] = temp;
        }
        for (const packName in syncConfig.md5) {
            if (!(packName in syncConfig)) {
                delete syncConfig.md5[packName];
            }
        }
        saveSyncConfig();
    }

    export async function checkSyncCache() {
        logger.debug(`Checking sync file`);
        if (updateConfig.useDatabase) {
            await getStoredSyncConfig();
        } else {
            checkSyncFileUpdate();
        }
        checkSyncFile();
        logger.debug(`Sync file check finish`);
    }
}
