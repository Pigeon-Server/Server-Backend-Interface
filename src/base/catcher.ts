/**********************************************
 * @file catcher.ts
 * @desc 全局异常捕获器
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.2
 * @date 2024.03.11
 * @license GNU General Public License (GPL)
 **********************************************/
import process from "node:process";
import {logger} from "@/base/logger";
import log4js from "log4js";

export const initCatcher = () => {
    logger.debug("Init GEC(Global Exception Catcher)...");

    process.on('uncaughtException', (err: Error) => {
        logger.error("UncaughtException: " + err.message);
        logger.error(err.stack);
    });

    process.on('unhandledRejection', (err: Error) => {
        logger.error("UnhandledRejection: " + err.message);
        logger.error(err.stack);
    });

    logger.debug("GEC init finish");
};
