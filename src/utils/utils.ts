/**********************************************
 * @file 工具
 * @module utils
 * @author Half_nothing
 * @version 1.0.4
 * @since 1.0.0
 * @date 2024.03.03
 **********************************************/
import type {Response} from "express";
import moment from "moment-timezone";
import {logger} from "@/base/logger";

import stringRandom from 'string-random';
import {Config} from "@/base/config";
import serverConfig = Config.serverConfig;
import updateConfig = Config.updateConfig;

moment.tz.setDefault('Asia/Shanghai');

export namespace Utils {
    export function dataBaseInjectionFiltering(str: string): RegExpMatchArray | null {
        return str.toString().toLowerCase().match("\b(and|drop|;|sleep|\'|delete|or|true|false|version|insert|into|select|join|like|union|update|where|\")\b");
    }

    export function checkInput(array: string[]): boolean {
        for (const item in array) {
            if (array[item] && dataBaseInjectionFiltering(array[item])) {
                logger.error(`SQL injection detected, illegal statement: ${array[item]}`);
                return true;
            }
        }
        return false;
    }

    export function enableHSTS(res: Response): void {
        if (!serverConfig.https.enable || !serverConfig.https.enableHSTS) {
            return
        }
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    export function getTime(later: boolean): string {
        if (later)
            return moment().add(updateConfig.apikey.timeout, "seconds").format('YYYY-MM-DD HH:mm:ss');
        return moment().format('YYYY-MM-DD HH:mm:ss');
    }

    export function generateKey(): string {
        return stringRandom(32, {letters: true, numbers: false});
    }
}




