type SyncFolder = {
    mode: string
    serverPath: string
    ignore?: string[]
    delete?: string[]
    files?: { [key: string]: string }
}

type SyncPackage = {
    basePath: string,
    [key: string]: SyncFolder,
    files?: {
        [key: string]: string | null
    }
}

type SyncConfig = {
    [key: string]: SyncPackage,
    ignoredKey: string[],
    md5: {
        [key: string]: string
    }
}

type SyncFolderCache = SyncFolder & {
    files: {
        [key: string]: string
    }
}

type SyncPackageCache = {
    basePath: string,
    [key: string]: SyncFolderCache,
    files: {
        [key: string]: string
    }
    data: string[],
    md5: string,
    init: boolean
}

type SyncCacheConfig = {
    [key: string]: SyncPackageCache,
    ignoredKey: string[],
    md5: {
        [key: string]: string
    }

}

type SyncClientConfig = {
    data: string[],
    files: {
        [key: string]: string
    },
    [key: string]: SyncFolderCache
}