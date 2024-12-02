import {NextFunction, Request, Response} from "express";

import {Config} from "@/base/config";
import stringRandom from "string-random";
import {OAuthService} from "@/service/oauthService";
import {logger} from "@/base/logger";
import {CSRFAttachError, RefererError} from "@/error/requestError";

declare module 'express-session' {
    interface SessionData {
        state: string,
        redirect_uri: string,
        callback_path: string
    }
}

export namespace OAuthApiController {
    import updateConfig = Config.updateConfig;

    export const oauthLogin = async (req: Request, res: Response) => {
        const {callback_url, callback_path} = req.query;
        const state = stringRandom(8);
        req.session.state = state;
        req.session.redirect_uri = <string>callback_url;
        req.session.callback_path = <string>callback_path;
        res.redirect(`${updateConfig.api.oauth.authUrl}?client_id=${updateConfig.api.oauth.clientId}&response_type=code&state=${state}&redirect_uri=${callback_url}`);
    };

    export const oauthCallback = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.headers.referer === undefined) {
                next(new RefererError());
                return;
            }
            const {code, state} = req.query;
            if (state as string !== req.session.state) {
                next(new CSRFAttachError(`OAuth state mismatch, you may have suffered a CSRF attack`));
                return;
            }
            const token = await OAuthService.getOauthToken(code as string, req.session.redirect_uri as string);
            res.redirect(`${req.headers.referer}${req.session.callback_path}?token=${token}`);
        } catch (err) {
            logger.error(err);
            next(err);
        }
    };
}