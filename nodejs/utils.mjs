/**
 * @file 工具
 * @module utils
 * @author Half_nothing
 * @version 1.0.4
 * @since 1.0.0
 */
import {config} from "./config.mjs";
import {readFileSync, readdirSync, statSync} from 'fs';
import {join, relative} from 'path';
import {createHash} from 'crypto';
import moment from "moment-timezone";
import {error} from "./logger.mjs";
import stringRandom from 'string-random';

moment.tz.setDefault('Asia/Shanghai');

export function dataBaseInjectionFiltering(str) {
    return str.toString().toLowerCase().match("\b(and|drop|;|sleep|\'|delete|or|true|false|version|insert|into|select|join|like|union|update|where|\")\b");
}

export function checkInput(array) {
    for (const item in array) {
        if (array[item] && dataBaseInjectionFiltering(array[item])) {
            error.error(`SQL injection detected, illegal statement: ${array[item]}`);
            return true;
        }
    }
    return false;
}

export function enableHSTS(res) {
    if (!config.https.enable || !config.https.enableHSTS) {
        return
    }
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

export function getTime(later) {
    if (later)
        return moment().add(config.apikey.timeout, "seconds").format('YYYY-MM-DD HH:mm:ss');
    return moment().format('YYYY-MM-DD HH:mm:ss');
}

export function generateKey() {
    return stringRandom(32, {letters: true, numbers: false});
}

export function encrypt(algorithm, content) {
    return createHash(algorithm).update(content, 'utf8').digest('hex');
}

export function encryptFile(filePath, encrypt) {
    return encrypt.call(null, readFileSync(filePath));
}

export function encryptSHA1(content) {
    return encrypt('sha1', content);
}

export function encryptMD5(content) {
    return encrypt('md5', content);
}

export function listFiles(directory, ignoreList = undefined) {
    let filesArray = [];
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
            const subdirectoryFiles = listFiles(filePath, ignoreList);
            filesArray = filesArray.concat(subdirectoryFiles);
        }
    });
    return filesArray;
}

export function calculateFilesMd5(path, ignoreList) {
    const files = listFiles(path, ignoreList);
    const content = {};
    for (const file of files) {
        content[relative(path, file)] = encryptFile(file, encryptMD5);
    }
    return content;
}
