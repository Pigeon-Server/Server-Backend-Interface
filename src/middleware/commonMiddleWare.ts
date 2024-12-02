import {logger} from "@/base/logger";
import {Utils} from "@/utils/utils";
import {NextFunction, Request, Response} from "express";
import {RequestError} from "@/error/requestError";
import {HttpCode} from "@/utils/httpCode";

export namespace CommonMiddleWare {
    import enableHSTS = Utils.enableHSTS;
    export const accessRecord = (req: Request, res: Response, next: NextFunction) => {
        enableHSTS(res);
        logger.info(`[${req.protocol}] Client request (${req.method})${req.path} from ${req.ip}`);
        next();
    };

    export const errorHandler = (err: Error, _: Request, res: Response, __: NextFunction) => {
        if (err instanceof RequestError) {
            res.status(err.statusCode).json({
                status: false,
                msg: err.message
            } as Reply);
            return
        }
        logger.error(`Server Error! ${err.message}`);
        res.status(HttpCode.InternalServerError);
        res.send("Server Error!")
    };

    export const noCacheHandler = (_: Request, res: Response, next: NextFunction) => {
        res.setHeader("Cache-Control", "no-cache");
        next();
    }
}