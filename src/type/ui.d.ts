type RuleList = {
    uuid: number,
    id: number,
    name: string,
    activity: boolean,
    createTime: string,
    updateTime: string
}

type RuleFolder = {
    subId?: number,
    ruleName: string,
    clientPath: string,
    serverPath: string,
    mode: string,
    ignore: string[] | string,
    delete: string[] | string,
}

type RuleFolderUpdate = Override<RuleFolder, {
    ruleId: number,
    subId?: number,
    ruleName?: string,
    ignore: string,
    delete: string
}>

type RuleFile = {
    ruleName: string,
    clientPath: string
}

type RuleDetails = {
    ruleName: string,
    basePath: string,
    updateRules: {
        folder: RuleFolder[],
        file: RuleFile[]
    }
    deleteId: string[]
}

type Reply = {
    status: boolean,
    msg: string,
    data: any
}

type FileInfo = {
    name: string,
    path: string,
    isFile: boolean,
    size?: number,
    editTime?: string
}

type AuthInfo = {
    username: string,
    permission: number,
    tokenExpiresIn: number,
    token: string,
    refreshToken: string
}

type PerformanceData = {
    time: string[],
    cpu: number[],
    memory: number[],
    disk: number[],
    load1: number[],
    load5: number[],
    load15: number[]
}

type CompressFile = {
    path: string,
    isFile: boolean
}