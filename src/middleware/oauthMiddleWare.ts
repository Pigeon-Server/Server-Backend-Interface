import {Tracker} from "@/manager/trackerManager";
import {NextFunction, Request, Response} from "express";
import {api} from "@/base/logger";
import {Config} from "@/base/config";

export namespace OAuthMiddleware {
    import serverConfig = Config.serverConfig;
    const tracker = new Tracker(serverConfig.callLimit.count, serverConfig.callLimit.time);

    export const checkCallLimit = (req: Request, res: Response, next: NextFunction) => {
        api.info(`New access from ${req.ip} is processing by oauthApiController`);
        // api访问限制
        if (!tracker.trackIP(req.ip!)) {
            api.warn(`Access Denial: Api call limit`);
            res.status(429).json({status: false, msg: "超出API访问限制"});
            return;
        }
        next();
    };
}