/**********************************************
 * @file config.ts
 * @desc 配置文件加载
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.03
 * @license GNU General Public License (GPL)
 **********************************************/
import {createPool, Pool} from 'mysql2';
import type {ResultSetHeader} from 'mysql2';
import {logger} from "./logger";
import {Utils} from "@/utils/utils";
import {Config} from "./config";
import process from "node:process";

import databaseConfig = Config.databaseConfig;
import getTime = Utils.getTime;
import checkInput = Utils.checkInput;
import type {PlayerData, PlayerKeyData, SyncConfigBaseData} from "@/type/database";


export class Database {
    private static _INSTANCE?: Database;
    private databasePool!: Pool;
    private static _initFinishCallBack?: Callback | undefined;
    private static initSqlList: string[] = [
        "CREATE TABLE IF NOT EXISTS `{prefix}user`(" +
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
        "CREATE TABLE IF NOT EXISTS `{prefix}key`(" +
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
        "REFERENCES `{prefix}user` (`username`, `uuid`, `mac`) " +
        "ON DELETE CASCADE ON UPDATE CASCADE);",
        "CREATE TABLE IF NOT EXISTS `{prefix}sync`(" +
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
        "UPDATE {prefix}key " +
        "SET `enable` = FALSE " +
        "WHERE `enable` = TRUE AND " +
        "UNIX_TIMESTAMP( expirationTime ) + {updateTime} < UNIX_TIMESTAMP( now( ) );;"
    ];

    static get INSTANCE(): Database {
        if (this._INSTANCE === undefined) {
            this._INSTANCE = new Database();
        }
        return this._INSTANCE;
    }

    static set initFinishCallBack(callback: Callback) {
        this._initFinishCallBack = callback
    }

    private constructor() {
        for (const i in Database.initSqlList) {
            Database.initSqlList[i] = Database.initSqlList[i]
                .replaceAll("{prefix}",
                    databaseConfig.prefix === "" ? "" : databaseConfig.prefix + "_")
                .replaceAll("{updateTime}", String(databaseConfig.updateTime));
        }
        this.connectDatabase();
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
            conn.query("SELECT VERSION() as version", (err, results: any[]) => {
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
                Database._initFinishCallBack();
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
            if (checkInput([info.username, info.packName])) {
                reject(new Error("Illegal Input"));
                return
            }
            this.databasePool.query(`INSERT INTO \`${databaseConfig.prefix}_user\` (username, uuid, mac, ip, lastPack, firstTime, updateTime)
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
            if (checkInput([info.username])) {
                reject(new Error("Illegal Input"));
                return
            }
            this.databasePool.query(`SELECT username
                                     FROM \`${databaseConfig.prefix}_user\`
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
            if (checkInput(info.packName === undefined ? [info.username] : [info.username, info.packName])) {
                reject(new Error("Illegal Input"));
                return
            }
            if (info.packName === undefined) {
                this.databasePool.query(`UPDATE \`${databaseConfig.prefix}_user\`
                                         SET updateTime = ?,
                                             ip         = ?
                                         WHERE username = ?
                                           AND uuid = ?
                                           AND mac = ?`,
                    [getTime(false), info.ip, info.username, info.uuid, info.macAddress],
                    (err, res: ResultSetHeader) => err ? reject(err) : resolve(res))
            } else {
                this.databasePool.query(`UPDATE \`${databaseConfig.prefix}_user\`
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
            if (checkInput([info.username, info.packName])) {
                reject(new Error("Illegal Input"));
                return
            }
            this.databasePool.query(`SELECT username, uuid, accessKey
                                     FROM \`${databaseConfig.prefix}_key\`
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
            if (checkInput([info.username, info.packName])) {
                reject(new Error("Illegal Input"));
                return
            }
            this.databasePool.query(`INSERT INTO \`${databaseConfig.prefix}_key\` (username, uuid, mac, ip,
                                                                                   pack,
                                                                                   accessKey,
                                                                                   enable,
                                                                                   createTime, expirationTime)
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
            if (checkInput([info.username, info.packName])) {
                reject(new Error("Illegal Input"));
                return
            }
            this.databasePool.query(`SELECT COUNT(DISTINCT DATE(createTime)) AS playDays
                                     FROM \`${databaseConfig.prefix}_key\`
                                     WHERE username = ?
                                       AND uuid = ?
                                       AND packName = ?;`,
                [info.username, info.uuid, info.packName],
                (err, res: ResultSetHeader) => err ? reject(err) : resolve(res))
        });
    }

    getAllSyncConfig(): Promise<SyncConfigBaseData[]> {
        return new Promise((resolve, reject) => {
            this.databasePool.query(`SELECT id AS 'uuid',
                                            ruleId AS 'id',
                                            configName AS 'name',
                                            \`enable\` as 'activity', 
                                            createTime, updateTime
                                     FROM \`${databaseConfig.prefix}_sync\`
                                     WHERE root = 1`,
                [],
                (err, res: SyncConfigBaseData[]) => err ? reject(err) : resolve(res))
        });
    }

    getSyncConfigPage(start: number, end: number, search: string): Promise<SyncConfigBaseData[]> {
        return new Promise((resolve, reject) => {
            this.databasePool.query(`SELECT id AS 'uuid',
                                            ruleId AS 'id',
                                            configName AS 'name',
                                            \`enable\` as 'activity', 
                                            createTime, updateTime
                                     FROM \`${databaseConfig.prefix}_sync\`
                                     WHERE root = 1
                                       AND ruleId BETWEEN ? AND ?
                                       AND configName LIKE ?`,
                [start < 0 ? 0 : start, end > start ? end : start, `%${search}%`],
                (err, res: SyncConfigBaseData[]) => err ? reject(err) : resolve(res))
        });
    }
}
