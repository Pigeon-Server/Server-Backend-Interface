import {syncConfig} from "./config.mjs";
import {logger} from "./logger.mjs";
import {calculateFilesMd5, calculateMd5, stringMd5} from "./utils.mjs";
import {checkDirExist, checkFileExist} from "./fileOperation.mjs";
import {createRequire} from "module";
import {writeFileSync} from "fs";
import {join} from "path";
import lodash from "lodash";

const require = createRequire(import.meta.url);

checkFileExist('syncConfigCache.json', true, JSON.stringify(syncConfig, null, 2));
export let syncConfigCache = require('../syncConfigCache.json');
const {md5} = syncConfigCache;
if (md5 === undefined) {
    logger.debug(`New Cache File Create, Generate Md5`);
    syncConfigCache.md5 = calculateMd5('syncConfig.json');
    checkSyncFile();
} else {
    const temp = calculateMd5('syncConfig.json');
    if (md5 === temp) {
        logger.debug(`syncConfig.json has not been updated, check cache file`);
    } else {
        logger.debug(`syncConfig.json has been updated, remake cache`);
        writeFileSync('syncConfigCache.json', JSON.stringify(syncConfig, null, 2), {encoding: "utf-8"});
        delete require.cache[require.resolve('../syncConfigCache.json')];
        syncConfigCache = require('../syncConfigCache.json');
        syncConfigCache.md5 = temp;
    }
    checkSyncFile();
    logger.debug(`syncConfigCache.json check finish`);
}

export function saveSyncConfigCache() {
    writeFileSync('syncConfigCache.json', JSON.stringify(syncConfigCache, null, 2), {encoding: 'utf-8'});
}

export function checkSyncFile() {
    for (const packName in syncConfigCache) {
        if (syncConfigCache.publicKey.includes(packName)) continue;
        const pack = syncConfigCache[packName];
        if (pack.init) continue;
        logger.debug(`Package ${packName} has not been init.`);
        const basePath = pack["basePath"];
        if (basePath === undefined) {
            logger.error(`Unable to find pack ${packName}'s path.`);
            continue;
        }
        logger.debug(`Package ${packName} now in process.`);
        logger.debug(`Package ${packName}'s path is ${basePath}.`);
        const {init, data} = pack;
        if (init === undefined) {
            logger.error(`Fail to load pack ${packName}`);
            continue;
        }
        for (const packKey in pack) {
            if (syncConfigCache.publicKey.includes(packKey)) {
                continue;
            }
            if (pack.data.includes(packKey)) {
                continue;
            }
            pack.data.push(packKey);
        }
        for (const datum of data) {
            const path = pack[datum]["serverPath"];
            const filePath = join(basePath, path);
            if (!checkDirExist(filePath, true)) {
                logger.error(`Path ${filePath} not exist, create dir.`);
            }
            const temp = calculateFilesMd5(filePath);
            for (const packElement of pack[datum]["delete"]) {
                temp[packElement] = 'del';
            }
            pack[datum]["files"] = temp;
        }
        for (const packKey in pack["files"]) {
            if (pack["files"][packKey] === 'del') {
                continue;
            }
            const path = join(basePath, packKey);
            if (!checkFileExist(path)) {
                logger.error(`File ${path} not found`);
                continue;
            }
            pack["files"][packKey] = calculateMd5(path);
        }
        const clientJson = generateJsonToClient(pack);
        pack.md5 = stringMd5(JSON.stringify(clientJson));
        pack.init = true;
    }
    saveSyncConfigCache();
}

export function generateJsonToClient(pack) {
    let clientJson = {};
    clientJson.data = lodash.cloneDeep(pack.data);
    for (const datum of pack.data) {
        clientJson[datum] = lodash.cloneDeep(pack[datum]);
        delete clientJson[datum]["delete"];
    }
    clientJson.files = lodash.cloneDeep(pack.files);
    return clientJson
}