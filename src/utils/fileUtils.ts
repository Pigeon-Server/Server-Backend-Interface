import {accessSync, constants, writeFileSync, mkdirSync} from "fs";

export namespace FileUtils {
    export function checkDirExist(path: string, createDir: boolean = false, callback?: Runnable<boolean>): void | boolean {
        try {
            accessSync(path, constants.F_OK);
            return callback ? callback(true) : true;
        } catch (_) {
            if (createDir) {
                mkdirSync(path, {recursive: true});
            }
            return callback ? callback(false) : false;
        }
    }

    export function checkFileExist(path: string, createFile: boolean = false, data: string = "",
                                   options: {} = {encoding: 'utf-8'}, callback?: Runnable<boolean>): void | boolean {
        try {
            accessSync(path, constants.F_OK);
            return callback ? callback(true) : true;
        } catch (_) {
            if (createFile) {
                writeFileSync(path, data, options);
            }
            return callback ? callback(false) : false;
        }
    }
}
