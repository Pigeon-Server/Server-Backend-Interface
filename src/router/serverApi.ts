import express from "express";
import {ServerApiController} from "@/controller/serverApiController";
import {ServerApiMiddleware} from "@/middleware/serverApiMiddleWare";
import {AuthMiddleware} from "@/middleware/authMiddleWare";

export const serverApiRouter = express.Router();

serverApiRouter.use(ServerApiMiddleware.checkCallLimit);

serverApiRouter.use(AuthMiddleware.requestLogin);

serverApiRouter.use(AuthMiddleware.requestAdmin);

serverApiRouter.post("/status", ServerApiController.getServerStatusHandler);

serverApiRouter.use(AuthMiddleware.requestSuperAdmin);

serverApiRouter.put("/cache/clear", ServerApiController.clearCacheHandler);