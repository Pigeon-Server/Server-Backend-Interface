import {Request, Response} from "express";
import {logger} from "@/base/logger";
import {Database} from "@/base/mysql";

export namespace FrontendApiController {
    export const getAllRule = (req: Request, res: Response) => {
        Database.INSTANCE.getAllSyncConfig().then(data => {
            res.send(data);
        })
    };

    export const getRule = (req: Request, res: Response) => {
        res.send(req.params.id);
    };

    export const addRule = (req: Request, res: Response) => {
        res.send(req.body)
    };

    export const deleteRule = (req: Request, res: Response) => {
        res.send(req.params.id);
    };

    export const updateRule = (req: Request, res: Response) => {
        res.send(req.params.id);
    };

    export const enableRule = (req: Request, res: Response) => {

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
            });
            return;
        }
        const data = await Database.INSTANCE.getSyncConfigPage(
            pageSize * (currentPage - 1) + 1,
            pageSize * currentPage,
            search);
        res.status(200).json({
            status: true,
            msg: "成功",
            data
        });
    }
}