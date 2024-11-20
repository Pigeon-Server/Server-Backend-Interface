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

type DatabaseConfig = {
    config: {
        host: string,
        port: number,
        user: string,
        password: string,
        database: string,
        connectTimeout: number,
        connectionLimit: number
    },
    updateTime: number,
    prefix: string
}

type ServerConfig = {
    version: string,
    https: {
        enable: boolean,
        enableHSTS: boolean,
        keyPath: string,
        crtPath: string
    },
    cookie: {
        key: string,
        timeout: number
    },
    callLimit: {
        count: number,
        time: number
    },
    jwt: {
        secretKey: string,
        expiresIn: string,
        refreshTokenExpiresIn: string
    },
    monitor: {
        enable: boolean,
        recordInterval: string,
        retentionDays: string
    },
    sessionToken: string,
    uploadPath: string,
    homePage: string,
    port: number
}

type UpdateConfig = {
    api: {
        baseUrl: string,
        timeout: number,
        key: string,
        clearInterval: number,
        oauth: {
            authUrl: string,
            tokenUrl: string,
            clientId: number,
            clientSecret: string
        }
    },
    updateMaxThread: number,
    launchUpdate: {
        baseUrl: string,
        version: string,
        changeLog: string,
        jarPath: string
    }
    useDatabase: boolean,
    fileBasePath: string
}
