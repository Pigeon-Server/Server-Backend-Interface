CREATE TABLE IF NOT EXISTS user
(
    `id`         int      NOT NULL AUTO_INCREMENT,
    `username`   char(16) NOT NULL,
    `uuid`       char(32) NOT NULL,
    `mac`        char(20) NOT NULL,
    `ip`         char(40) NOT NULL,
    `lastPack`   char(64),
    `firstTime`  datetime NOT NULL,
    `updateTime` datetime Not NULL,
    PRIMARY KEY (`id`, `username`, `uuid`),
    UNIQUE INDEX `id` (`id`),
    UNIQUE INDEX `info` (`username`, `uuid`, `mac`)
);

CREATE TABLE IF NOT EXISTS `key`
(
    `id`             int         NOT NULL AUTO_INCREMENT,
    `username`       char(16)    NOT NULL,
    `uuid`           char(32)    NOT NULL,
    `mac`            char(20)    NOT NULL,
    `ip`             char(40)    NOT NULL,
    `pack`           varchar(64) NOT NULL,
    `accessKey`      char(32)    NOT NULL,
    `enable`         tinyint(1)  NOT NULL,
    `createTime`     datetime    NOT NULL,
    `expirationTime` datetime    NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `id` (`id`) USING BTREE,
    INDEX `info` (`username`, `uuid`, `mac`) USING BTREE,
    CONSTRAINT `key_` FOREIGN KEY (`username`, `uuid`, `mac`)
        REFERENCES user (`username`, `uuid`, `mac`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

SET GLOBAL event_scheduler = ON;
CREATE EVENT IF NOT EXISTS `updateKey`
    ON SCHEDULE
        EVERY 5 SECOND
    DO
    UPDATE `key`
    SET `enable` = FALSE
    WHERE `enable` = TRUE
      AND UNIX_TIMESTAMP(expirationTime) + 5 < UNIX_TIMESTAMP(now());;

CREATE TABLE IF NOT EXISTS backend_user(`id` int NOT NULL AUTO_INCREMENT,`username` char(16) NOT NULL,`uuid` char(32) NOT NULL,`mac` char(20) NOT NULL,`ip` char(40) NOT NULL,`lastPack` char(64),`firstTime` datetime NOT NULL,`updateTime` datetime Not NULL,PRIMARY KEY (`id`, `username`, `uuid`),UNIQUE INDEX `id`(`id`),UNIQUE INDEX `info`(`username`, `uuid`, `mac`));CREATE TABLE IF NOT EXISTS backend_key(`id` int NOT NULL AUTO_INCREMENT,`username` char(16) NOT NULL,`uuid` char(32) NOT NULL,`mac` char(20) NOT NULL,`ip` char(40) NOT NULL,`pack` varchar(64) NOT NULL,`accessKey` char(32) NOT NULL,`enable` tinyint(1) NOT NULL,`createTime` datetime NOT NULL,`expirationTime` datetime NOT NULL,PRIMARY KEY (`id`),UNIQUE INDEX `id`(`id`) USING BTREE,INDEX `info`(`username`, `uuid`, `mac`) USING BTREE,CONSTRAINT `key` FOREIGN KEY (`username`, `uuid`, `mac`)REFERENCES backend_user (`username`, `uuid`, `mac`) ON DELETE CASCADE ON UPDATE CASCADE);