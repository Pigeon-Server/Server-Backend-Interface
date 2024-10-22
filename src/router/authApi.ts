import express from "express";
import {AuthApiController} from "@/controller/authApiController";
import {AuthMiddleware} from "@/middleware/authMiddleWare";

export const authApiRouter = express.Router();

authApiRouter.use(AuthMiddleware.checkCallLimit);

authApiRouter.post("/login", AuthApiController.userLogin);

authApiRouter.use(AuthMiddleware.verifyJWTToken);

authApiRouter.get("/token/info", AuthApiController.getTokenInfo);
authApiRouter.get("/token/flush", AuthApiController.flushToken);

authApiRouter.post("/account/create", AuthApiController.createAccount);
authApiRouter.delete("/account/:username", AuthApiController.deleteAccount);

authApiRouter.get("/permission/:username", AuthApiController.getPermission);
