import {CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model} from "@sequelize/core";
import {
    Attribute,
    AutoIncrement,
    CreatedAt,
    Index,
    NotNull,
    PrimaryKey,
    Table,
    UpdatedAt
} from "@sequelize/core/decorators-legacy";
import {Config} from "@/base/config";
import databaseConfig = Config.databaseConfig;

@Table({tableName: `${databaseConfig.prefix}_sync_rule`})
export class SyncRule extends Model<InferAttributes<SyncRule>, InferCreationAttributes<SyncRule>> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    @Index("index")
    @NotNull
    declare id?: CreationOptional<number>;

    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @Index("index")
    @NotNull
    declare ruleId: number;

    @Attribute({
        type: DataTypes.STRING(64),
        defaultValue: null
    })
    declare configName?: CreationOptional<string>;

    @Attribute(DataTypes.STRING(64))
    @NotNull
    declare serverPath: string;

    @Attribute({
        type: DataTypes.STRING(64),
        defaultValue: null
    })
    declare clientPath?: CreationOptional<string>;

    @Attribute({
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    })
    declare root?: CreationOptional<boolean>;

    @Attribute({
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    })
    declare enable?: CreationOptional<boolean>;

    @Attribute({
        type: DataTypes.CHAR(8),
        defaultValue: null
    })
    declare syncMode?: CreationOptional<string>;

    @Attribute(DataTypes.TEXT)
    declare syncFiles?: string | string[];

    @Attribute(DataTypes.TEXT)
    declare ignoreFile?: string | string[];

    @Attribute(DataTypes.TEXT)
    declare deleteFile?: string | string[];

    @Attribute({
        type: DataTypes.CHAR(32),
        defaultValue: null
    })
    declare md5?: string;

    @Attribute(DataTypes.DATE)
    @NotNull
    @CreatedAt
    declare createTime: CreationOptional<Date>;

    @Attribute(DataTypes.DATE)
    @NotNull
    @UpdatedAt
    declare updateTime: CreationOptional<Date>;
}