import express from "express";
import {FrontendApiMiddleWare} from "@/middleware/frontendApiMiddleWare";
import {FrontendApiController} from "@/controller/frontendApiController";
import {AuthMiddleware} from "@/middleware/authMiddleWare";
import multer from "multer";
import {Config} from "@/base/config";
import serverConfig = Config.serverConfig;

const upload = multer({dest: serverConfig.uploadPath});

export const frontendApiRouter = express.Router();

frontendApiRouter.use(FrontendApiMiddleWare.checkCallLimit);

frontendApiRouter.use(AuthMiddleware.requestLogin);

frontendApiRouter.use(AuthMiddleware.requestAdmin);

frontendApiRouter.post("/rules/reload", FrontendApiController.reloadRules);

frontendApiRouter.post("/rules/get-list", FrontendApiController.getRuleList);
frontendApiRouter.post("/rules/create", FrontendApiController.addRule);

frontendApiRouter.put("/rules/restore/:id", FrontendApiController.restoreRule);
frontendApiRouter.delete("/rules/real/:id", FrontendApiController.realDeleteRule);
frontendApiRouter.delete("/rules/:id", FrontendApiController.deleteRule);
frontendApiRouter.get("/rules/:id", FrontendApiController.getRule);

frontendApiRouter.put("/rules/enable/:id", FrontendApiController.enableRule);
frontendApiRouter.put("/rules/disable/:id", FrontendApiController.disableRule);
frontendApiRouter.put("/rules/:id", FrontendApiController.updateRule);

frontendApiRouter.post("/compression", FrontendApiController.compression);
frontendApiRouter.post("/decompression", FrontendApiController.decompression);

frontendApiRouter.post("/folders/rename", FrontendApiController.renameFolders);
frontendApiRouter.post("/folders/move", FrontendApiController.renameFolders);
frontendApiRouter.post("/folders/copy", FrontendApiController.copyFolders);
frontendApiRouter.post("/folder/rename", FrontendApiController.renameFolder);
frontendApiRouter.post("/folder/move", FrontendApiController.renameFolder);
frontendApiRouter.post("/folder/copy", FrontendApiController.copyFolder);
frontendApiRouter.delete("/folder", FrontendApiController.deleteFolders);
frontendApiRouter.get("/folder", FrontendApiController.getAllFile);
frontendApiRouter.get("/folder/:path", FrontendApiController.getFileList);
frontendApiRouter.post("/folder/:path", FrontendApiController.createFolder);
frontendApiRouter.delete("/folder/:path", FrontendApiController.deleteFolder);

frontendApiRouter.post("/files/rename", FrontendApiController.renameFiles);
frontendApiRouter.post("/files/move", FrontendApiController.renameFiles);
frontendApiRouter.post("/files/copy", FrontendApiController.copyFiles);
frontendApiRouter.post("/file/rename", FrontendApiController.renameFile);
frontendApiRouter.post("/file/move", FrontendApiController.renameFile);
frontendApiRouter.post("/file/copy", FrontendApiController.copyFile);
frontendApiRouter.get("/file/download/:path", FrontendApiController.downloadFile);
frontendApiRouter.delete("/file", FrontendApiController.deleteFiles);
frontendApiRouter.get("/file/:path", FrontendApiController.getFileContent);
frontendApiRouter.put("/file/:path", FrontendApiController.updateFileContent);
frontendApiRouter.post("/file/:path", FrontendApiController.createFile);
frontendApiRouter.delete("/file/:path", FrontendApiController.deleteFile);

frontendApiRouter.use(AuthMiddleware.requestSuperAdmin);

frontendApiRouter.post("/upload", upload.single('file'), FrontendApiController.uploadFile);
frontendApiRouter.post("/merge", FrontendApiController.mergeFile);


