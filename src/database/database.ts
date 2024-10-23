import {Op, Sequelize} from '@sequelize/core';
import {MySqlDialect} from '@sequelize/mysql';
import {Config} from "@/base/config";
import {dbLogger} from "@/base/logger";
import {User} from "@/database/model/user";
import {AccessKey} from "@/database/model/key";
import {Account} from "@/database/model/account";
import {SyncRule} from "@/database/model/syncRule";
import process from "node:process";
import {Utils} from "@/utils/utils";
import {join as _join} from "lodash";
import databaseConfig = Config.databaseConfig;

export namespace Database {
    import getDate = Utils.getDate;
    export const database = new Sequelize({
        dialect: MySqlDialect,
        ...databaseConfig.config,
        waitForConnections: true,
        multipleStatements: false,
        queueLimit: 0,
        logging: (sql: string) => {
            dbLogger.debug(sql);
        },
        models: [User, AccessKey, Account, SyncRule]
    });

    export function initDatabase(callback?: Callback) {
        database.authenticate().then(() => {
            dbLogger.info("Connect to database successfully.");
            database.sync().then(() => {
                database.queryRaw(`CREATE EVENT IF NOT EXISTS \`updateKey\` ` +
                    `ON SCHEDULE EVERY ${String(databaseConfig.updateTime)} SECOND ` +
                    `DO UPDATE ${databaseConfig.prefix}_key SET \`enable\` = FALSE WHERE \`enable\` = TRUE ` +
                    `AND UNIX_TIMESTAMP(expirationTime) + ${String(databaseConfig.updateTime)} <UNIX_TIMESTAMP(now());;`)
                    .then(() => {
                        dbLogger.info(`Database initialized.`);
                        if (callback) {
                            callback();
                        }
                    }).catch(err => {
                    dbLogger.error(`Database event init error!`);
                    dbLogger.error(err.message);
                    process.exit(-1);
                });
            }).catch((err) => {
                dbLogger.error(`Database init error!`);
                dbLogger.error(err.message);
                process.exit(-1);
            });
        }).catch((err) => {
            dbLogger.error(`Database connect error!`);
            dbLogger.error(err.message);
            process.exit(-1);
        });
    }

    export function addUserAccount(info: PlayerFullInfo) {
        return User.create({
            username: info.username,
            uuid: info.uuid,
            mac: info.macAddress,
            ip: info.ip
        });
    }

    export function checkUserAccount(info: PlayerLiteInfo) {
        return User.findOne({
            where: {
                username: info.username,
                uuid: info.uuid,
                mac: info.macAddress
            },
            attributes: ['username']
        });
    }

    export async function updateTime(info: PlayerUpdateInfo) {
        const user = await User.findOne({
            where: {
                username: info.username,
                uuid: info.uuid,
                mac: info.macAddress
            }
        });
        if (user === null) {
            return null;
        }
        user.ip = info.ip;
        if (info.packName) {
            user.lastPack = info.packName;
        }
        return user.save();
    }

    export function getKey(info: PlayerGetKeyInfo) {
        return AccessKey.findOne({
            where: {
                username: info.username,
                uuid: info.uuid,
                mac: info.macAddress,
                pack: info.packName,
                enable: true
            },
            attributes: ["username", "uuid", "accessKey"]
        });
    }

    export function createKey(info: PlayerCreateKeyInfo) {
        return AccessKey.create({
            username: info.username,
            uuid: info.uuid,
            mac: info.macAddress,
            ip: info.ip,
            pack: info.packName,
            accessKey: info.key,
            enable: true,
            expirationTime: getDate(true)
        });
    }

    export async function getAllSyncConfig() {
        return await SyncRule.findAll({
            where: {
                root: true
            }
        });
    }

    export function getSyncConfigRoot(id: number) {
        return SyncRule.findOne({
            where: {
                root: true,
                ruleId: id
            }
        });
    }

    export function getSyncConfigDetail(id: number) {
        return SyncRule.findAll({
            where: {
                root: false,
                ruleId: id
            }
        });
    }

    export function getSyncConfigPage(start: number, end: number, search: string) {
        return SyncRule.findAll({
            where: {
                root: true,
                configName: {
                    [Op.like]: `%${search}%`
                },
                ruleId: {
                    [Op.between]: [start < 0 ? 0 : start, end > start ? end : start]
                }
            },
            attributes: [
                ["id", "uuid"],
                ["ruleId", "id"],
                ["configName", "name"],
                ["enable", "activity"],
                "createTime",
                "updateTime"
            ]
        })
    }

    export function updateSyncConfigMd5(id: number, md5: string) {
        return SyncRule.update({
            md5: md5,
        }, {
            where: {
                root: true,
                ruleId: id
            }
        });
    }

    export async function updateSyncConfigRoot(id: number, basePath: string, ruleName: string, files: RuleFile[]) {
        const syncConfig = await SyncRule.findOne({
            where: {
                root: true,
                ruleId: id
            }
        });
        if (syncConfig === null) {
            return null;
        }
        syncConfig.serverPath = basePath;
        syncConfig.configName = ruleName;
        syncConfig.syncFiles = files.length === 0 ? undefined : _join(files.map(file => file.clientPath), ',');
        return syncConfig.save();
    }

    export async function updateSyncConfigFolder(data: RuleFolderUpdate) {
        const syncConfig = await SyncRule.findOne({
            where: {
                root: false,
                ruleId: data.ruleId,
                id: data.subId
            }
        });
        if (syncConfig === null) {
            return null;
        }
        syncConfig.configName = data.ruleName;
        syncConfig.serverPath = data.serverPath;
        syncConfig.clientPath = data.clientPath;
        syncConfig.syncMode = data.mode;
        syncConfig.ignoreFile = data.ignore;
        syncConfig.deleteFile = data.delete;
        return syncConfig.save();
    }

    export function deleteSyncConfigFolder(ruleId: number, ids: number[]) {
        return SyncRule.destroy({
            where: {
                root: false,
                ruleId: ruleId,
                id: {
                    [Op.in]: ids
                }
            }
        });
    }

    export function insertSyncConfigFolder(data: RuleFolderUpdate) {
        return SyncRule.create({
            ruleId: data.ruleId,
            configName: data.ruleName,
            serverPath: data.serverPath,
            clientPath: data.clientPath,
            root: false,
            enable: false,
            syncMode: data.mode,
            ignoreFile: data.ignore,
            deleteFile: data.delete
        });
    }

    export function insertSyncConfigRoot(id: number, basePath: string, ruleName: string, files: RuleFile[]) {
        return SyncRule.create({
            ruleId: id,
            configName: ruleName,
            serverPath: basePath,
            root: true,
            enable: true,
            syncFiles: files.length === 0 ? undefined : _join(files.map(file => file.clientPath), ',')
        });
    }

    export function deleteSyncConfig(id: number) {
        return SyncRule.destroy({
            where: {
                ruleId: id
            }
        });
    }

    export async function getAvailableRuleId() {
        return (await SyncRule.max("ruleId")) as number + 1;
    }

    export async function enableSyncConfig(id: number) {
        const syncConfig = await SyncRule.findOne({
            where: {
                root: true,
                ruleId: id
            }
        });
        if (syncConfig === null) {
            return null;
        }
        syncConfig.enable = true;
        return syncConfig.save();
    }

    export async function disableSyncConfig(id: number) {
        const syncConfig = await SyncRule.findOne({
            where: {
                root: true,
                ruleId: id
            }
        });
        if (syncConfig === null) {
            return null;
        }
        syncConfig.enable = false;
        return syncConfig.save();
    }

    export function getAccountInfoByUsername(username: string) {
        return Account.findOne({
            where: {
                username: username
            }
        })
    }
}

