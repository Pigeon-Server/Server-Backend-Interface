import {CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model} from "@sequelize/core";
import {Attribute, AutoIncrement, NotNull, PrimaryKey, Table} from "@sequelize/core/decorators-legacy";
import {Config} from "@/base/config";
import databaseConfig = Config.databaseConfig;

@Table({tableName: `${databaseConfig.prefix}_account`})
export class Account extends Model<InferAttributes<Account>, InferCreationAttributes<Account>> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id?: CreationOptional<number>;

    @Attribute(DataTypes.STRING(32))
    @PrimaryKey
    declare username: string;

    @Attribute(DataTypes.STRING(64))
    @NotNull
    declare password: string;

    @Attribute(DataTypes.STRING(32))
    @NotNull
    declare salt: string;

    @Attribute({
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    })
    declare permission?: CreationOptional<number>;
}