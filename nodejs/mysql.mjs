import {createPool} from 'mysql2';
import {database} from './logger.mjs';
import {checkInput, getTime} from "./utils.mjs";
import {config} from "./config.mjs";

let databasePool = null;

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
    })
}

export function runSqlCommand(cmd, param) {
    return new Promise((resolve, reject) => {
        databasePool.query(cmd, param, (err, res) => err ? reject(err) : resolve(res))
    })
}

export function databaseInit() {
    return new Promise((resolve, reject) => {
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
            "INDEX `info`(`username`, `uuid`, `mac`, `ip`));", (err, _) => {
            if (err) {
                reject(err)
            }
        });
        databasePool.query(`CREATE TABLE IF NOT EXISTS \`${config.database.prefix}_access\`` +
            "(`id` int NOT NULL AUTO_INCREMENT," +
            "`username` char(16) NOT NULL," +
            "`uuid` char(32) NOT NULL," +
            "`mac` char(20) NOT NULL," +
            "`ip` char(40) NOT NULL," +
            "`pack` varchar(40) NOT NULL," +
            "`source` varchar(128) NOT NULL," +
            "`time` datetime NOT NULL," +
            "PRIMARY KEY (`id`)," +
            "UNIQUE INDEX `id`(`id`)," +
            "INDEX `info`(`username`, `uuid`, `mac`, `ip`)," +
            "CONSTRAINT `access` FOREIGN KEY (`username`, `uuid`, `mac`, `ip`) " +
            `REFERENCES \`${config.database.prefix}_user\` (\`username\`, \`uuid\`, \`mac\`, \`ip\`)` +
            "ON DELETE CASCADE " +
            "ON UPDATE CASCADE);", (err, _) => {
            if (err) {
                reject(err)
            }
        });
        databasePool.query(`CREATE TABLE IF NOT EXISTS \`${config.database.prefix}_key\`` +
            "(`id` int NOT NULL AUTO_INCREMENT," +
            "`username` char(16) NOT NULL," +
            "`uuid` char(32) NOT NULL," +
            "`mac` char(20) NOT NULL," +
            "`ip` char(40) NOT NULL," +
            "`accessKey` char(32) NOT NULL," +
            "`enable` tinyint(1) NOT NULL," +
            "`createTime` datetime NOT NULL," +
            "`expirationTime` datetime NOT NULL," +
            "PRIMARY KEY (`id`)," +
            "UNIQUE INDEX `id`(`id`) USING BTREE," +
            "INDEX `info`(`username`, `uuid`, `mac`, `ip`) USING BTREE," +
            "CONSTRAINT `key` FOREIGN KEY (`username`, `uuid`, `mac`, `ip`) " +
            `REFERENCES \`${config.database.prefix}_user\` (\`username\`, \`uuid\`, \`mac\`, \`ip\`) ` +
            "ON DELETE CASCADE " +
            "ON UPDATE CASCADE);", (err, _) => {
                if (err) {
                    reject(err)
                }
            }
        );
        databasePool.query("SET GLOBAL event_scheduler = ON;", (err, _) => {
            if (err) {
                reject(err)
            }
        });
        databasePool.query("CREATE EVENT IF NOT EXISTS `updateKey` " +
            "ON SCHEDULE " +
            `EVERY '${config.database.updateTime}' SECOND ` +
            "DO " +
            `UPDATE \`${config.database.prefix}_key\` ` +
            "SET `enable` = FALSE " +
            "WHERE " +
            "`enable` = TRUE " +
            `AND UNIX_TIMESTAMP( expirationTime ) + ${config.database.updateTime} < UNIX_TIMESTAMP( now( ) );;`, (err, _) => {
            if (err) {
                reject(err)
            }
        })
    })
}

export function addUserAccount(username, uuid, mac, ip, pack) {
    const time = getTime(false);
    return new Promise((resolve, reject) => {
        if (checkInput([username, uuid, mac, pack])) {
            reject(new Error("Illegal Input"));
            return
        }
        databasePool.query(`INSERT INTO \`${config.database.prefix}_user\` (username, uuid, mac, ip, lastPack, firstTime, updateTime)
                            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, uuid, mac, ip, pack, time, time],
            (err, res) => err ? reject(err) : resolve(res))
    })
}

export function checkUserAccount(username, uuid, mac) {
    return new Promise((resolve, reject) => {
        if (checkInput([username, uuid, mac])) {
            reject(new Error("Illegal Input"));
            return
        }
        databasePool.query(`SELECT username
                            FROM \`${config.database.prefix}_user\`
                            WHERE username = ?
                              AND uuid = ?
                              AND mac = ?`,
            [username, uuid, mac],
            (err, res) => err ? reject(err) : resolve(res))
    })
}

export function updateTime(username, uuid, mac, pack = null) {
    return new Promise((resolve, reject) => {
        if (checkInput([username, uuid, pack, mac])) {
            reject(new Error("Illegal Input"));
            return
        }
        if (pack === null) {
            databasePool.query(`UPDATE \`${config.database.prefix}_user\`
                                SET updateTime = ?
                                WHERE username = ?
                                  AND uuid = ?
                                  AND mac = ?`,
                [getTime(false), username, uuid, mac],
                (err, res) => err ? reject(err) : resolve(res))
        } else {
            databasePool.query(`UPDATE \`${config.database.prefix}_user\`
                                SET updateTime = ?,
                                    lastPack = ?
                                WHERE username = ?
                                  AND uuid = ?
                                  AND mac = ?`,
                [getTime(false), pack, username, uuid, mac],
                (err, res) => err ? reject(err) : resolve(res))
        }
    })
}

export function getKey(username, uuid, mac) {
    return new Promise((resolve, reject) => {
        if (checkInput([username, uuid, mac])) {
            reject(new Error("Illegal Input"));
            return
        }
        databasePool.query(`SELECT username, uuid, accessKey
                            FROM \`${config.database.prefix}_key\`
                            WHERE username = ?
                              AND uuid = ?
                              AND mac = ?
                              AND enable = 1`,
            [username, uuid, mac],
            (err, res) => err ? reject(err) : resolve(res))
    })
}

export function setKey(username, uuid, mac, ip, key) {
    return new Promise((resolve, reject) => {
        if (checkInput([username, uuid, mac])) {
            reject(new Error("Illegal Input"));
            return
        }
        databasePool.query(`INSERT INTO \`${config.database.prefix}_key\` (username, uuid, mac, ip, accessKey, enable,
                                                                           createTime, expirationTime)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, uuid, mac, ip, key, 1, getTime(false), getTime(true)],
            (err, res) => err ? reject(err) : resolve(res))
    })
}

export function addUserAccess(username, uuid, mac, ip, pack, path) {
    return new Promise((resolve, reject) => {
        if (checkInput([username, uuid, mac, ip, pack, path])) {
            reject(new Error("Illegal Input"));
            return
        }
        databasePool.query(`INSERT INTO \`${config.database.prefix}_access\` (username, uuid, mac, ip, pack, source,
                                                                              time)
                            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, uuid, mac, ip, pack, path, getTime(false)],
            (err, res) => err ? reject(err) : resolve(res))
    })
}