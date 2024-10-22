import {CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model,} from '@sequelize/core';
import {
    Attribute,
    AutoIncrement,
    CreatedAt,
    NotNull,
    PrimaryKey,
    Table,
    Unique,
    UpdatedAt
} from "@sequelize/core/decorators-legacy";
import {Config} from "@/base/config";
import databaseConfig = Config.databaseConfig;

@Table({tableName: `${databaseConfig.prefix}_user`})
export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    @Unique
    declare id?: CreationOptional<number>;

    @Attribute(DataTypes.CHAR(16))
    @PrimaryKey
    @Unique('info')
    declare username: string;

    @Attribute(DataTypes.CHAR(32))
    @PrimaryKey
    @Unique('info')
    declare uuid: string;

    @Attribute(DataTypes.CHAR(20))
    @Unique('info')
    @NotNull
    declare mac: string;

    @Attribute(DataTypes.CHAR(40))
    @NotNull
    declare ip: string;

    @Attribute(DataTypes.CHAR(64))
    declare lastPack?: string;

    @Attribute(DataTypes.DATE)
    @NotNull
    @CreatedAt
    declare firstTime?: CreationOptional<Date>;

    @Attribute(DataTypes.DATE)
    @NotNull
    @UpdatedAt
    declare updateTime?: CreationOptional<Date>;
}