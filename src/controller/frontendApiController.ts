import {NextFunction, Request, Response} from "express";
import {SyncFileManager} from "@/module/syncFileManager";
import {Utils} from "@/utils/utils";
import {FileUtils} from "@/utils/fileUtils";
import {join} from "path";
import {Config} from "@/base/config";
import {createWriteStream, readFileSync, rmSync, statSync, writeFileSync} from "fs";
import {logger} from "@/base/logger";
import {Database} from "@/database/database";
import {cp, rename} from "fs/promises";
import archiver from "archiver";
import AdmZip from "adm-zip";
import {EncryptUtils} from "@/utils/encryptUtils";
import {
    FileExistsError,
    IllegalPathError,
    ParamMismatchError,
    RequestError,
    TargetNotFoundError
} from "@/error/requestError";
import {HttpCode} from "@/utils/httpCode";
import {ExitCode, WorkerManager} from "@/module/workerManager";
import {WorkerExistError} from "@/error/workerError";

export namespace FrontendApiController {
    import reloadSyncConfig = SyncFileManager.reloadSyncConfig;
    import translateStringToArray = Utils.translateStringToArray;
    import updateConfig = Config.updateConfig;
    import checkDirExist = FileUtils.checkDirExist;
    import checkFileExist = FileUtils.checkFileExist;
    import checkFileOperation = FileUtils.checkFileOperation;
    import FileOperation = FileUtils.FileOperation;
    import CheckResult = FileUtils.CheckResult;
    import encryptFile = EncryptUtils.encryptFile;
    import encryptSHA256 = EncryptUtils.encryptSHA256;
    import serverConfig = Config.serverConfig;

    const checkPath = (path: string) => {
        path = path.startsWith(updateConfig.fileBasePath) ? path : join(updateConfig.fileBasePath, path);
        path = path.normalize();
        if (!path.startsWith(updateConfig.fileBasePath)) {
            throw new IllegalPathError();
        }
        return path;
    };

    const preprocessingPath = (req: Request, next: NextFunction) => {
        try {
            return checkPath(req.params.path);
        } catch (err) {
            next(err);
            return undefined
        }
    };

    const filesOperation = async (req: Request, res: Response, next: NextFunction, operation: FileOperation,
                                  successCallback: (sourcePath: string, destPath: string) => Promise<void>) => {
        let {fileList} = req.body;
        if (fileList === undefined) {
            next(new ParamMismatchError());
            return;
        }
        let success = 0;
        let fail = 0;
        for (const file of <FileOperationParam[]>fileList) {
            const sourcePath = checkPath(file.sourcePath);
            const destPath = checkPath(file.destPath);
            const checkResult = checkFileOperation(operation, sourcePath, destPath);
            switch (checkResult) {
                case CheckResult.PASSED:
                    await successCallback(sourcePath, destPath);
                    success++;
                    break;
                case CheckResult.DEST_EXIST:
                    fail++;
                    break;
                case CheckResult.SOURCE_NOT_FOUND:
                    fail++;
                    break;
            }
        }
        res.status(HttpCode.OK).json({
            status: true,
            data: {
                success,
                fail,
                total: (<FileOperationParam[]>fileList).length
            }
        } as Reply);
    };

    const fileOperation = async (req: Request, res: Response, next: NextFunction, operation: FileOperation,
                                 successCallback: (sourcePath: string, destPath: string) => Promise<void>) => {
        let {sourcePath, destPath} = req.body;
        if ([sourcePath, destPath].includes(undefined)) {
            next(new ParamMismatchError());
            return;
        }
        sourcePath = checkPath(sourcePath);
        destPath = checkPath(destPath);
        const checkResult = checkFileOperation(operation, sourcePath, destPath);
        switch (checkResult) {
            case CheckResult.PASSED:
                await successCallback(sourcePath, destPath);
                res.status(HttpCode.OK).json({
                    status: true
                } as Reply);
                break;
            case CheckResult.DEST_EXIST:
                next(new FileExistsError());
                break;
            case CheckResult.SOURCE_NOT_FOUND:
                next(new TargetNotFoundError());
                break;
        }
    };

    export const reloadRules = async (_: Request, res: Response, next: NextFunction) => {
        let workerId: string;
        try {
            workerId = WorkerManager.newWorker("Rule reload task");
        } catch (err) {
            if (err instanceof WorkerExistError) {
                res.status(HttpCode.Accepted).json({
                    status: true,
                    msg: "重载任务已提交, 重载可能需要一定时间",
                    data: err.workerId
                } as Reply);
            }
            return;
        }
        res.status(HttpCode.Accepted).json({
            status: true,
            msg: "重载任务已提交, 重载可能需要一定时间",
            data: workerId
        } as Reply);
        const status = await reloadSyncConfig();
        if (status) {
            WorkerManager.workerFinish(workerId, ExitCode.Normal);
            return;
        } else {
            WorkerManager.workerFinish(workerId, ExitCode.Exception);
            next(new RequestError(HttpCode.InternalServerError, "重载同步规则失败"));
        }
    };

    export const getRule = async (req: Request, res: Response, next: NextFunction) => {
        const ruleId = Number(req.params.id);
        const root = await Database.getSyncConfigRoot(ruleId);
        if (root === null) {
            next(new TargetNotFoundError(`无法找到Id为${ruleId}的同步规则`));
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
        res.status(HttpCode.OK).json({
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
        res.status(HttpCode.OK).json({
            status: true,
            data: ruleId
        } as Reply);
    };

    export const realDeleteRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        await Database.realDeleteSyncConfig(ruleId);
        res.status(HttpCode.OK).json({
            status: true,
            data: ruleId
        } as Reply);
    };

    export const deleteRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        await Database.deleteSyncConfig(ruleId);
        res.status(HttpCode.OK).json({
            status: true,
            data: ruleId
        } as Reply);
    };

    export const restoreRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        await Database.restoreSyncConfig(ruleId);
        res.status(HttpCode.OK).json({
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
        res.status(HttpCode.OK).json({
            status: true
        } as Reply);
    };

    export const enableRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        await Database.enableSyncConfig(ruleId);
        res.status(HttpCode.OK).json({
            status: true,
            data: ruleId
        } as Reply);
    };

    export const disableRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        await Database.disableSyncConfig(ruleId);
        res.status(HttpCode.OK).json({
            status: true,
            data: ruleId
        } as Reply);
    };

    export const getRuleList = async (req: Request, res: Response, next: NextFunction) => {
        const {search, pageSize, currentPage} = req.body;
        if ([search, pageSize, currentPage].includes(undefined)) {
            next(new ParamMismatchError());
            return;
        }
        const data = await Database.getSyncConfigPage(
            pageSize * (currentPage - 1) + 1,
            pageSize * currentPage,
            search);
        res.status(HttpCode.OK).json({
            status: true,
            data
        } as Reply)
    };

    export const getAllFile = async (_: Request, res: Response) => {
        res.status(HttpCode.OK).json({
            status: true,
            data: FileUtils.getFileTree(updateConfig.fileBasePath, updateConfig.fileBasePath)
        } as Reply);
    };

    export const getFileList = async (req: Request, res: Response, next: NextFunction) => {
        const path = preprocessingPath(req, next);
        if (!path) {
            return
        }
        res.status(HttpCode.OK).json({
            status: true,
            data: FileUtils.getFileTree(path, updateConfig.fileBasePath)
        } as Reply);
    };

    export const createFile = async (req: Request, res: Response, next: NextFunction) => {
        const path = preprocessingPath(req, next);
        if (!path) {
            return
        }
        checkFileExist(path, true);
        res.status(HttpCode.OK).json({status: true} as Reply);
    };

    export const createFolder = async (req: Request, res: Response, next: NextFunction) => {
        const path = preprocessingPath(req, next);
        if (!path) {
            return
        }
        checkDirExist(path, true);
        res.status(HttpCode.OK).json({status: true} as Reply);
    };

    export const deleteFolder = async (req: Request, res: Response, next: NextFunction) => {
        const path = preprocessingPath(req, next);
        if (!path) {
            return
        }
        try {
            rmSync(path, {recursive: true, force: true});
            res.status(HttpCode.OK).json({status: true} as Reply);
        } catch (error) {
            logger.error(error);
            next(error);
        }
    };

    export const deleteFolders = async (req: Request, res: Response) => {
        const {deleteFolders} = req.body;
        let success = 0;
        let fail = 0;
        for (const file of <string[]>deleteFolders) {
            try {
                rmSync(checkPath(file));
                success++;
            } catch (err) {
                logger.error(err);
                fail++;
            }
        }
        res.status(HttpCode.OK).json({
            status: true,
            data: {
                success,
                fail,
                total: (<string[]>deleteFolders).length
            }
        } as Reply);
    };

    export const deleteFile = async (req: Request, res: Response, next: NextFunction) => {
        const path = preprocessingPath(req, next);
        if (!path) {
            return
        }
        try {
            rmSync(path);
            res.status(HttpCode.OK).json({status: true} as Reply);
        } catch (error) {
            logger.error(error);
            next(error);
        }
    };

    export const deleteFiles = async (req: Request, res: Response) => {
        const {deleteFiles} = req.body;
        let success = 0;
        let fail = 0;
        for (const file of <string[]>deleteFiles) {
            try {
                rmSync(file);
                success++;
            } catch (err) {
                logger.error(err);
                fail++;
            }
        }
        res.status(HttpCode.OK).json({
            status: true,
            data: {
                success,
                fail,
                total: (<string[]>deleteFiles).length
            }
        } as Reply);
    };

    export const getFileContent = async (req: Request, res: Response, next: NextFunction) => {
        const path = preprocessingPath(req, next);
        if (!path) {
            return
        }
        const stat = statSync(path);
        if (stat.isFile()) {
            res.status(HttpCode.OK).json({
                status: true,
                data: readFileSync(path, {encoding: 'utf8'})
            } as Reply);
        } else {
            next(new TargetNotFoundError());
        }
    };

    export const updateFileContent = async (req: Request, res: Response, next: NextFunction) => {
        const path = preprocessingPath(req, next);
        if (!path) {
            return
        }
        const stat = statSync(path);
        const data = req.body.data;
        if (stat.isFile()) {
            writeFileSync(path, data, {encoding: 'utf8'});
            res.status(HttpCode.OK).json({
                status: true,
            } as Reply);
        } else {
            next(new TargetNotFoundError());
        }
    };

    export const renameFile = async (req: Request, res: Response, next: NextFunction) => {
        await fileOperation(req, res, next, FileOperation.FILE_RENAME,
            (sourcePath, destPath) => rename(sourcePath, destPath));
    };

    export const renameFiles = async (req: Request, res: Response, next: NextFunction) => {
        await filesOperation(req, res, next, FileOperation.FILE_RENAME,
            (sourcePath, destPath) => rename(sourcePath, destPath));
    };

    export const copyFile = async (req: Request, res: Response, next: NextFunction) => {
        await fileOperation(req, res, next, FileOperation.FILE_COPY,
            (sourcePath, destPath) => cp(sourcePath, destPath));
    };

    export const copyFiles = async (req: Request, res: Response, next: NextFunction) => {
        await filesOperation(req, res, next, FileOperation.FILE_COPY,
            (sourcePath, destPath) => cp(sourcePath, destPath));
    };

    export const renameFolder = async (req: Request, res: Response, next: NextFunction) => {
        await fileOperation(req, res, next, FileOperation.DIR_RENAME,
            (sourcePath, destPath) => rename(sourcePath, destPath));
    };

    export const renameFolders = async (req: Request, res: Response, next: NextFunction) => {
        await filesOperation(req, res, next, FileOperation.DIR_RENAME,
            (sourcePath, destPath) => rename(sourcePath, destPath));
    };

    export const copyFolder = async (req: Request, res: Response, next: NextFunction) => {
        await fileOperation(req, res, next, FileOperation.DIR_COPY,
            (sourcePath, destPath) => cp(sourcePath, destPath, {recursive: true}));
    };

    export const copyFolders = async (req: Request, res: Response, next: NextFunction) => {
        await filesOperation(req, res, next, FileOperation.DIR_COPY,
            (sourcePath, destPath) => cp(sourcePath, destPath, {recursive: true}));
    };

    export const downloadFile = async (req: Request, res: Response, next: NextFunction) => {
        const path = preprocessingPath(req, next);
        if (!path) {
            return
        }
        if (checkFileExist(path)) {
            res.download(path);
            return;
        }
        next(new TargetNotFoundError());
    };

    export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
        const {index, hash} = req.body;
        const file = req.file;
        if (file === undefined) {
            next(new RequestError(HttpCode.BadRequest, 'No file upload'));
            return;
        }
        const sha256 = encryptFile(file.path, encryptSHA256);
        if (sha256 !== hash) {
            next(new RequestError(HttpCode.BadRequest, 'Block hash verification failed'));
            return;
        }
        const chunkFilePath = join(file.destination, `${hash}.tmp`);
        if (checkFileExist(chunkFilePath)) {
            res.status(HttpCode.OK).json({
                status: true,
                data: {
                    pass: true,
                    index: index
                }
            } as Reply);
            return;
        }
        await rename(file.path, chunkFilePath);
        res.status(HttpCode.OK).json({
            status: true,
            data: {
                pass: false,
                index: index
            }
        } as Reply);
    };

    export const mergeFile = async (req: Request, res: Response, next: NextFunction) => {
        const {fileName, chunkHashList, removeChunkFile} = req.body;
        const fileSavePath = checkPath(fileName);
        const output = createWriteStream(fileSavePath);

        output.on("error", (err) => {
            logger.error(err.message);
            next(new RequestError(HttpCode.InternalServerError, "An error occurred in the merged file"));
            throw err;
        });

        (chunkHashList as string[]).map((chunkHash) => {
            const chunkSavePath = join(serverConfig.uploadPath, `${chunkHash}.tmp`);
            if (!checkFileExist(chunkSavePath)) {
                next(new TargetNotFoundError(`Can not found chunk file ${chunkHash}`));
                return;
            }
            const data = readFileSync(chunkSavePath);
            output.write(data);
        });

        try {
            if (removeChunkFile) {
                (chunkHashList as string[]).forEach((chunkHash) => {
                    rmSync(join(serverConfig.uploadPath, `${chunkHash}.tmp`));
                });
            }

            output.end(() => {
                res.status(HttpCode.OK).json({
                    status: true
                });
            });
        } catch (err: any) {
            next(new RequestError(HttpCode.InternalServerError, "An error occurred in the merged file"));
        }
    };

    export const compression = async (req: Request, res: Response) => {
        let {fileList, compressFileName} = req.body;
        compressFileName = checkPath(compressFileName);
        let workerId: string;
        try {
            workerId = WorkerManager.newWorker("Compression Task");
        } catch (err) {
            if (err instanceof WorkerExistError) {
                res.status(HttpCode.Accepted).json({
                    status: true,
                    msg: `压缩任务已提交，压缩可能需要一点时间`,
                    data: err.workerId
                } as Reply);
            }
            return;
        }
        res.status(HttpCode.Accepted).json({
            status: true,
            msg: `压缩任务已提交，压缩可能需要一点时间`,
            data: workerId
        } as Reply);
        try {
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
            WorkerManager.workerFinish(workerId, ExitCode.Normal);
        } catch (err) {
            logger.error(err);
            WorkerManager.workerFinish(workerId, ExitCode.Exception, err as Error);
        }
    };

    export const decompression = async (req: Request, res: Response) => {
        let {compressFileName, targetFolder} = req.body;
        compressFileName = checkPath(compressFileName);
        targetFolder = checkPath(targetFolder);
        let workerId: string;
        try {
            workerId = WorkerManager.newWorker("Decompression Task");
        } catch (err) {
            if (err instanceof WorkerExistError) {
                res.status(HttpCode.Accepted).json({
                    status: true,
                    msg: `解压缩任务已提交, 解压可能需要一点时间`,
                    data: err.workerId
                } as Reply);
            }
            return;
        }
        res.status(HttpCode.Accepted).json({
            status: true,
            msg: `解压缩任务已提交, 解压可能需要一点时间`,
            data: workerId
        } as Reply);
        try {
            const zip = new AdmZip(compressFileName);
            zip.extractAllTo(targetFolder, true);
            WorkerManager.workerFinish(workerId, ExitCode.Normal);
        } catch (err) {
            logger.error(err);
            WorkerManager.workerFinish(workerId, ExitCode.Exception, err as Error);
        }
    };
}