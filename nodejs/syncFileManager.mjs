/**
 * @file 同步配置文件相关操作
 * @module syncFileManager
 * @author Half_nothing
 * @version 1.2.6
 * @since 1.0.0
 */
import {syncConfig} from "./config.mjs";
import {logger} from "./logger.mjs";
import {calculateFilesMd5, encryptFile, encryptMD5} from "./utils.mjs";
import {checkDirExist, checkFileExist} from "./fileOperation.mjs";
import {createRequire} from "module";
import {writeFileSync} from "fs";
import {join} from "path";
import lodash from "lodash";

const require = createRequire(import.meta.url);

checkFileExist('syncConfigCache.json', true, JSON.stringify(syncConfig, null, 2));
export const syncConfigCache = require('../syncConfigCache.json');

checkSyncFileUpdate();
checkSyncFile();

logger.debug(`syncConfigCache.json check finish`);

function saveSyncConfig() {
    writeFileSync('syncConfig.json', JSON.stringify(syncConfig, null, 2), {encoding: 'utf-8'});
}

function saveSyncConfigCache() {
    writeFileSync('syncConfigCache.json', JSON.stringify(syncConfigCache, null, 2), {encoding: 'utf-8'});
}

function checkSyncFileUpdate() {
    if (syncConfig.md5 === undefined) {
        syncConfig.md5 = {}
    }
    let needSave = false;
    for (const packName in syncConfig) {
        if (syncConfig.publicKey.includes(packName)) continue;
        logger.debug(`Calculate pack config ${packName}.`);
        const md5 = encryptMD5(JSON.stringify(syncConfig[packName]));
        if (!(packName in syncConfigCache)) {
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
    if (needSave) {
        saveSyncConfig();
    }
}

function checkSyncFile() {
    if (syncConfigCache.md5 === undefined) {
        syncConfigCache.md5 = {}
    }
    for (const packName in syncConfigCache) {
        if (syncConfigCache.publicKey.includes(packName)) continue;
        if (syncConfig[packName] === undefined) {
            delete syncConfigCache[packName];
            logger.debug(`Pack config ${packName} don't exist, delete config cache`);
            continue;
        }
        if (syncConfig.md5[packName] !== syncConfigCache.md5[packName]) {
            logger.debug(`Pack config ${packName} has been updated, remake config cache`);
            syncConfigCache[packName] = lodash.cloneDeep(syncConfig[packName]);
            syncConfigCache.md5[packName] = syncConfig.md5[packName];
        }
        const pack = syncConfigCache[packName];
        if (pack.init) {
            logger.debug(`Pack ${packName} check finish`);
            continue;
        }
        if (pack.data === undefined) {
            pack.data = [];
        }
        const basePath = pack["basePath"];
        if (basePath === undefined) {
            logger.error(`Unable to find pack ${packName}'s path.`);
            continue;
        }
        logger.debug(`Package ${packName} now in process.`);
        logger.debug(`Package ${packName}'s path is ${basePath}.`);
        for (const packKey in pack) {
            if (syncConfigCache.publicKey.includes(packKey)) {
                continue;
            }
            if (pack.data.includes(packKey)) {
                continue;
            }
            pack.data.push(packKey);
        }
        for (const datum of pack.data) {
            const path = pack[datum]["serverPath"];
            const filePath = join(basePath, path);
            if (!checkDirExist(filePath, true)) {
                logger.error(`Path ${filePath} not exist, create dir.`);
            }
            const temp = calculateFilesMd5(filePath, pack[datum].ignore);
            if (pack[datum].delete !== undefined) {
                for (const packElement of pack[datum].delete) {
                    temp[packElement] = 'del';
                }
            }
            pack[datum].files = temp;
        }
        for (const packKey in pack.files) {
            if (pack.files[packKey] === 'del') {
                continue;
            }
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
    }
    saveSyncConfigCache();
}

export function generateJsonToClient(pack) {
    let clientJson = {};
    clientJson.data = lodash.cloneDeep(pack.data);
    for (const datum of pack.data) {
        clientJson[datum] = lodash.cloneDeep(pack[datum]);
        delete clientJson[datum].delete;
        delete clientJson[datum].ignore;
    }
    clientJson.files = lodash.cloneDeep(pack.files);
    return clientJson
}
