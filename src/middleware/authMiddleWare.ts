import {Tracker} from "@/module/tracker";
import {NextFunction, Request, Response} from "express";
import {api} from "@/base/logger";
import {Config} from "@/base/config";
import {TokenExpiredError, verify} from "jsonwebtoken";
import {Utils} from "@/utils/utils";
import {HttpCode} from "@/utils/httpCode";
import {AuthService} from "@/service/authService";

export namespace AuthMiddleware {
    import serverConfig = Config.serverConfig;
    import translateTime = Utils.translateTime;
    import generateJWTToken = AuthService.generateJWTToken;
    const tracker = new Tracker(serverConfig.callLimit.count, serverConfig.callLimit.time);

    export const checkCallLimit = (req: Request, res: Response, next: NextFunction) => {
        api.info(`New access from ${req.ip} is processing by authApiController`);
        if (!tracker.trackIP(req.ip!)) {
            api.warn(`Access Denial: Api call limit`);
            res.status(HttpCode.TooManyRequests).json({status: false, msg: "超出API访问限制"});
            return;
        }
        next();
    };

    export const requestLogin = (req: Request, res: Response, next: NextFunction) => {
        if (!req.headers.authorization) {
            res.status(403).json({
                status: false,
                msg: "No jwt token found"
            } as Reply);
            return
        }
        const token = req.headers.authorization.split(" ")[1];
        api.debug(`Verify JWT token ${token}`);
        verify(token, serverConfig.jwt.secretKey, (err, decoded) => {
            if (err || decoded === undefined || typeof decoded === "string") {
                if (err instanceof TokenExpiredError) {
                    res.status(401).json({
                        status: false,
                        msg: "JWT token expired"
                    } as Reply);
                    return
                }
                res.status(403).json({
                    status: false,
                    msg: "Invalid JWT token"
                } as Reply);
                return
            }
            const data = decoded as JwtData;
            if (data.type !== undefined && data.type === "refresh") {
                api.debug(`Refresh JWT token ${JSON.stringify(data)}`);
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
                        }),
                        refreshToken: generateJWTToken({
                            username: data.username,
                            permission: data.permission,
                            type: "refresh"
                        })
                    } as AuthInfo
                } as Reply);
                return;
            }
            api.debug(`JWT token authentication succeeded: ${JSON.stringify(data)}`);
            res.locals.JWTData = data;
            next();
        });
    };

    export const requestAdmin = (_: Request, res: Response, next: NextFunction) => {
        const data = res.locals.JWTData as JwtData;
        if (data.permission < 1) {
            res.status(403).json({
                status: false,
                msg: "Your permissions are not sufficient to view this entry"
            } as Reply);
            return;
        }
        next();
    };

    export const requestSuperAdmin = (_: Request, res: Response, next: NextFunction) => {
        const data = res.locals.JWTData as JwtData;
        if (data.permission < 2) {
            res.status(403).json({
                status: false,
                msg: "Your permissions are not sufficient to view this entry"
            } as Reply);
            return;
        }
        next();
    }
}