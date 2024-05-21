import express from "express";
import {FrontendApiMiddleWare} from "@/middleware/frontendApiMiddleWare";
import {FrontendApiController} from "@/controller/frontendApiController";

export const frontendApiRouter = express.Router();

frontendApiRouter.use(FrontendApiMiddleWare.checkCallLimit);

frontendApiRouter.get("/rules/get-all", FrontendApiController.getAllRule);

frontendApiRouter.post("/rules/get-list", FrontendApiController.getRuleList);
frontendApiRouter.post("/rules/create", FrontendApiController.addRule);

frontendApiRouter.delete("/rules/:id", FrontendApiController.deleteRule);
frontendApiRouter.get("/rules/:id", FrontendApiController.getRule);

frontendApiRouter.put("/rules/enable/:id", FrontendApiController.enableRule);
frontendApiRouter.put("/rules/disable/:id", FrontendApiController.disableRule);
frontendApiRouter.put("/rules/:id", FrontendApiController.updateRule);