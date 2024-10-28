/**********************************************
 * @file fileUtils.ts
 * @desc 文件目录相关操作
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.03
 * @license GNU General Public License (GPL)
 **********************************************/
import fs, {accessSync, constants, mkdirSync, readdirSync, statSync, WriteFileOptions, writeFileSync} from "fs";
import {join, relative} from "path";
import {EncryptUtils} from "./encryptUtils";
import moment from "moment-timezone";

/**
 * @namespace FileUtils
 * @desc 文件系统操作类
 * @export
 */
export namespace FileUtils {

    export enum FileOperation {
        FILE_RENAME,
        FILE_MOVE,
        FILE_COPY,
        DIR_RENAME,
        DIR_MOVE,
        DIR_COPY
    }

    export enum CheckResult {
        PASSED,
        SOURCE_NOT_FOUND,
        DEST_EXIST
    }

    import encryptFile = EncryptUtils.encryptFile;
    import encryptMD5 = EncryptUtils.encryptMD5;

    /**
     * @function
     * @desc 检查一个目录是否存在
     * @desc 如果不存在且createFile为true则创建该目录
     * @param path {string} 要检查的目录
     * @param createDir {boolean} 如若目录不存在是否创建目录
     * @param callback {Runnable<boolean>} 回调函数
     * @return {true} 存在
     * @return {false} 不存在
     * @return {void} 当传入回调函数时不返回值
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    export function checkDirExist(path: string, createDir: boolean = false, callback?: Runnable<boolean>): void | boolean {
        try {
            accessSync(path, constants.F_OK);
            const stat = statSync(path);
            if (stat.isDirectory()) {
                return callback ? callback(true) : true;
            }
            return callback ? callback(false) : false;
        } catch (_) {
            if (createDir) {
                mkdirSync(path, {recursive: true});
            }
            return callback ? callback(false) : false;
        }
    }

    /**
     * @function
     * @desc 检查一个文件是否存在
     * @desc 如果不存在且createFile为true则创建该文件并写入内容data
     * @desc options为文件写入时候的选项
     * @param path {string} 要检查的文件路径
     * @param createFile {boolean} 如若文件不存在是否创建文件
     * @param data {string} 要写入文件的内容,默认为空文件
     * @param options {WriteFileOptions} 写入文件时的选项,默认为"utf-8"
     * @param callback {Runnable<boolean>} 回调函数
     * @return {true} 存在
     * @return {false} 不存在
     * @return {void} 当传入回调函数时不返回值
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    export function checkFileExist(path: string, createFile: boolean = false, data: string = "",
                                   options: WriteFileOptions = 'utf-8', callback?: Runnable<boolean>): void | boolean {
        try {
            accessSync(path, constants.F_OK);
            const stat = statSync(path);
            if (stat.isFile()) {
                return callback ? callback(true) : true;
            }
            return callback ? callback(false) : false;
        } catch (_) {
            if (createFile) {
                writeFileSync(path, data, options);
            }
            return callback ? callback(false) : false;
        }
    }

    /**
     * @function
     * @desc 递归列出某个目录下面的所有文件
     * @param directory 要列出文件的目录路径
     * @param ignoreList 忽略的路径或者文件名列表
     * @return {string[]} 存储所有文件路径的列表
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    export function listAllFiles(directory: string, ignoreList?: string[]): string[] {
        let filesArray: string[] = [];
        const files = readdirSync(directory);
        files.forEach(file => {
            const filePath = join(directory, file);
            const stat = statSync(filePath);
            if (ignoreList !== undefined && (ignoreList.includes(filePath) || ignoreList.includes(file))) {
                return;
            }
            if (stat.isFile()) {
                filesArray.push(filePath);
            } else if (stat.isDirectory()) {
                const subdirectoryFiles = listAllFiles(filePath, ignoreList);
                filesArray = filesArray.concat(subdirectoryFiles);
            }
        });
        return filesArray;
    }

    /**
     * @function
     * @desc 计算指定目录下所有文件的MD5值
     * @param path 指定目录路径
     * @param ignoreList 忽略的路径或者文件名列表
     * @return 返回一个字典,键是文件路径,值是该文件的MD5值
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    export function calculateFilesMd5(path: string, ignoreList?: string[]): { [key: string]: string } {
        const files = listAllFiles(path, ignoreList);
        const content: { [key: string]: string } = {};
        for (const file of files) {
            content[relative(path, file)] = encryptFile(file, encryptMD5);
        }
        return content;
    }

    export function getFileTree(directory: string) {
        const tree: FileInfo[] = [];
        const files = readdirSync(directory);
        files.forEach(file => {
            const filePath = join(directory, file);
            const stat = statSync(filePath);
            if (stat.isFile()) {
                tree.push({
                    name: file,
                    path: filePath,
                    isFile: true,
                    size: stat.size,
                    editTime: moment(stat.ctime).format("YYYY-MM-DD HH:mm:ss")
                } as FileInfo);
            } else if (stat.isDirectory()) {
                tree.push({
                    name: file,
                    path: filePath,
                    isFile: false,
                    editTime: moment(stat.ctime).format("YYYY-MM-DD HH:mm:ss")
                } as FileInfo);
            }
        });
        tree.sort((a, b) => {
            return a.isFile ? 1 : -1;
        });
        return tree;
    }

    export function checkFileOperation(operation: FileOperation, sourcePath: string, destPath: string): CheckResult {
        switch (operation) {
            case FileOperation.FILE_RENAME:
            case FileOperation.FILE_MOVE:
            case FileOperation.FILE_COPY:
                if (checkFileExist(destPath)) {
                    return CheckResult.DEST_EXIST;
                }
                if (!checkFileExist(sourcePath)) {
                    return CheckResult.SOURCE_NOT_FOUND;
                }
                break;
            case FileOperation.DIR_RENAME:
            case FileOperation.DIR_MOVE:
            case FileOperation.DIR_COPY:
                if (checkDirExist(destPath)) {
                    return CheckResult.DEST_EXIST;
                }
                if (!checkDirExist(sourcePath)) {
                    return CheckResult.SOURCE_NOT_FOUND;
                }
                break
        }
        return CheckResult.PASSED;
    }
}
