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

import stringRandom from 'string-random';
import {Config} from "@/base/config";
import {DurationInputArg2} from "moment/moment";
import {SyncRule} from "@/database/model/syncRule";
import serverConfig = Config.serverConfig;
import updateConfig = Config.updateConfig;

moment.tz.setDefault('Asia/Shanghai');

export namespace Utils {

    export enum TimeOperation {
        None,
        Later,
        Early
    }

    export function enableHSTS(res: Response): void {
        if (!serverConfig.https.enable || !serverConfig.https.enableHSTS) {
            return
        }
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    export function getDate(operation: TimeOperation,
                            time: number = updateConfig.api.timeout,
                            timeUnit: DurationInputArg2 = "seconds"): Date {
        switch (operation) {
            case TimeOperation.None:
                return moment().toDate();
            case Utils.TimeOperation.Later:
                return moment().add(time, timeUnit).toDate();
            case Utils.TimeOperation.Early:
                return moment().subtract(time, timeUnit).toDate();
        }
    }

    export function translateTime(time: string): number {
        time = time.toLowerCase();
        const timeNumber = parseInt(time.substring(0, time.length - 1), 10);
        switch (time.charAt(time.length - 1)) {
            case 's':
                return timeNumber;
            case 'm':
                return timeNumber * 60;
            case 'h':
                return timeNumber * 60 * 60;
            case 'd':
                return timeNumber * 60 * 60 * 24;
            case 'y':
                return timeNumber * 60 * 60 * 24 * 365;
            default:
                return timeNumber;
        }
    }

    export function generateKey(): string {
        return stringRandom(32, {letters: true, numbers: true, specials: false});
    }

    export function translateStringToArray(data: SyncRule | SyncRule[]) {
        if (!Array.isArray(data)) {
            data = [data];
        }
        for (const datum of data) {
            if (datum.syncFiles) {
                if (typeof datum.syncFiles === "string") {
                    datum.syncFiles = datum.syncFiles.split(',');
                }
            } else {
                datum.syncFiles = [];
            }
            if (datum.ignoreFile) {
                if (typeof datum.ignoreFile === "string") {
                    datum.ignoreFile = datum.ignoreFile.split(',');
                }
            } else {
                datum.ignoreFile = [];
            }
            if (datum.deleteFile) {
                if (typeof datum.deleteFile === "string") {
                    datum.deleteFile = datum.deleteFile.split(',');
                }
            } else {
                datum.deleteFile = [];
            }
        }
    }

    export function sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
