import {NextFunction, Request, Response} from "express";
import {api, logger} from "@/base/logger";
import {floor} from "lodash";
import {AuthService} from "@/service/authService";
import {HttpCode} from "@/utils/httpCode";

export namespace AuthApiController {
    export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {username, password} = req.body;
            const data = await AuthService.login(username, password);
            res.status(data.code).json(data.response);
        } catch (err) {
            logger.error(err);
            next(err);
        }
    };

    export const getPermission = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const username = req.params.username;
            const data = await AuthService.getUserPermission(username);
            res.status(data.code).json(data.response);
        } catch (err) {
            logger.error(err);
            next(err);
        }
    };

    export const getTokenInfo = (_: Request, res: Response) => {
        const data = res.locals.JWTData as JwtData;
        res.status(HttpCode.OK).json({
            status: true,
            data: {
                username: data.username,
                permission: data.permission,
                tokenExpiresIn: data.exp - floor(Date.now() / 1000)
            }
        } as Reply);
    };

    export const flushToken = async (_: Request, res: Response) => {
        const data = res.locals.JWTData as JwtData;
        api.debug(`Flush token: ${data}`);
        res.status(HttpCode.OK).json({
            status: true,
            msg: "JWT Token 刷新成功",
            data: AuthService.getAuthInfo(data)
        } as Reply);
    };

    export const createAccount = async (req: Request, res: Response) => {

    };

    export const deleteAccount = async (req: Request, res: Response) => {

    };
}