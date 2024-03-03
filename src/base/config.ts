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

configList.forEach((value) => {
    if (!checkConfigFile(value)) {
        process.exit(-1);
    }
});

export namespace Config {
    export const databaseConfig = require("@config/DatabaseConfig.json");
    export const serverConfig = require("@config/ServerConfig.json");
    export const syncConfig = require("@config/SyncConfig.json");
    export const updateConfig = require("@config/UpdateConfig.json");
}