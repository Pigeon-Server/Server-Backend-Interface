import {Request, Response} from "express";
import {Database} from "@/base/mysql";
import {EncryptUtils} from "@/utils/encryptUtils";
import {api} from "@/base/logger";
import {sign} from "jsonwebtoken";
import {Config} from "@/base/config";
import {Utils} from "@/utils/utils";
import {floor} from "lodash";

export namespace AuthApiController {
    import encryptSHA256 = EncryptUtils.encryptSHA256;
    import serverConfig = Config.serverConfig;
    import translateTime = Utils.translateTime;

    export function generateJWTToken(payload: object, expiresIn: string): string {
        return sign(payload, serverConfig.jwt.secretKey,
            {
                expiresIn,
                algorithm: "HS256",
                issuer: "Pigeon Server Team",
                subject: "Server Backend Interface"
            });
    }

    export const userLogin = async (req: Request, res: Response) => {
        const {username, password} = req.body;
        if (!username || !password) {
            res.status(404).json({
                status: false,
                msg: "用户名或密码不能为空"
            } as Reply);
            return
        }
        const data = await Database.instance.getAccountInfoByUsername(username);
        if (data.length === 0) {
            res.status(404).json({
                status: false,
                msg: "指定用户名不存在或密码错误"
            } as Reply);
            return
        }
        api.debug(`User(${username}) request login with password: ${password}, salt: ${data[0].salt}`);
        const password_sha256 = encryptSHA256(`${username}.${password}.${data[0].salt}`);
        if (data[0].password === password_sha256) {
            api.debug(`Password authentication successful`);
            res.status(200).json({
                status: true,
                msg: "登陆成功",
                data: {
                    permission: data[0].permission,
                    tokenExpiresIn: translateTime(serverConfig.jwt.expiresIn),
                    token: generateJWTToken({
                        username,
                        permission: data[0].permission
                    }, serverConfig.jwt.expiresIn),
                    refreshToken: generateJWTToken({
                        username,
                        permission: data[0].permission,
                        type: "refresh"
                    }, serverConfig.jwt.refreshTokenExpiresIn)
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
        const data = await Database.instance.getAccountInfoByUsername(username);
        if (data.length === 0) {
            res.status(404).json({
                status: false,
                msg: "指定用户名不存在或密码错误"
            } as Reply);
            return
        }
        res.status(200).json({
            status: true,
            data: data[0].permission
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
                }, serverConfig.jwt.expiresIn),
                refreshToken: generateJWTToken({
                    username: data.username,
                    permission: data.permission,
                    type: "refresh"
                }, serverConfig.jwt.refreshTokenExpiresIn)
            } as AuthInfo
        } as Reply);
    };

    export const createAccount = async (req: Request, res: Response) => {

    };

    export const deleteAccount = async (req: Request, res: Response) => {

    };
}