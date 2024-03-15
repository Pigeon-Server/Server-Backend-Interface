/**********************************************
 * @file config.ts
 * @desc 配置文件加载
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.15
 * @license GNU General Public License (GPL)
 **********************************************/
import {FileUtils} from "@/utils/fileUtils";
import {logger} from "./logger";
import {readFileSync, writeFileSync} from "fs";
import checkDirExist = FileUtils.checkDirExist;
import checkFileExist = FileUtils.checkFileExist;

const configList: string[] = [
    "DatabaseConfig.json",
    "ServerConfig.json",
    "UpdateConfig.json",
    "SyncConfig.json"
];

if (!checkDirExist("config", true)) {
    logger.error("Config dir not exist, create and exit");
    process.exit(-1);
}

if (!checkDirExist("config/default", true)) {
    logger.error("Default config dir not exist, create and exit");
    process.exit(-1);
}

function checkConfigFile(fileName: string): boolean {
    if (!checkFileExist(`config/${fileName}`)) {
        logger.error(`${fileName} not found, check default config file.`);
        if (!checkFileExist(`config/default/${fileName}`)) {
            logger.error(`${fileName} default file not exist, please download from github, exit process.`);
            process.exit(-1);
        }
        writeFileSync(`config/${fileName}`,
            readFileSync(`config/default/${fileName}`, "utf8"),
            "utf8");
        logger.info(`Copy ${fileName} successfully, please edit config file.`);
        return false;
    }
    logger.debug(`${fileName} checked.`);
    return true;
}

logger.debug("Checking config file");
let exit = false;
configList.forEach((value) => {
    if (!checkConfigFile(value)) {
        exit = true;
    }
});
if (exit) process.exit(-1);
logger.debug("Config file check finish");

export namespace Config {
    // 数据库配置
    export const databaseConfig: DatabaseConfig = require("@config/DatabaseConfig.json");
    // 服务器配置
    export const serverConfig: ServerConfig = require("@config/ServerConfig.json");
    // 同步配置
    export const syncConfig: SyncConfig = require("@config/SyncConfig.json");
    // hmcl更新和同步配置
    export const updateConfig: UpdateConfig = require("@config/UpdateConfig.json");
}
