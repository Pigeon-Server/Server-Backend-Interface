import {config} from "./config.mjs";
import {readFileSync, readdirSync, statSync} from 'fs';
import {join, relative} from 'path';
import crypto from 'crypto';
import moment from "moment-timezone";
import {error} from "./logger.mjs";
import stringRandom from 'string-random';
import {checkFileExist} from "./fileOperation.mjs";

moment.tz.setDefault('Asia/Shanghai');

export function randomNum(max) {
    return 1 + Math.round(Math.random() * (max - 1));
}

export function randomArr(max, length = 1) {
    if (length === 1) {
        return randomNum(max);
    }
    if (length > max) {
        length = max;
    }
    let output = [];
    while (length > 0) {
        let num = randomNum(max);
        if (output.includes(num)) {
            continue;
        }
        output.push(num);
        length--;
    }
    return output;
}

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

export function calculateMd5(filepath) {
    const buffer = readFileSync(filepath);
    const hash = crypto.createHash('md5');
    hash.update(buffer, 'utf8');
    return hash.digest('hex');
}

export function stringMd5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

export function generateKey() {
    return stringRandom(32, {
        letters: true,
        numbers: false
    })
}

export function listFiles(directory) {
    let filesArray = [];
    const files = readdirSync(directory);
    files.forEach(file => {
        const filePath = join(directory, file);
        const stat = statSync(filePath);
        if (stat.isFile()) {
            filesArray.push(filePath);
        } else if (stat.isDirectory()) {
            const subdirectoryFiles = listFiles(filePath);
            filesArray = filesArray.concat(subdirectoryFiles);
        }
    });
    return filesArray;
}

export function calculateFilesMd5(path) {
    const files = listFiles(path);
    const content = {};
    for (const file of files) {
        content[relative(path, file)] = calculateMd5(file);
    }
    return content;
}
