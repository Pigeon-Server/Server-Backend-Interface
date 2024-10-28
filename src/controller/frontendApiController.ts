import {Request, Response} from "express";
import {SyncFileManager} from "@/module/syncFileManager";
import {Utils} from "@/utils/utils";
import {FileUtils} from "@/utils/fileUtils";
import {join} from "path";
import {Config} from "@/base/config";
import {readFileSync, rmSync, statSync, writeFileSync} from "fs";
import {logger} from "@/base/logger";
import {Database} from "@/database/database";
import {cp, rename} from "fs/promises";
import {createWriteStream} from "fs";
import archiver from "archiver";
import AdmZip from "adm-zip";

export namespace FrontendApiController {
    import reloadSyncConfig = SyncFileManager.reloadSyncConfig;
    import translateStringToArray = Utils.translateStringToArray;
    import updateConfig = Config.updateConfig;
    import checkDirExist = FileUtils.checkDirExist;
    import checkFileExist = FileUtils.checkFileExist;
    import checkFileOperation = FileUtils.checkFileOperation;
    import FileOperation = FileUtils.FileOperation;
    import CheckResult = FileUtils.CheckResult;

    const checkPath = (path: string) => {
        return path.startsWith(updateConfig.fileBasePath) ? path : join(updateConfig.fileBasePath, path);
    };

    const preprocessingPath = (req: Request) => {
        return checkPath(req.params.path);
    };

    const fileOperation = async (req: Request, res: Response, operation: FileOperation,
                                 successCallback: (sourcePath: string, destPath: string) => Promise<void>) => {
        let {sourcePath, destPath} = req.body;
        if ([sourcePath, destPath].includes(undefined)) {
            res.status(400).json({
                status: false,
                msg: "缺少查询参数"
            } as Reply);
            return;
        }
        sourcePath = checkPath(sourcePath);
        destPath = checkPath(destPath);
        const checkResult = checkFileOperation(operation, sourcePath, destPath);
        switch (checkResult) {
            case CheckResult.PASSED:
                await successCallback(sourcePath, destPath);
                res.status(200).json({
                    status: true
                } as Reply);
                break;
            case CheckResult.DEST_EXIST:
                res.status(400).json({
                    status: false,
                    msg: "存在同名文件"
                } as Reply);
                break;
            case CheckResult.SOURCE_NOT_FOUND:
                res.status(404).json({
                    status: false,
                    msg: "无法找到指定文件"
                } as Reply);
                break;
        }
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
        const root = await Database.getSyncConfigRoot(ruleId);
        if (root === null) {
            res.status(404).json({
                status: false,
                msg: `无法找到Id为${ruleId}的同步规则`
            } as Reply);
            return
        }
        const data = await Database.getSyncConfigDetail(ruleId);
        translateStringToArray(root);
        translateStringToArray(data);
        const rule: RuleDetails = {
            basePath: root.serverPath,
            ruleName: root.configName || "",
            deleteId: [],
            updateRules: {
                file: (<string[]>root.syncFiles).reduce((arr, data) => {
                    arr.push({
                        ruleName: "",
                        clientPath: data
                    } as RuleFile);

                    return arr;
                }, [] as RuleFile[]),
                folder: data.reduce((arr, data) => {
                    arr.push({
                        subId: data.id,
                        ruleName: data.configName || "",
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
        const ruleId = await Database.getAvailableRuleId();
        await Database.insertSyncConfigRoot(ruleId, basePath, ruleName, updateRules.file);
        for (const folder of updateRules.folder) {
            await Database.insertSyncConfigFolder({
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
        await Database.deleteSyncConfig(ruleId);
        res.status(200).json({
            status: true,
            data: ruleId
        } as Reply);
    };

    export const updateRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        const {basePath, ruleName, updateRules, deleteId} = <RuleDetails>req.body;
        await Database.updateSyncConfigRoot(ruleId, basePath, ruleName, updateRules.file);
        if (deleteId.length > 0) {
            await Database.deleteSyncConfigFolder(ruleId, deleteId.map(id => Number(id)));
        }
        for (const folder of updateRules.folder) {
            if (folder.subId) {
                await Database.updateSyncConfigFolder({
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
            await Database.insertSyncConfigFolder({
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
        await Database.enableSyncConfig(ruleId);
        res.status(200).json({
            status: true,
            data: ruleId
        } as Reply);
    };

    export const disableRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        await Database.disableSyncConfig(ruleId);
        res.status(200).json({
            status: true,
            data: ruleId
        } as Reply);
    };

    export const getRuleList = async (req: Request, res: Response) => {
        const {search, pageSize, currentPage} = req.body;
        if ([search, pageSize, currentPage].includes(undefined)) {
            res.status(400).json({
                status: false,
                msg: "缺少查询参数"
            } as Reply);
            return;
        }
        const data = await Database.getSyncConfigPage(
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
            rmSync(path);
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
        await fileOperation(req, res, FileOperation.FILE_RENAME,
            (sourcePath, destPath) => rename(sourcePath, destPath));
    };

    export const copyFile = async (req: Request, res: Response) => {
        await fileOperation(req, res, FileOperation.FILE_COPY,
            (sourcePath, destPath) => cp(sourcePath, destPath));
    };

    export const renameFolder = async (req: Request, res: Response) => {
        await fileOperation(req, res, FileOperation.DIR_RENAME,
            (sourcePath, destPath) => rename(sourcePath, destPath));
    };

    export const copyFolder = async (req: Request, res: Response) => {
        await fileOperation(req, res, FileOperation.DIR_COPY,
            (sourcePath, destPath) => cp(sourcePath, destPath, {recursive: true}));
    };

    export const downloadFile = async (req: Request, res: Response) => {
        const path = preprocessingPath(req);
        if (checkFileExist(path)) {
            res.download(path);
            return;
        }
        res.status(404).json({
            status: false,
            msg: "文件不存在"
        } as Reply);
    };

    export const uploadFile = async (req: Request, res: Response) => {
        const path = preprocessingPath(req);
        const file = req.file;
        if (file === undefined) {
            res.status(400).json({
                status: false,
                msg: 'No file upload'
            } as Reply);
            return;
        }
        await rename(file.path, path.endsWith(file.originalname) ? path : join(path, file.originalname));
        res.status(200).json({
            status: true,
            msg: 'File uploaded successfully'
        } as Reply);
    };

    export const compression = async (req: Request, res: Response) => {
        let {fileList, compressFileName} = req.body;
        compressFileName = checkPath(compressFileName);
        res.status(200).json({
            status: true,
            msg: `压缩任务已提交，压缩可能需要一点时间`
        } as Reply);
        const output = createWriteStream(compressFileName, {encoding: 'utf8'});
        const archive = archiver('zip', {zlib: {level: 9}});
        archive.on('warning', (err) => logger.warn(err));
        archive.on('error', (err) => logger.error(err));
        output.on('close', () => logger.info(`Create zip file finish, path: ${compressFileName}, size: ${archive.pointer()} bytes`));
        archive.pipe(output);
        (fileList as CompressFile[]).forEach((file) => {
            if (file.isFile) {
                archive.file(file.path, {name: file.path.substring(file.path.lastIndexOf("\\") + 1)})
            } else {
                archive.directory(file.path, file.path.substring(file.path.lastIndexOf("\\") + 1));
            }
        });
        await archive.finalize();
    };

    export const decompression = async (req: Request, res: Response) => {
        let {compressFileName, targetFolder} = req.body;
        compressFileName = checkPath(compressFileName);
        targetFolder = checkPath(targetFolder);
        res.status(200).json({
            status: true,
            msg: `解压缩任务已提交, 解压可能需要一点时间`
        } as Reply);
        try {
            const zip = new AdmZip(compressFileName);
            zip.extractAllTo(targetFolder, true);
        } catch (err) {
            logger.error(err);
        }
    };
}