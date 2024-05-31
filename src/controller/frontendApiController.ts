import {Request, Response} from "express";
import {logger} from "@/base/logger";
import {Database} from "@/base/mysql";
import {SyncFileManager} from "@/manager/syncFileManager";
import {Utils} from "@/utils/utils";

export namespace FrontendApiController {
    import reloadSyncConfig = SyncFileManager.reloadSyncConfig;
    import translateStringToArray = Utils.translateStringToArray;
    export const reloadRules = async (req: Request, res: Response) => {
        const status = await reloadSyncConfig();
        if (status) {
            res.statusCode = 200;
        } else {
            res.statusCode = 500;
        }
        res.send({
            status: true,
            msg: "",
            data: status
        } as Reply);
    };

    export const getRule = async (req: Request, res: Response) => {
        const ruleId = Number(req.params.id);
        const root = await Database.instance.getSyncConfigRoot(ruleId);
        if (root.length === 0) {
            res.status(404).json({
                status: true,
                msg: `无法找到Id为${ruleId}的同步规则`,
                data: {}
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
        res.send({
            status: true,
            msg: "成功",
            data: rule
        } as Reply);
    };

    export const addRule = (req: Request, res: Response) => {
        res.send(req.body)
    };

    export const deleteRule = (req: Request, res: Response) => {
        res.send(req.params.id);
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
    };

    export const enableRule = (req: Request, res: Response) => {
        res.send({
            status: true,
            data: req.params.id
        });
    };

    export const disableRule = (req: Request, res: Response) => {
    };

    export const getRuleList = async (req: Request, res: Response) => {
        const {search, pageSize, currentPage} = req.body;
        if ([search, pageSize, currentPage].includes(undefined)) {
            res.status(400).json({
                status: true,
                msg: "缺少查询参数",
                data: {}
            } as Reply);
            return;
        }
        const data = await Database.instance.getSyncConfigPage(
            pageSize * (currentPage - 1) + 1,
            pageSize * currentPage,
            search);
        res.status(200).json({
            status: true,
            msg: "成功",
            data
        } as Reply)
    }
}