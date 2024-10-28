import express from "express";
import {FrontendApiMiddleWare} from "@/middleware/frontendApiMiddleWare";
import {FrontendApiController} from "@/controller/frontendApiController";
import {AuthMiddleware} from "@/middleware/authMiddleWare";

export const frontendApiRouter = express.Router();

frontendApiRouter.use(FrontendApiMiddleWare.checkCallLimit);

frontendApiRouter.use(AuthMiddleware.verifyJWTToken);

frontendApiRouter.use(AuthMiddleware.requestAdmin);

frontendApiRouter.get("/rules/reload", FrontendApiController.reloadRules);

frontendApiRouter.post("/rules/get-list", FrontendApiController.getRuleList);
frontendApiRouter.post("/rules/create", FrontendApiController.addRule);

frontendApiRouter.delete("/rules/:id", FrontendApiController.deleteRule);
frontendApiRouter.get("/rules/:id", FrontendApiController.getRule);

frontendApiRouter.put("/rules/enable/:id", FrontendApiController.enableRule);
frontendApiRouter.put("/rules/disable/:id", FrontendApiController.disableRule);
frontendApiRouter.put("/rules/:id", FrontendApiController.updateRule);

frontendApiRouter.post("/folder/rename", FrontendApiController.renameFolder);
frontendApiRouter.post("/folder/move", FrontendApiController.renameFolder);
frontendApiRouter.post("/folder/copy", FrontendApiController.copyFolder);
frontendApiRouter.get("/folder/:path", FrontendApiController.getFileList);
frontendApiRouter.post("/folder/:path", FrontendApiController.createFolder);
frontendApiRouter.delete("/folder/:path", FrontendApiController.deleteFolder);

frontendApiRouter.post("/file/rename", FrontendApiController.renameFile);
frontendApiRouter.post("/file/move", FrontendApiController.renameFile);
frontendApiRouter.post("/file/copy", FrontendApiController.copyFile);
frontendApiRouter.get("/file/:path", FrontendApiController.getFileContent);
frontendApiRouter.put("/file/:path", FrontendApiController.updateFileContent);
frontendApiRouter.post("/file/:path", FrontendApiController.createFile);
frontendApiRouter.delete("/file/:path", FrontendApiController.deleteFile);


