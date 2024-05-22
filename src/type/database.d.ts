import {RowDataPacket} from "mysql2";

type PlayerData = RowDataPacket & { username: string }
type PlayerKeyData = RowDataPacket & { username: string, uuid: string, accessKey: string }
type SyncConfigBaseData = RowDataPacket & SyncConfigBase
type SyncConfigFullData = RowDataPacket & SyncConfigFull
type SyncConfigRootData = RowDataPacket & SyncConfigRoot
type SyncConfigFolderData = RowDataPacket & SyncConfigFolder
type UiRuleListData = RowDataPacket & RuleList