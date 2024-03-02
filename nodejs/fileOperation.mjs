/**
 * @file 文件目录相关操作
 * @module fileOperation
 * @author Half_nothing
 * @since 1.0.0
 */
import {accessSync, constants, writeFileSync, mkdirSync} from "fs";

/**
 * @function
 * @name checkDirExist
 * @description 检查一个目录是否存在<br/>如果存在则返回true<br/>如果不存在则返回false<br/>如果不存在且createFile为true<br/>则创建该目录
 * @param path {string} 要检查的目录
 * @param createDir {boolean} 如若目录不存在是否创建目录
 * @return {boolean} true 存在
 * @return {boolean} false 不存在
 * @author Half_nothing
 * @version 1.0.0
 * @since 1.0.0
 * @export
 */
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

/**
 * @function
 * @name checkFileExist
 * @description 检查一个文件是否存在<br/>如果存在则返回true<br/>如果不存在则返回false<br/>如果不存在且createFile为true<br/>则创建该文件并写入内容data<br/>options为文件写入时候的选项
 * @param path {string} 要检查的文件路径
 * @param createFile {boolean} 如若文件不存在是否创建文件
 * @param data {string} 要写入文件的内容,默认为空文件
 * @param options {{}} 写入文件时的选项,默认为{encoding: 'utf-8'}
 * @return {boolean} true 存在
 * @return {boolean} false 不存在
 * @author Half_nothing
 * @version 1.0.0
 * @since 1.0.0
 * @export
 */
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
