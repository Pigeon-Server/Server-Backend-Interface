import express from "express";
import {ServerApiController} from "@/controller/serverApiController";
import {ServerApiMiddleware} from "@/middleware/serverApiMiddleWare";
import {AuthMiddleware} from "@/middleware/authMiddleWare";

export const serverApiRouter = express.Router();

serverApiRouter.use(ServerApiMiddleware.checkCallLimit);

serverApiRouter.use(AuthMiddleware.verifyJWTToken);

serverApiRouter.get("/status", ServerApiController.getServerStatusHandler);

serverApiRouter.put("/cache/clear", ServerApiController.clearCacheHandler);