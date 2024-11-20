import {Request, Response} from "express";
import {EncryptUtils} from "@/utils/encryptUtils";
import {api} from "@/base/logger";
import {Config} from "@/base/config";
import {Utils} from "@/utils/utils";
import {floor} from "lodash";
import {Database} from "@/database/database";

export namespace AuthApiController {
    import serverConfig = Config.serverConfig;
    import translateTime = Utils.translateTime;
    import getAccountInfoByUsername = Database.getAccountInfoByUsername;
    import encryptPassword = EncryptUtils.encryptPassword;
    import generateJWTToken = EncryptUtils.generateJWTToken;

    export const userLogin = async (req: Request, res: Response) => {
        const {username, password} = req.body;
        if (!username || !password) {
            res.status(404).json({
                status: false,
                msg: "用户名或密码不能为空"
            } as Reply);
            return
        }
        const data = await getAccountInfoByUsername(username);
        if (data === null) {
            res.status(404).json({
                status: false,
                msg: "指定用户名不存在或密码错误"
            } as Reply);
            return
        }
        api.debug(`User(${username}) request login with password: ${password}, salt: ${data.salt}`);
        const password_sha256 = encryptPassword(password, data.salt);
        if (data.password === password_sha256) {
            api.debug(`Password authentication successful`);
            res.status(200).json({
                status: true,
                msg: "登陆成功",
                data: {
                    permission: data.permission,
                    tokenExpiresIn: translateTime(serverConfig.jwt.expiresIn),
                    token: generateJWTToken({
                        username,
                        permission: data.permission
                    }, serverConfig.jwt.expiresIn, serverConfig.jwt.secretKey),
                    refreshToken: generateJWTToken({
                        username,
                        permission: data.permission,
                        type: "refresh"
                    }, serverConfig.jwt.refreshTokenExpiresIn, serverConfig.jwt.secretKey)
                } as AuthInfo
            } as Reply);
            return
        } else {
            api.debug(`Password authentication failed`);
            res.status(404).json({
                status: false,
                msg: "指定用户名不存在或密码错误"
            } as Reply);
            return
        }
    };

    export const getPermission = async (req: Request, res: Response) => {
        const username = req.params.username;
        const data = await getAccountInfoByUsername(username);
        if (data === null) {
            res.status(404).json({
                status: false,
                msg: "指定用户名不存在或密码错误"
            } as Reply);
            return
        }
        res.status(200).json({
            status: true,
            data: data.permission
        } as Reply);
    };

    export const getTokenInfo = (_: Request, res: Response) => {
        const data = res.locals.JWTData as JwtData;
        res.status(200).json({
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
        res.status(200).json({
            status: true,
            msg: "JWT Token 刷新成功",
            data: {
                username: data.username,
                permission: data.permission,
                tokenExpiresIn: translateTime(serverConfig.jwt.expiresIn),
                token: generateJWTToken({
                    username: data.username,
                    permission: data.permission
                }, serverConfig.jwt.expiresIn, serverConfig.jwt.secretKey),
                refreshToken: generateJWTToken({
                    username: data.username,
                    permission: data.permission,
                    type: "refresh"
                }, serverConfig.jwt.refreshTokenExpiresIn, serverConfig.jwt.secretKey)
            } as AuthInfo
        } as Reply);
    };

    export const createAccount = async (req: Request, res: Response) => {

    };

    export const deleteAccount = async (req: Request, res: Response) => {

    };
}