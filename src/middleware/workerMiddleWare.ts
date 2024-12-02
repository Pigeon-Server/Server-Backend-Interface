import {Tracker} from "@/module/tracker";
import {NextFunction, Request, Response} from "express";
import {api} from "@/base/logger";
import {Config} from "@/base/config";
import {HttpCode} from "@/utils/httpCode";

export namespace WorkerMiddleWare {
    import serverConfig = Config.serverConfig;
    const tracker = new Tracker(serverConfig.callLimit.count, serverConfig.callLimit.time);

    export const checkCallLimit = (req: Request, res: Response, next: NextFunction) => {
        api.info(`New access from ${req.ip} is processing by oauthApiController`);
        if (!tracker.trackIP(req.ip!)) {
            api.warn(`Access Denial: Api call limit`);
            res.status(HttpCode.TooManyRequests).json({status: false, msg: "超出API访问限制"});
            return;
        }
        next();
    };
}