/**********************************************
 * @file apiManager.ts
 * @desc 工具类
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.03
 * @license GNU General Public License (GPL)
 **********************************************/
import type {Response} from "express";
import moment from "moment-timezone";
import {logger} from "@/base/logger";

import stringRandom from 'string-random';
import {Config} from "@/base/config";
import serverConfig = Config.serverConfig;
import updateConfig = Config.updateConfig;
import {DurationInputArg2} from "moment/moment";

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

    export function getTime(later: boolean,
                            lateTime: number = updateConfig.apikey.timeout,
                            timeUnit: DurationInputArg2 = "seconds",
                            timeFormat: string = "YYYY-MM-DD HH:mm:ss"): string {
        if (later)
            return moment().add(lateTime, timeUnit).format(timeFormat);
        return moment().format(timeFormat);
    }

    export function generateKey(): string {
        return stringRandom(32, {letters: true, numbers: false});
    }
}
