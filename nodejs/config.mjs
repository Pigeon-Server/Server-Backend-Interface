import {createRequire} from 'module';
import {writeFileSync} from 'fs';
import {checkFileExist} from "./fileOperation.mjs";

const require = createRequire(import.meta.url);

checkFileExist('syncConfig.json', true, "{}");

export const syncConfig = require('../syncConfig.json');
export const config = require('../config.json');

export function saveSyncConfig() {
    writeFileSync('syncConfig.json', JSON.stringify(syncConfig, null, 2), {encoding: 'utf-8'});
}
