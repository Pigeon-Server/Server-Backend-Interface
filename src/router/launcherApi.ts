/**********************************************
 * @file launcherApi.ts
 * @brief api接口路由
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.03
 * @license GNU General Public License (GPL)
 **********************************************/
import express from "express";
import {LauncherApiController} from "@/controller/launcherApiController";
import {LauncherApiMiddleWare} from "@/middleware/launcherApiMiddleWare";

export const launcherApiRouter = express.Router();

launcherApiRouter.use(LauncherApiMiddleWare.checkCallLimit);

launcherApiRouter.get("/get-access-key", LauncherApiController.interfaceDeprecatedHandler);
launcherApiRouter.get("/check-update", LauncherApiController.interfaceDeprecatedHandler);

launcherApiRouter.get("/get_jar", LauncherApiController.getJarHandler);
launcherApiRouter.get("/update_link", LauncherApiController.updateLinkHandler);

launcherApiRouter.use(LauncherApiMiddleWare.verifyArgs);

launcherApiRouter.post("/get-access-key", LauncherApiController.getAccessKeyHandler);

launcherApiRouter.use(LauncherApiMiddleWare.verifyPackageConfig);

launcherApiRouter.post("/check-update", LauncherApiController.checkUpdateHandler);
launcherApiRouter.get("/get-source/:path(*)", LauncherApiController.getSourceHandler);
