/**
 * @file 配置文件相关操作
 * @module config
 * @author Half_nothing
 * @since 1.0.0
 */
import {createRequire} from 'module';
import {checkFileExist} from "./fileOperation.mjs";

const require = createRequire(import.meta.url);

checkFileExist('SyncConfig.json', true, "{}");

export const syncConfig = require('../config/SyncConfig.json');

export const config = require('../config.json');

