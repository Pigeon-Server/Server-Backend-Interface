import express from "express";
import {WorkerMiddleWare} from "@/middleware/workerMiddleWare";
import {WorkerApiController} from "@/controller/workerApiController";

export const workerApiRouter = express.Router();

workerApiRouter.use(WorkerMiddleWare.checkCallLimit);

workerApiRouter.get("/check", WorkerApiController.checkWorker);