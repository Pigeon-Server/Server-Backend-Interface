/**
 * @file 配置文件相关操作
 * @module config
 * @author Half_nothing
 * @version 0.2.0
 * @since 0.2.0
 */
import {createRequire} from 'module';
import {checkFileExist} from "./fileOperation.mjs";

const require = createRequire(import.meta.url);

checkFileExist('syncConfig.json', true, "{}");

export const syncConfig = require('../syncConfig.json');

export const config = require('../config.json');

