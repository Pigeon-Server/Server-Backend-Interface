/**********************************************
 * @file api.ts
 * @brief api接口路由
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.03
 * @license GNU General Public License (GPL)
 **********************************************/
import express from "express";
import {ApiController} from "@/controller/apiController";
import {ApiMiddleWare} from "@/middleware/apiMiddleWare";

export const apiRouter = express.Router();

apiRouter.use(ApiMiddleWare.checkCallLimit);

apiRouter.get("/get-access-key", ApiController.interfaceDeprecatedHandler);
apiRouter.get("/check-update", ApiController.interfaceDeprecatedHandler);

apiRouter.get("/server-status", ApiController.getServerStatusHandler);
apiRouter.post("/clear-api-cache", ApiController.clearApiCacheHandler);
apiRouter.get("/get_jar", ApiController.getJarHandler);
apiRouter.get("/update_link", ApiController.updateLinkHandler);

apiRouter.use(ApiMiddleWare.verifyArgs);

apiRouter.post("/get-access-key", ApiController.getAccessKeyHandler);

apiRouter.use(ApiMiddleWare.verifyPackageConfig);

apiRouter.post("/check-update", ApiController.checkUpdateHandler);
apiRouter.get("/get-source/:path(*)", ApiController.getSourceHandler);
