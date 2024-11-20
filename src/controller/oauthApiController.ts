import {Request, Response} from "express";

import {axios} from "@/module/apiManager";
import {Config} from "@/base/config";
import {Account} from "@/database/model/account";
import {EncryptUtils} from "@/utils/encryptUtils";
import {Utils} from "@/utils/utils";
import stringRandom from "string-random";

declare module 'express-session' {
    interface SessionData {
        state: string,
        redirect_uri: string,
        callback_path: string
    }
}

export namespace OAuthApiController {
    import updateConfig = Config.updateConfig;
    import encryptPassword = EncryptUtils.encryptPassword;
    import generateJWTToken = EncryptUtils.generateJWTToken;
    import generateKey = Utils.generateKey;
    import serverConfig = Config.serverConfig;

    export const oauthLogin = async (req: Request, res: Response) => {
        const {callback_url, callback_path} = req.query;
        const state = stringRandom(8);
        req.session.state = state;
        req.session.redirect_uri = <string>callback_url;
        req.session.callback_path = <string>callback_path;
        res.redirect(`${updateConfig.api.oauth.authUrl}?client_id=${updateConfig.api.oauth.clientId}&response_type=code&state=${state}&redirect_uri=${callback_url}`);
    };

    export const oauthCallback = async (req: Request, res: Response) => {
        if (req.headers.referer === undefined) {
            res.status(400).json({
                status: false,
                msg: `direct access to this interface is not allowed`
            } as Reply);
            return;
        }
        const {code, state} = req.query;
        if (state as string !== req.session.state) {
            res.status(500).json({
                status: false,
                msg: `OAuth state mismatch, you may have suffered a CSRF attack`
            } as Reply);
            return;
        }
        const tokenResponse = await axios.post(updateConfig.api.oauth.tokenUrl, {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: req.session.redirect_uri,
            client_id: updateConfig.api.oauth.clientId,
            client_secret: updateConfig.api.oauth.clientSecret
        });
        const token: OauthTokenData = tokenResponse.data;
        const response = await axios.get(updateConfig.api.baseUrl + "/api/user", {
            headers: {
                "Authorization": `Bearer ${token.access_token}`
            }
        });
        const data: UserApiData = response.data;
        const salt = generateKey();
        let account = await Account.findOne({
            where: {
                username: data.nickname,
            }
        });
        if (account === null) {
            account = await Account.create({
                username: data.nickname,
                password: encryptPassword("", salt),
                permission: data.permission,
                salt: salt
            });
        }
        res.redirect(`${req.headers.referer}${req.session.callback_path}?token=${generateJWTToken({
            username: account.username,
            permission: account.permission,
            type: "refresh"
        }, serverConfig.jwt.expiresIn, serverConfig.jwt.secretKey)}`);
    };
}