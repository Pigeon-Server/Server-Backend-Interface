import {Request, Response} from "express";

export namespace OAuthApiController {
    export const oauthCallback = (req: Request, res: Response) => {
        const {code} = req.query;
        
    }
}