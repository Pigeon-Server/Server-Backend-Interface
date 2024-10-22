import {Request, Response} from "express";
import {Database} from "@/base/mysql";
import {SyncFileManager} from "@/manager/syncFileManager";
import {Utils} from "@/utils/utils";
import {FileUtils} from "@/utils/fileUtils";
import {join} from "path";
import {Config} from "@/base/config";
import {readFileSync, rmSync, statSync, unlinkSync, writeFileSync} from "fs";
import {logger} from "@/base/logger";

export namespace FrontendApiController {
    import reloadSyncConfig = SyncFileManager.reloadSyncConfig;
    import translateStringToArray = Utils.translateStringToArray;
    import updateConfig = Config.updateConfig;
    import checkDirExist = FileUtils.checkDirExist;
    import checkFileExist = FileUtils.checkFileExist;

    const preprocessingPath = (req: Request) => {
        return req.params.path.startsWith(updateConfig.fileBasePath) ? req.params.path : join(updateConfig.fileBasePath, req.params.path);
    };

    const checkExists = (res: Response, path: string) => {
        const stat = statSync(path);
        if (stat.isDirectory()) {
            res.status(400).json({
                status: false,
                msg: "已经存在同名文件夹"
            } as Reply);
            return true;
        }
        if (stat.isFile()) {
            res.status(400).json({
                status: false,
                msg: "已经存在同名文件"
            } as Reply);
            return true;
        }
        return false
    };

    export const reloadRules = async (_: Request, res: Response) => {
        const status = await reloadSyncConfig();
        if (status) {
            res.status(200).json({
                status: true,
                msg: "重载同步规则成功",
                data: status
            } as Reply);
            return;
        } else {
            res.status(500).json({
                status: false,
                msg: "重载同步规则失败"
            } as Reply);
        }
    };

    export const getRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        const root = await Database.instance.getSyncConfigRoot(ruleId);
        if (root.length === 0) {
            res.status(404).json({
                status: false,
                msg: `无法找到Id为${ruleId}的同步规则`
            } as Reply);
            return
        }
        const data = await Database.instance.getSyncConfigDetail(ruleId);
        translateStringToArray(root);
        translateStringToArray(data);
        const rule: RuleDetails = {
            basePath: root[0].serverPath,
            ruleName: root[0].configName,
            deleteId: [],
            updateRules: {
                file: (<string[]>root[0].syncFiles).reduce((arr, data) => {
                    arr.push({
                        ruleName: "",
                        clientPath: data
                    } as RuleFile);
                    return arr;
                }, [] as RuleFile[]),
                folder: data.reduce((arr, data) => {
                    arr.push({
                        subId: data.id,
                        ruleName: data.ruleName || "",
                        clientPath: data.clientPath,
                        serverPath: data.serverPath,
                        mode: data.syncMode,
                        ignore: data.ignoreFile,
                        delete: data.deleteFile
                    } as RuleFolder);
                    return arr;
                }, [] as RuleFolder[])
            }
        };
        res.status(200).json({
            status: true,
            data: rule
        } as Reply);
    };

    export const addRule = async (req: Request, res: Response) => {
        const {basePath, ruleName, updateRules} = <RuleDetails>req.body;
        const ruleId = (await Database.instance.getAvailableRuleId())[0].ruleId + 1;
        await Database.instance.insertSyncConfigRoot(ruleId, basePath, ruleName, updateRules.file);
        for (const folder of updateRules.folder) {
            await Database.instance.insertSyncConfigFolder({
                clientPath: folder.clientPath,
                delete: (<string>folder.delete).replaceAll("\n", ","),
                ignore: (<string>folder.ignore).replaceAll("\n", ","),
                mode: folder.mode,
                ruleId,
                serverPath: folder.serverPath,
                ruleName: folder.ruleName
            } as RuleFolderUpdate);
        }
        res.status(200).json({
            status: true,
            data: ruleId
        } as Reply);
    };

    export const deleteRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        await Database.instance.deleteSyncConfig(ruleId);
        res.status(200).json({
            status: true,
            data: ruleId
        } as Reply);
    };

    export const updateRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        const {basePath, ruleName, updateRules, deleteId} = <RuleDetails>req.body;
        await Database.instance.updateSyncConfigRoot(ruleId, basePath, ruleName, updateRules.file);
        if (deleteId.length > 0) {
            await Database.instance.deleteSyncConfigFolder(ruleId, deleteId.map(id => Number(id)));
        }
        for (const folder of updateRules.folder) {
            if (folder.subId) {
                await Database.instance.updateSyncConfigFolder({
                    clientPath: folder.clientPath,
                    delete: (<string>folder.delete).replaceAll("\n", ","),
                    ignore: (<string>folder.ignore).replaceAll("\n", ","),
                    mode: folder.mode,
                    ruleId,
                    serverPath: folder.serverPath,
                    subId: folder.subId,
                    ruleName: folder.ruleName
                });
                continue;
            }
            await Database.instance.insertSyncConfigFolder({
                clientPath: folder.clientPath,
                delete: (<string>folder.delete).replaceAll("\n", ","),
                ignore: (<string>folder.ignore).replaceAll("\n", ","),
                mode: folder.mode,
                ruleId,
                serverPath: folder.serverPath,
                ruleName: folder.ruleName
            });
        }
        res.status(200).json({
            status: true
        } as Reply);
    };

    export const enableRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        await Database.instance.enableSyncConfig(ruleId);
        res.status(200).json({
            status: true,
            data: ruleId
        } as Reply);
    };

    export const disableRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        await Database.instance.disableSyncConfig(ruleId);
        res.status(200).json({
            status: true,
            data: ruleId
        } as Reply);
    };

    export const getRuleList = async (req: Request, res: Response) => {
        const {search, pageSize, currentPage} = req.body;
        if ([search, pageSize, currentPage].includes(undefined)) {
            res.status(400).json({
                status: true,
                msg: "缺少查询参数"
            } as Reply);
            return;
        }
        const data = await Database.instance.getSyncConfigPage(
            pageSize * (currentPage - 1) + 1,
            pageSize * currentPage,
            search);
        res.status(200).json({
            status: true,
            data
        } as Reply)
    };

    export const getFileList = async (req: Request, res: Response) => {
        const path = preprocessingPath(req);
        res.status(200).json({
            status: true,
            data: FileUtils.getFileTree(path)
        } as Reply);
    };

    export const createFile = async (req: Request, res: Response) => {
        const path = preprocessingPath(req);
        checkFileExist(path, true);
        res.status(200).json({status: true} as Reply);
    };

    export const createFolder = async (req: Request, res: Response) => {
        const path = preprocessingPath(req);
        checkDirExist(path, true);
        res.status(200).json({status: true} as Reply);
    };

    export const deleteFolder = async (req: Request, res: Response) => {
        const path = preprocessingPath(req);
        try {
            rmSync(path, {recursive: true, force: true});
            res.status(200).json({status: true} as Reply);
        } catch (error) {
            logger.error(error);
            res.status(500).json({status: false, msg: error} as Reply);
        }
    };

    export const deleteFile = async (req: Request, res: Response) => {
        const path = preprocessingPath(req);
        try {
            unlinkSync(path);
            res.status(200).json({status: true} as Reply);
        } catch (error) {
            logger.error(error);
            res.status(500).json({status: false, msg: error} as Reply);
        }
    };

    export const getFileContent = async (req: Request, res: Response) => {
        const path = preprocessingPath(req);
        const stat = statSync(path);
        if (stat.isFile()) {
            res.status(200).json({
                status: true,
                data: readFileSync(path, {encoding: 'utf8'})
            } as Reply);
        } else {
            res.status(404).json({
                status: false,
                msg: "指定文件不存在"
            } as Reply);
        }
    };

    export const updateFileContent = async (req: Request, res: Response) => {
        const path = preprocessingPath(req);
        const stat = statSync(path);
        const data = req.body.data;
        if (stat.isFile()) {
            writeFileSync(path, data, {encoding: 'utf8'});
            res.status(200).json({
                status: true,
            } as Reply);
        } else {
            res.status(404).json({
                status: false,
                msg: "指定文件不存在"
            } as Reply);
        }
    };

    export const renameFile = async (req: Request, res: Response) => {

    };

    export const renameFolder = async (req: Request, res: Response) => {

    };
}