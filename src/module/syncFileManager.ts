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
import {Utils} from "@/utils/utils";
import {Database} from "@/database/database";

export namespace SyncFileManager {
    import syncConfig = Config.syncConfig;
    import calculateFilesMd5 = FileUtils.calculateFilesMd5;
    import encryptFile = EncryptUtils.encryptFile;
    import encryptMD5 = EncryptUtils.encryptMD5;
    import checkFileExist = FileUtils.checkFileExist;
    import checkDirExist = FileUtils.checkDirExist;
    import updateConfig = Config.updateConfig;
    import translateStringToArray = Utils.translateStringToArray;

    checkDirExist('cache', true);
    checkFileExist('cache/SyncConfigCache.json', true, JSON.stringify(syncConfig, null, 2));

    export const syncConfigCache: SyncCacheConfig = require('@cache/SyncConfigCache.json');

    async function checkSyncFileUpdate() {
        if (syncConfig.md5 === undefined) {
            syncConfig.md5 = {}
        }
        let excludeConfig: string[] = [];
        if (updateConfig.useDatabase) {
            await getStoredSyncConfig(excludeConfig);
        }
        for (const packName in syncConfig) {
            if (syncConfig.ignoredKey.includes(packName)) continue;
            if (excludeConfig.includes(packName)) continue;
            const md5 = encryptMD5(JSON.stringify(syncConfig[packName]));
            if (syncConfig.md5[packName]) {
                if (syncConfig.md5[packName] === md5) {
                    logger.debug(`SyncConfig: ${packName} has no change.`);
                    continue;
                }
                logger.debug(`SyncConfig: ${packName} has been changed, new md5: ${md5}.`);
            } else {
                logger.debug(`SyncConfig: New pack added ${packName}(${md5})`);
            }
            syncConfig.md5[packName] = md5;
        }
        for (const packName in syncConfig.md5) {
            if (!(packName in syncConfig)) {
                logger.debug(`SyncConfig: Can not find ${packName} config, remove md5`);
                delete syncConfig.md5[packName];
            }
        }
        saveSyncConfig();
    }

    function checkSyncConfigCache() {
        if (syncConfigCache.md5 === undefined) {
            syncConfigCache.md5 = {};
        }
        for (const packName in syncConfigCache) {
            if (syncConfigCache.ignoredKey.includes(packName)) continue;
            // if cache pack config not in config file, delete cache
            if (!(packName in syncConfig)) {
                delete syncConfigCache[packName];
                logger.debug(`SyncConfigCacheCheck: Pack config ${packName} don't exist, delete config cache`);
                continue;
            }
            if (syncConfig.md5[packName] === syncConfigCache.md5[packName]) {
                logger.debug(`SyncConfigCacheCheck: Pack config ${packName} has no change`);
                continue;
            }
            // if cache md5 diff from config md5, remake cache
            logger.debug(`SyncConfigCacheCheck: Pack config ${packName} has been updated, remake config cache`);
            syncConfigCache[packName] = lodash.cloneDeep(syncConfig[packName]) as SyncPackageCache;
            syncConfigCache.md5[packName] = syncConfig.md5[packName];
            syncConfigCache[packName].init = false;
        }
        for (const packName in syncConfig.md5) {
            // if config not in cache
            if (!(packName in syncConfigCache)) {
                logger.debug(`SyncConfigCacheCheck: New pack cache added ${packName}(${syncConfig.md5[packName]})`);
                syncConfigCache.md5[packName] = syncConfig.md5[packName];
                syncConfigCache[packName] = lodash.cloneDeep(syncConfig[packName]) as SyncPackageCache;
                syncConfigCache[packName].init = false;
            }
        }
        for (const packName in syncConfigCache.md5) {
            // if pack config not in cache, delete this config
            if (!(packName in syncConfigCache)) {
                logger.debug(`SyncConfigCacheCheck: Can not find ${packName} config, remove md5`);
                delete syncConfigCache.md5[packName];
            }
        }
    }

    function makeSyncConfigCache() {
        for (const packName in syncConfigCache.md5) {
            const pack = syncConfigCache[packName];
            if (pack.init) {
                logger.debug(`SyncConfigCache: Pack ${packName} has been init, check finish`);
                continue;
            }
            if (pack.data === undefined) {
                pack.data = [];
            }
            const basePath = pack.basePath;
            if (basePath === undefined) {
                logger.error(`SyncConfigCache: Unable to find pack ${packName}'s path.`);
                continue;
            }
            logger.debug(`SyncConfigCache: Package ${packName} now in process.`);
            logger.debug(`SyncConfigCache: Package ${packName}'s path is ${basePath}.`);
            for (const packKey in pack) {
                if (syncConfigCache.ignoredKey.includes(packKey)) continue;
                if (pack.data.includes(packKey)) continue;
                pack.data.push(packKey);
            }
            for (const folderName of pack.data) {
                const path = pack[folderName].serverPath;
                const filePath = join(basePath, path);
                if (!checkDirExist(filePath, true)) {
                    logger.error(`SyncConfigCache: Path ${filePath} not exist, create dir.`);
                    continue;
                }
                const temp = calculateFilesMd5(filePath, pack[folderName].ignore);
                if (pack[folderName].delete !== undefined) {
                    for (const packElement of pack[folderName].delete!) {
                        temp[packElement] = 'del';
                    }
                }
                pack[folderName].files = temp;
            }
            if (pack.files) {
                for (const packKey in pack.files) {
                    if (pack.files[packKey] === 'del') continue;
                    const path = join(basePath, packKey);
                    if (!checkFileExist(path)) {
                        logger.error(`SyncConfigCache: File ${path} not found`);
                        continue;
                    }
                    pack.files[packKey] = encryptFile(path, encryptMD5);
                }
            } else {
                pack.files = {};
            }
            const clientJson = generateJsonToClient(pack);
            pack.md5 = encryptMD5(JSON.stringify(clientJson));
            pack.init = true;
            logger.debug(`SyncConfigCache: Pack ${packName} init finish`);
        }
        saveSyncConfigCache();
    }

    export function generateJsonToClient(pack: SyncPackageCache) {
        const clientJson = {} as SyncClientConfig;
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
        writeFileSync('cache/SyncConfigCache.json', JSON.stringify(syncConfigCache, null, 2), 'utf-8');
    }

    async function getStoredSyncConfig(excludeConfig: string[]) {
        const data = await Database.getAllSyncConfig();
        translateStringToArray(data);
        for (const datum of data) {
            if (datum.configName === undefined) {
                continue;
            }
            excludeConfig.push(datum.configName);
            if (!datum.enable || datum.deleted) {
                // config disable
                // if it has stored in local file
                // delete it
                logger.debug(`SyncConfigDB: ${datum.configName} config disable or has marked delete`);
                if (datum.configName in syncConfig) {
                    delete syncConfig[datum.configName];
                }
                continue;
            }
            const temp = {
                basePath: datum.serverPath.startsWith(updateConfig.fileBasePath) ? datum.serverPath : join(updateConfig.fileBasePath, datum.serverPath),
                files: (<string[]>datum.syncFiles).reduce((tmp, value) => {
                    tmp[value] = null;
                    return tmp;
                }, {} as { [key: string]: null })
            } as SyncPackage;
            // select sync folders from database
            const detail = await Database.getSyncConfigDetail(datum.ruleId);
            if (detail.length !== 0) {
                translateStringToArray(detail);
                for (const re of detail) {
                    if (re.clientPath === undefined) {
                        continue;
                    }
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
                await Database.updateSyncConfigMd5(datum.ruleId, md5);
            }
            // syncConfig stored in syncConfigFile and has md5 record
            if (datum.configName in syncConfig &&
                datum.configName in syncConfig.md5 &&
                syncConfig.md5[datum.configName] === datum.md5) {
                // same md5, change nothing
                logger.debug(`SyncConfigDB: ${datum.configName} has no change`);
                continue;
            }
            // if syncConfig not stored in syncConfigFile or
            // no md5 record or
            // has difference between local md5 and database md5
            // write md5 and syncConfig to local file
            if (datum.configName in syncConfig) {
                logger.debug(`SyncConfigDB: ${datum.configName} has been changed, new md5: ${md5}`);
            } else {
                logger.debug(`SyncConfigDB: New pack added ${datum.configName}(${md5})`);
            }
            syncConfig.md5[datum.configName] = datum.md5;
            syncConfig[datum.configName] = temp;
        }
        saveSyncConfig();
    }

    export async function reloadSyncConfig() {
        try {
            await checkSyncCache();
            return true;
        } catch (e: any) {
            logger.error(e);
            return false;
        }
    }

    export async function checkSyncCache() {
        logger.debug(`SyncManager: Checking sync file`);
        await checkSyncFileUpdate();
        checkSyncConfigCache();
        makeSyncConfigCache();
        logger.debug(`SyncManager: Sync file check finish`);
    }
}
