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

@Table({tableName: `${databaseConfig.prefix}_performance`})
export class Performance extends Model<InferAttributes<Performance>, InferCreationAttributes<Performance>> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    @Unique
    @NotNull
    declare id?: CreationOptional<number>;

    @Attribute(DataTypes.FLOAT)
    @NotNull
    declare cpuUsage: number;

    @Attribute(DataTypes.FLOAT)
    @NotNull
    declare memoryUsage: number;

    @Attribute(DataTypes.FLOAT)
    @NotNull
    declare serverLoad1: number;

    @Attribute(DataTypes.FLOAT)
    @NotNull
    declare serverLoad5: number;

    @Attribute(DataTypes.FLOAT)
    @NotNull
    declare serverLoad15: number;

    @Attribute(DataTypes.FLOAT)
    @NotNull
    declare diskUsage: number;

    @Attribute(DataTypes.DATE)
    @NotNull
    @CreatedAt
    declare createTime?: CreationOptional<Date>;
}