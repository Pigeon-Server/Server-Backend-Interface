import {ParamMismatchError} from "@/error/requestError";
import {Database} from "@/database/database";
import {api} from "@/base/logger";
import {EncryptUtils} from "@/utils/encryptUtils";
import {HttpCode} from "@/utils/httpCode";
import {Utils} from "@/utils/utils";
import {Config} from "@/base/config";
import {sign} from "jsonwebtoken";
import {Account} from "@/database/model/account";

export namespace AuthService {
    import getAccountInfoByUsername = Database.getAccountInfoByUsername;
    import encryptPassword = EncryptUtils.encryptPassword;
    import translateTime = Utils.translateTime;
    import serverConfig = Config.serverConfig;

    export const generateJWTToken = (payload: object) => {
        return sign(payload, serverConfig.jwt.secretKey,
            {
                expiresIn: serverConfig.jwt.expiresIn,
                algorithm: "HS256",
                issuer: "Pigeon Server Team",
                subject: "Server Backend Interface"
            });
    };

    export const getAuthInfo = (account: Account | JwtData) => {
        return {
            permission: account.permission,
            tokenExpiresIn: translateTime(serverConfig.jwt.expiresIn),
            token: generateJWTToken({
                username: account.username,
                permission: account.permission
            }),
            refreshToken: generateJWTToken({
                username: account.username,
                permission: account.permission,
                type: "refresh"
            })
        } as AuthInfo;
    };

    export const login = async (username?: string, password?: string) => {
        if (username === undefined || password === undefined) {
            throw new ParamMismatchError("用户名或密码不能为空");
        }
        const data = await getAccountInfoByUsername(username);
        if (data === null) {
            throw new ParamMismatchError("指定用户名不存在或密码错误");
        }
        api.debug(`User(${username}) request login with password: ${password}, salt: ${data.salt}`);
        const passwordWithSalt = encryptPassword(password, data.salt);
        if (data.password === passwordWithSalt) {
            api.debug(`Password authentication successful`);
            return {
                code: HttpCode.OK,
                response: {
                    status: true,
                    msg: "登陆成功",
                    data: getAuthInfo(data)
                } as Reply
            } as ServiceReturn;
        } else {
            api.debug(`Password authentication failed`);
            throw new ParamMismatchError("指定用户名不存在或密码错误");
        }
    };

    export const getUserPermission = async (username?: string) => {
        if (username === undefined) {
            throw new ParamMismatchError("用户名不能为空");
        }
        const data = await getAccountInfoByUsername(username);
        if (data === null) {
            throw new ParamMismatchError("指定用户名不存在");
        }
        return {
            code: HttpCode.OK,
            response: {
                status: true,
                data: data.permission
            } as Reply
        } as ServiceReturn;
    };
}