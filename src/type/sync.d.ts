type SyncConfigBase = {
    id: number,
    syncId: number,
    configName: string,
    serverPath: string,
    md5?: string,
    createTime: string,
    updateTime: string
}

type SyncConfigFolder = SyncConfigBase & {

}