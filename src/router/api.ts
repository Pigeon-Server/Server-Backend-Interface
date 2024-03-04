import express from "express";
import {apiHandler} from "@/handler/apiHandler";

export const apiRouter = express.Router();

apiRouter.get("/test", apiHandler);
