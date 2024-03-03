/**
 * @file 数据库相关函数
 * @module mysql
 * @author Half_nothing
 * @since 1.0.0
 */
import {createPool} from 'mysql2';
import {database, error} from './logger.mjs';
import {checkInput, getTime} from "./utils.mjs";
import {config} from "./config.mjs";
import process from "node:process";

let databasePool = null;

/**
 * @function
 * @name connectDatabase
 * @description 连接数据库
 * @returns {void}
 * @author Half_nothing
 * @version 1.0.3
 * @since 1.0.0
 * @export
 */
export function connectDatabase() {
    databasePool = createPool(({
        ...config.database.config,
        waitForConnections: true,
        multipleStatements: false,
        queueLimit: 0
    }));
    databasePool.on("error", _ => {
        database.error(`Disconnect from the database ${config.database.host}.`);
        setTimeout(connectDatabase, 2000);
    });
    databasePool.getConnection((err, conn) => {
        if (err) {
            database.error("Database Init Error!");
            error.error(err.message);
            process.exit(-1);
        }
        database.info("Connect to database successfully.");
        conn.query("SELECT VERSION() as version", (err, results) => {
            if (err) {
                error.error(err.message);
                conn.release();
                return;
            }
            database.debug(`Database Version: ${results[0].version}`);
            conn.release();
        })
    });
    databaseInit().catch(err => database.error(err.message));
}

/**
 * @function
 * @name databaseInit
 * @description 初始化数据库
 * @returns {Promise<void>}
 * @author Half_nothing
 * @version 1.2.1
 * @since 1.0.0
 * @export
 */
export function databaseInit() {
    return new Promise((_, __) => {
        databasePool.query(`CREATE TABLE IF NOT EXISTS \`${config.database.prefix}_user\`` +
            "(`id` int NOT NULL AUTO_INCREMENT," +
            "`username` char(16) NOT NULL," +
            "`uuid` char(32) NOT NULL," +
            "`mac` char(20) NOT NULL," +
            "`ip` char(40) NOT NULL," +
            "`lastPack` char(64)," +
            "`firstTime` datetime NOT NULL," +
            "`updateTime` datetime Not NULL," +
            "PRIMARY KEY (`id`, `username`, `uuid`)," +
            "UNIQUE INDEX `id`(`id`)," +
            "UNIQUE INDEX `info`(`username`, `uuid`, `mac`));", (err, _) => {
            if (err) {
                database.error("Database Create Error!");
                process.exit(-1);
            }
            databasePool.query(`CREATE TABLE IF NOT EXISTS \`${config.database.prefix}_access\`` +
                "(`id` int NOT NULL AUTO_INCREMENT," +
                "`username` char(16) NOT NULL," +
                "`uuid` char(32) NOT NULL," +
                "`mac` char(20) NOT NULL," +
                "`ip` char(40) NOT NULL," +
                "`pack` varchar(64) NOT NULL," +
                "`source` varchar(128) NOT NULL," +
                "`time` datetime NOT NULL," +
                "PRIMARY KEY (`id`)," +
                "UNIQUE INDEX `id`(`id`)," +
                "UNIQUE INDEX `info`(`username`, `uuid`, `mac`)," +
                "CONSTRAINT `access` FOREIGN KEY (`username`, `uuid`, `mac`) " +
                `REFERENCES \`${config.database.prefix}_user\` (\`username\`, \`uuid\`, \`mac\`)` +
                "ON DELETE CASCADE " +
                "ON UPDATE CASCADE);");
            databasePool.query(`CREATE TABLE IF NOT EXISTS \`${config.database.prefix}_key\`` +
                "(`id` int NOT NULL AUTO_INCREMENT," +
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
                "UNIQUE INDEX `info`(`username`, `uuid`, `mac`) USING BTREE," +
                "CONSTRAINT `key` FOREIGN KEY (`username`, `uuid`, `mac`) " +
                `REFERENCES \`${config.database.prefix}_user\` (\`username\`, \`uuid\`, \`mac\`) ` +
                "ON DELETE CASCADE " +
                "ON UPDATE CASCADE);");
            databasePool.query("SET GLOBAL event_scheduler = ON;");
            databasePool.query("CREATE EVENT IF NOT EXISTS `updateKey` " +
                "ON SCHEDULE " +
                `EVERY '${config.database.updateTime}' SECOND ` +
                "DO " +
                `UPDATE \`${config.database.prefix}_key\` ` +
                "SET `enable` = FALSE " +
                "WHERE " +
                "`enable` = TRUE " +
                `AND UNIX_TIMESTAMP( expirationTime ) + ${config.database.updateTime} < UNIX_TIMESTAMP( now( ) );;`);
        });
    })
}

/**
 * @function
 * @name addUserAccount
 * @description 添加一个新玩家
 * @param info {{username: string, uuid: string, macAddress: string, ip: string, packName: string}}
 * @returns {Promise<void>}
 * @author Half_nothing
 * @version 1.0.3
 * @since 1.0.0
 * @export
 */
export function addUserAccount(info) {
    const time = getTime(false);
    return new Promise((resolve, reject) => {
        if (checkInput([info.username, info.packName])) {
            reject(new Error("Illegal Input"));
            return
        }
        databasePool.query(`INSERT INTO \`${config.database.prefix}_user\` (username, uuid, mac, ip, lastPack, firstTime, updateTime)
                            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [info.username, info.uuid, info.macAddress, info.ip, info.packName, time, time],
            (err, res) => err ? reject(err) : resolve(res))
    })
}

/**
 * @function
 * @name checkUserAccount
 * @description 检查给定用户是否在user表内记录
 * @param info {{username: string, uuid: string, macAddress: string}}
 * @returns {Promise<Array<{username: string}>>}
 * @author Half_nothing
 * @version 1.0.3
 * @since 1.0.0
 * @export
 */
export function checkUserAccount(info) {
    return new Promise((resolve, reject) => {
        if (checkInput([info.username])) {
            reject(new Error("Illegal Input"));
            return
        }
        databasePool.query(`SELECT username
                            FROM \`${config.database.prefix}_user\`
                            WHERE username = ?
                              AND uuid = ?
                              AND mac = ?`,
            [info.username, info.uuid, info.macAddress],
            (err, res) => err ? reject(err) : resolve(res))
    })
}

/**
 * @function
 * @name updateTime
 * @description 更新用户访问时间、IP和整合包
 * @param info {{username: string, uuid: string, macAddress: string, ip: string, packName: string}}
 * @returns {Promise<void>}
 * @author Half_nothing
 * @version 1.0.4
 * @since 1.0.0
 * @export
 */
export function updateTime(info) {
    return new Promise((resolve, reject) => {
        if (checkInput(info.packName === undefined ? [info.username] : [info.username, info.packName])) {
            reject(new Error("Illegal Input"));
            return
        }
        if (info.packName === undefined) {
            databasePool.query(`UPDATE \`${config.database.prefix}_user\`
                                SET updateTime = ?,
                                    ip         = ?
                                WHERE username = ?
                                  AND uuid = ?
                                  AND mac = ?`,
                [getTime(false), info.ip, info.username, info.uuid, info.macAddress],
                (err, res) => err ? reject(err) : resolve(res))
        } else {
            databasePool.query(`UPDATE \`${config.database.prefix}_user\`
                                SET updateTime = ?,
                                    lastPack   = ?,
                                    ip         = ?
                                WHERE username = ?
                                  AND uuid = ?
                                  AND mac = ?`,
                [getTime(false), info.packName, info.ip, info.username, info.uuid, info.macAddress],
                (err, res) => err ? reject(err) : resolve(res))
        }
    })
}

/**
 * @function
 * @name getKey
 * @description 获取指定用户的accessKey
 * @param info {{username: string, uuid: string, macAddress: string, packName: string}}
 * @returns {Promise<Array<{username: string, uuid: string, accessKey: string}>>}
 * @author Half_nothing
 * @version 1.0.4
 * @since 1.0.0
 * @export
 */
export function getKey(info) {
    return new Promise((resolve, reject) => {
        if (checkInput([info.username, info.packName])) {
            reject(new Error("Illegal Input"));
            return
        }
        databasePool.query(`SELECT username, uuid, accessKey
                            FROM \`${config.database.prefix}_key\`
                            WHERE username = ?
                              AND uuid = ?
                              AND mac = ?
                              AND pack = ?
                              AND enable = 1`,
            [info.username, info.uuid, info.macAddress, info.packName],
            (err, res) => err ? reject(err) : resolve(res))
    })
}

/**
 * @function
 * @name setKey
 * @description 添加一个accessKey
 * @param info {{username: string, uuid: string, macAddress: string, ip: string, key: string, packName: string}}
 * @returns {Promise<void>}
 * @author Half_nothing
 * @version 1.0.4
 * @since 1.0.0
 * @export
 */
export function setKey(info) {
    return new Promise((resolve, reject) => {
        if (checkInput([info.username, info.packName])) {
            reject(new Error("Illegal Input"));
            return
        }
        databasePool.query(`INSERT INTO \`${config.database.prefix}_key\` (username, uuid, mac, ip, pack, accessKey,
                                                                           enable,
                                                                           createTime, expirationTime)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [info.username, info.uuid, info.macAddress, info.ip, info.packName, info.key, 1, getTime(false), getTime(true)],
            (err, res) => err ? reject(err) : resolve(res))
    })
}

/**
 * @function
 * @name addUserAccess
 * @description 添加某个玩家访问某个资源的记录
 * @param info {{username: string, uuid: string, macAddress: string, ip: string, packName: string, path: string}}
 * @returns {Promise<void>}
 * @author Half_nothing
 * @version 1.0.4
 * @since 1.0.0
 * @export
 */
export function addUserAccess(info) {
    return new Promise((resolve, reject) => {
        if (checkInput([info.username, info.packName])) {
            reject(new Error("Illegal Input"));
            return
        }
        databasePool.query(`INSERT INTO \`${config.database.prefix}_access\` (username, uuid, mac, ip, pack, source,
                                                                              time)
                            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [info.username, info.uuid, info.macAddress, info.ip, info.packName, info.path, getTime(false)],
            (err, res) => err ? reject(err) : resolve(res))
    })
}

/**
 * @function
 * @name getPlayDay
 * @description 获取某个玩家在某个整合包的游玩次数(一天只算一次)
 * @param info {{username: string, uuid: string, packName: string}}
 * @returns {Promise<Array<{playDays: number}>>}
 * @author Half_nothing
 * @version 1.0.4
 * @since 1.1.4
 * @export
 */
export function getPlayDay(info) {
    return new Promise((resolve, reject) => {
        if (checkInput([info.username, info.packName])) {
            reject(new Error("Illegal Input"));
            return
        }
        databasePool.query(`SELECT COUNT(DISTINCT DATE (createTime)) AS playDays
                            FROM \`${config.database.prefix}_key\`
                            WHERE username = ?
                              AND uuid = ?
                              AND packName = ?;`,
            [info.username, info.uuid, info.packName],
            (err, res) => err ? reject(err) : resolve(res))
    })
}