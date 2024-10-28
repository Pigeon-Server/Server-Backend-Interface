import {
    CreationOptional,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    Model
} from "@sequelize/core";
import {
    Attribute,
    AutoIncrement,
    CreatedAt,
    Index,
    NotNull,
    PrimaryKey,
    Table,
    Unique
} from "@sequelize/core/decorators-legacy";
import {Config} from "@/base/config";
import databaseConfig = Config.databaseConfig;

@Table({tableName: `${databaseConfig.prefix}_key`})
export class AccessKey extends Model<InferAttributes<AccessKey>, InferCreationAttributes<AccessKey>> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    @Unique
    @NotNull
    declare id?: CreationOptional<number>;

    @Attribute(DataTypes.CHAR(16))
    @Index('info')
    @NotNull
    declare username: string;

    @Attribute(DataTypes.CHAR(32))
    @Index('info')
    @NotNull
    declare uuid: string;

    @Attribute(DataTypes.CHAR(20))
    @Index('info')
    @NotNull
    declare mac: string;

    @Attribute(DataTypes.CHAR(40))
    @NotNull
    declare ip: string;

    @Attribute(DataTypes.STRING(64))
    @NotNull
    declare pack: string;

    @Attribute(DataTypes.CHAR(32))
    @NotNull
    declare accessKey: string;

    @Attribute(DataTypes.BOOLEAN)
    @NotNull
    declare enable: boolean;

    @Attribute(DataTypes.DATE)
    @NotNull
    @CreatedAt
    declare createTime?: CreationOptional<Date>;

    @Attribute(DataTypes.DATE)
    @NotNull
    declare expirationTime: Date;
}