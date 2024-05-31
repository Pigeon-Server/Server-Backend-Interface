/**********************************************
 * @file config.ts
 * @desc 配置文件加载
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.03
 * @license GNU General Public License (GPL)
 **********************************************/
import type {ResultSetHeader, RowDataPacket} from 'mysql2';
import {createPool, Pool} from 'mysql2';
import {file, logger} from "./logger";
import {join as _join, reject} from 'lodash';
import {Utils} from "@/utils/utils";
import {Config} from "./config";
import process from "node:process";
import {PlayerData, PlayerKeyData, SyncConfigFolderData, SyncConfigRootData, UiRuleListData} from "@/type/database";
import databaseConfig = Config.databaseConfig;
import getTime = Utils.getTime;


export class Database {
    private static _instance?: Database;
    private databasePool!: Pool;
    private static _initFinishCallBack?: AsyncCallback | undefined;
    private static tablePrefix: string;
    private static userTable: string;
    private static keyTable: string;
    private static syncTable: string;
    private static initSqlList: string[] = [
        "CREATE TABLE IF NOT EXISTS `{prefix_user}`(" +
        "`id` int NOT NULL AUTO_INCREMENT," +
        "`username` char(16) NOT NULL," +
        "`uuid` char(32) NOT NULL," +
        "`mac` char(20) NOT NULL," +
        "`ip` char(40) NOT NULL," +
        "`lastPack` char(64)," +
        "`firstTime` datetime NOT NULL," +
        "`updateTime` datetime Not NULL," +
        "PRIMARY KEY (`id`, `username`, `uuid`)," +
        "UNIQUE INDEX `id`(`id`)," +
        "UNIQUE INDEX `info`(`username`, `uuid`, `mac`));",
        "CREATE TABLE IF NOT EXISTS `{prefix_key}`(" +
        "`id` int NOT NULL AUTO_INCREMENT," +
        "`username` char(16) NOT NULL," +
        "`uuid` char(32) NOT NULL," +
        "`mac` char(20) NOT NULL," +
        "`ip` char(40) NOT NULL," +
        "`pack` varchar(64) NOT NULL," +
        "`accessKey` char(32) NOT NULL," +
        "`enable` tinyint(1) NOT NULL," +
        "`createTime` datetime NOT NULL," +
        "`expirationTime` datetime NOT NULL," +
        "PRIMARY KEY (`id`)," +
        "UNIQUE INDEX `id`(`id`) USING BTREE," +
        "INDEX `info`(`username`, `uuid`, `mac`) USING BTREE," +
        "CONSTRAINT `key` FOREIGN KEY (`username`, `uuid`, `mac`) " +
        "REFERENCES `{prefix_user}` (`username`, `uuid`, `mac`) " +
        "ON DELETE CASCADE ON UPDATE CASCADE);",
        "CREATE TABLE IF NOT EXISTS `{prefix_sync}`(" +
        "`id` int NOT NULL AUTO_INCREMENT," +
        "`ruleId` int NOT NULL," +
        "`configName` varchar(64) NULL DEFAULT NULL," +
        "`serverPath` varchar(64) NOT NULL," +
        "`clientPath` varchar(64) NULL DEFAULT NULL," +
        "`root` tinyint(1) NOT NULL DEFAULT 0," +
        "`enable` tinyint(1) NOT NULL DEFAULT 0," +
        "`syncMode` char(8) NULL DEFAULT NULL," +
        "`syncFiles` text NULL," +
        "`ignoreFile` text NULL," +
        "`deleteFile` text NULL," +
        "`md5` char(32) NULL DEFAULT NULL," +
        "`createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP," +
        "`updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," +
        "PRIMARY KEY (`id`, `ruleId`) USING BTREE," +
        "INDEX `index`(`id` ASC, `ruleId` ASC, `md5` ASC) USING BTREE," +
        "CONSTRAINT `{prefix}sync_check_root` CHECK ((`root` = 0) or (`configName` is not null))," +
        "CONSTRAINT `{prefix}sync_check_path` CHECK ((`root` = 1) or (`clientPath` is not null)));",
        "SET GLOBAL event_scheduler = ON;",
        "CREATE EVENT IF NOT EXISTS `updateKey` " +
        "ON SCHEDULE " +
        "EVERY {updateTime} SECOND " +
        "DO " +
        "UPDATE {prefix_key} " +
        "SET `enable` = FALSE " +
        "WHERE `enable` = TRUE AND " +
        "UNIX_TIMESTAMP( expirationTime ) + {updateTime} < UNIX_TIMESTAMP( now( ) );;"
    ];

    static get instance(): Database {
        if (this._instance === undefined) {
            this._instance = new Database();
        }
        return this._instance;
    }

    static set initFinishCallBack(callback: AsyncCallback) {
        this._initFinishCallBack = callback
    }

    private constructor() {
        Database.tablePrefix = databaseConfig.prefix + "_";
        Database.keyTable = `${Database.tablePrefix}key`;
        Database.userTable = `${Database.tablePrefix}user`;
        Database.syncTable = `${Database.tablePrefix}sync`;
        for (const i in Database.initSqlList) {
            Database.initSqlList[i] = Database.initSqlList[i]
                .replaceAll("{prefix}", Database.tablePrefix)
                .replaceAll("{prefix_user}", Database.userTable)
                .replaceAll("{prefix_key}", Database.keyTable)
                .replaceAll("{prefix_sync}", Database.syncTable)
                .replaceAll("{updateTime}", String(databaseConfig.updateTime));
        }
        this.connectDatabase();
    }

    static checkInputArgs(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = (...args: any[]) => {
            console.log(args);
            return originalMethod.apply(this, args);
        };
        return descriptor;
    }

    /**
     * @function
     * @description 连接数据库
     * @author Half_nothing
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    private connectDatabase(): void {
        this.databasePool = createPool(({
            ...databaseConfig.config,
            waitForConnections: true,
            multipleStatements: false,
            queueLimit: 0
        }));
        this.databasePool.on("error", _ => {
            logger.error(`Disconnect from the database ${databaseConfig.config.host}.`);
            setTimeout(this.connectDatabase);
            logger.debug(`Reconnect to database ${databaseConfig.config.host}.`);
        });
        this.databasePool.getConnection((err, conn) => {
            if (err) {
                logger.error("Database Init Error!");
                logger.error(err.message);
                process.exit(-1);
            }
            logger.info("Connect to database successfully.");
            conn.query("SELECT VERSION() as version", (err, results: RowDataPacket[]) => {
                if (err) {
                    logger.error(err.message);
                    conn.release();
                    return;
                }
                this.databaseInit().catch(err => logger.error(err.message));
                logger.debug(`Database Version: ${results[0].version}`);
                conn.release();
            })
        });
    }

    /**
     * @function
     * @description 初始化数据库
     * @return {Promise<void>}
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    private databaseInit(): Promise<void> {
        return new Promise(async (_, __) => {
            const connection = await this.databasePool.promise().getConnection();
            const queries: Promise<any>[] = [];
            for (const sql of Database.initSqlList) {
                queries.push(connection.query(sql));
            }
            await Promise.all(queries);
            connection.release();
            if (Database._initFinishCallBack) {
                await Database._initFinishCallBack();
                Database._initFinishCallBack = undefined;
            }
        })
    }

    /**
     * @function
     * @description 添加一个新玩家
     * @param info {PlayerFullInfo} 要添加的玩家信息
     * @return {Promise<ResultSetHeader>}
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    addUserAccount(info: PlayerFullInfo): Promise<ResultSetHeader> {
        const time = getTime(false);
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`INSERT INTO ${Database.userTable}
                                           (username, uuid, mac, ip, lastPack, firstTime, updateTime)
                                       VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [info.username, info.uuid, info.macAddress, info.ip, info.packName, time, time],
                (err, res: ResultSetHeader) => err ? reject(err) : resolve(res))
        })
    }

    /**
     * @function
     * @description 检查给定用户是否在user表内记录
     * @param info {PlayerLiteInfo} 要检查的玩家信息
     * @return {Promise<PlayerData[]>}
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    checkUserAccount(info: PlayerLiteInfo): Promise<PlayerData[]> {
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`SELECT username
                                       FROM ${Database.userTable}
                                       WHERE username = ?
                                         AND uuid = ?
                                         AND mac = ?`,
                [info.username, info.uuid, info.macAddress],
                (err, res: PlayerData[]) => err ? reject(err) : resolve(res))
        })
    }

    /**
     * @function
     * @description 更新用户访问时间、IP和整合包
     * @param info {PlayerUpdateInfo} 要更新的玩家信息
     * @returns {Promise<ResultSetHeader>}
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    updateTime(info: PlayerUpdateInfo): Promise<ResultSetHeader> {
        return new Promise((resolve, reject) => {
            if (info.packName === undefined) {
                this.databasePool.execute(`UPDATE ${Database.userTable}
                                           SET updateTime = ?,
                                               ip         = ?
                                           WHERE username = ?
                                             AND uuid = ?
                                             AND mac = ?`,
                    [getTime(false), info.ip, info.username, info.uuid, info.macAddress],
                    (err, res: ResultSetHeader) => err ? reject(err) : resolve(res))
            } else {
                this.databasePool.execute(`UPDATE ${Database.userTable}
                                           SET updateTime = ?,
                                               lastPack   = ?,
                                               ip         = ?
                                           WHERE username = ?
                                             AND uuid = ?
                                             AND mac = ?`,
                    [getTime(false), info.packName, info.ip, info.username, info.uuid, info.macAddress],
                    (err, res: ResultSetHeader) => err ? reject(err) : resolve(res))
            }
        })
    }

    /**
     * @function
     * @description 获取指定玩家的accessKey
     * @param info {PlayerGetKeyInfo} 指定玩家的信息
     * @returns {Promise<PlayerKeyData[]>}
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    getKey(info: PlayerGetKeyInfo): Promise<PlayerKeyData[]> {
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`SELECT username, uuid, accessKey
                                       FROM ${Database.keyTable}
                                       WHERE username = ?
                                         AND uuid = ?
                                         AND mac = ?
                                         AND pack = ?
                                         AND enable = 1`,
                [info.username, info.uuid, info.macAddress, info.packName],
                (err, res: PlayerKeyData[]) => err ? reject(err) : resolve(res))
        })
    }

    /**
     * @function
     * @description 添加一个accessKey
     * @param info {PlayerSetKeyInfo} 玩家信息
     * @returns {Promise<ResultSetHeader>}
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    setKey(info: PlayerSetKeyInfo): Promise<ResultSetHeader> {
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`INSERT INTO ${Database.keyTable}
                                       (username, uuid, mac, ip, pack, accessKey, enable, createTime, expirationTime)
                                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [info.username, info.uuid, info.macAddress, info.ip, info.packName, info.key, 1, getTime(false), getTime(true)],
                (err, res: ResultSetHeader) => err ? reject(err) : resolve(res))
        })
    }

    /**
     * @function
     * @description 获取某个玩家在某个整合包的游玩次数(一天只算一次)
     * @param info {PlayerPlayInfo}
     * @returns {Promise<Array<{playDays: number}>>}
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    getPlayDay(info: PlayerPlayInfo): Promise<ResultSetHeader> {
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`SELECT COUNT(DISTINCT DATE(createTime)) AS playDays
                                       FROM ${Database.keyTable}
                                       WHERE username = ?
                                         AND uuid = ?
                                         AND packName = ?;`,
                [info.username, info.uuid, info.packName],
                (err, res: ResultSetHeader) => err ? reject(err) : resolve(res))
        });
    }

    getAllSyncConfig(): Promise<SyncConfigRootData[]> {
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`SELECT *
                                       FROM ${Database.syncTable}
                                       WHERE root = 1`,
                [],
                (err, res: SyncConfigRootData[]) => err ? reject(err) : resolve(res))
        });
    }

    getSyncConfigRoot(id: number): Promise<SyncConfigRootData[]> {
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`SELECT *
                                       FROM ${Database.syncTable}
                                       WHERE root = 1
                                         and ruleId = ?`,
                [id],
                (err, res: SyncConfigRootData[]) => err ? reject(err) : resolve(res))
        });
    }

    getSyncConfigDetail(id: number): Promise<SyncConfigFolderData[]> {
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`SELECT *
                                       FROM ${Database.syncTable}
                                       WHERE root = 0
                                         and ruleId = ?`,
                [id],
                (err, res: SyncConfigFolderData[]) => err ? reject(err) : resolve(res))
        });
    }

    getSyncConfigPage(start: number, end: number, search: string): Promise<UiRuleListData[]> {
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`SELECT id         AS 'uuid',
                                              ruleId     AS 'id',
                                              configName AS 'name',
                                              \`enable\` AS 'activity',
                                              createTime,
                                              updateTime
                                       FROM ${Database.syncTable}
                                       WHERE root = 1
                                         AND ruleId BETWEEN ? AND ?
                                         AND configName LIKE ?`,
                [start < 0 ? 0 : start, end > start ? end : start, `%${search}%`],
                (err, res: UiRuleListData[]) => err ? reject(err) : resolve(res))
        });
    }

    updateSyncConfigMd5(id: number, md5: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`UPDATE ${Database.syncTable}
                                       SET md5 = ?
                                       WHERE root = 1
                                         AND ruleId = ?`,
                [md5, id],
                (err, res) => err ? reject(err) : resolve(res))
        });
    }

    updateSyncConfigRoot(id: number, basePath: string, ruleName: string, files: RuleFile[]) {
        return new Promise((resolve, reject) => {
            const temp = files.length === 0 ? null : _join(files.map(file => file.clientPath), ',');
            this.databasePool.execute(`UPDATE ${Database.syncTable}
                                       SET serverPath = ?,
                                           configName = ?,
                                           syncFiles  = ?
                                       WHERE root = 1
                                         AND ruleId = ?`,
                [basePath, ruleName, temp, id],
                (err, res) => err ? reject(err) : resolve(res))
        });
    }

    updateSyncConfigFolder(data: RuleFolderUpdate) {
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`UPDATE ${Database.syncTable}
                                       SET configName = ?,
                                           serverPath = ?,
                                           clientPath = ?,
                                           syncMode   = ?,
                                           ignoreFile = ?,
                                           deleteFile = ?
                                       WHERE root = 0
                                         AND ruleId = ?
                                         AND id = ?`,
                [data.ruleName, data.serverPath, data.clientPath, data.mode, data.ignore, data.delete, data.ruleId, data.subId],
                (err, res) => err ? reject(err) : resolve(res))
        });
    }

    deleteSyncConfigFolder(ruleId: number, ids: number[]) {
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`DELETE
                                       FROM ${Database.syncTable}
                                       WHERE root = 0
                                         AND ruleId = ?
                                         AND id IN (${_join(Array(ids.length).fill('?'), ',')})`,
                [ruleId, ...ids],
                (err, res) => err ? reject(err) : resolve(res))
        });
    }

    insertSyncConfigFolder(data: RuleFolderUpdate) {
        return new Promise((resolve, reject) => {
            this.databasePool.execute(`INSERT INTO ${Database.syncTable}
                                       (ruleId, configName, serverPath, clientPath,
                                        root, enable, syncMode, ignoreFile, deleteFile)
                                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [data.ruleId, data.ruleName, data.serverPath, data.clientPath, 0, 0, data.mode, data.ignore, data.delete],
                (err, res) => err ? reject(err) : resolve(res))
        });
    }
}
