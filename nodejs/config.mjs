import {createRequire} from 'module';
import {accessSync, constants, writeFileSync} from 'fs';

const require = createRequire(import.meta.url);
export const config = require('../config.json');
try {
    accessSync('update/packages.json', constants.F_OK)
} catch (ignored) {
    writeFileSync(new URL('../update/packages.json', import.meta.url), "{}", {encoding: 'utf-8'});
}
export const packageConfig = require('../update/packages.json');

export function savePackageConfig() {
    writeFileSync(new URL('../update/packages.json', import.meta.url), JSON.stringify(packageConfig), {encoding: 'utf-8'});
}
