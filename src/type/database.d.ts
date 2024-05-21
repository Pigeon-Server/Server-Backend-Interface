import {RowDataPacket} from "mysql2";

type PlayerData = RowDataPacket & { username: string }
type PlayerKeyData = RowDataPacket & { username: string, uuid: string, accessKey: string }
type SyncConfigBaseData = RowDataPacket & SyncConfigBase
type SyncConfigFolderData = RowDataPacket & SyncConfigFolder