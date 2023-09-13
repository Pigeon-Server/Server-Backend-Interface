import {createRequire} from 'module';
import {checkFileExist} from "./fileOperation.mjs";

const require = createRequire(import.meta.url);

checkFileExist('syncConfig.json', true, "{}");

export const syncConfig = require('../syncConfig.json');
export const config = require('../config.json');

