import express from "express";
import {OAuthApiController} from "@/controller/oauthApiController";
import {OAuthMiddleware} from "@/middleware/oauthMiddleWare";


export const oauthApiRouter = express.Router();

oauthApiRouter.use(OAuthMiddleware.checkCallLimit);

oauthApiRouter.get("/login", OAuthApiController.oauthLogin);
oauthApiRouter.get("/callback", OAuthApiController.oauthCallback);