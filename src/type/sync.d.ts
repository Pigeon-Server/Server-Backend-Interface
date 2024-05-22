type SyncConfigBase = {
    id: number,
    ruleId: number,
    syncFiles?: string[] | string,
    ignoreFile?: string[] | string,
    deleteFile?: string[] | string,
    createTime: string,
    updateTime: string,
}

type SyncConfigFull = SyncConfigBase & {
    configName?: string,
    serverPath: string,
    clientPath?: string,
    root: number,
    enable: number,
    syncMode?: string,
    md5?: string
}

type SyncConfigRoot = SyncConfigBase & {
    configName: string,
    serverPath: string,
    root: number,
    enable: number,
    md5?: string
}

type SyncConfigFolder = SyncConfigBase & {
    serverPath: string,
    clientPath: string,
    syncMode: string
}