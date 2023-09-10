import {accessSync, constants, writeFileSync, mkdirSync} from "fs";

export function checkDirExist(path, createDir = false) {
    try {
        accessSync(path, constants.F_OK);
        return true;
    } catch (ignored) {
        if (createDir) {
            mkdirSync(path, {recursive: true});
        }
        return false;
    }
}

export function checkFileExist(path, createFile = false, data = "", options = {encoding: 'utf-8'}) {
    try {
        accessSync(path, constants.F_OK);
        return true;
    } catch (ignored) {
        if (createFile) {
            writeFileSync(path, data, options);
        }
        return false;
    }
}
