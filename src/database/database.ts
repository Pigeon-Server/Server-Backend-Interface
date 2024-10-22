import {Sequelize} from '@sequelize/core';
import {MySqlDialect} from '@sequelize/mysql';
import {Config} from "@/base/config";
import {mysql} from "@/base/logger";
import {User} from "@/database/model/user";
import {AccessKey} from "@/database/model/key";
import {Account} from "@/database/model/account";
import {SyncRule} from "@/database/model/syncRule";
import databaseConfig = Config.databaseConfig;

export const database = new Sequelize({
    dialect: MySqlDialect,
    ...databaseConfig.config,
    waitForConnections: true,
    multipleStatements: false,
    queueLimit: 0,
    logging: (sql: string) => {
        mysql.debug(sql);
    },
    models: [User, AccessKey, Account, SyncRule]
});

