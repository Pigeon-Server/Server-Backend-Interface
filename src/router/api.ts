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
import {ApiHandler} from "@/handler/apiHandler";

export const apiRouter = express.Router();

apiRouter.use(ApiHandler.limitHandler);

apiRouter.get("/get-access-key", ApiHandler.interfaceDeprecatedHandler);
apiRouter.get("/check-update", ApiHandler.interfaceDeprecatedHandler);

apiRouter.get("/server-status", ApiHandler.getServerStatusHandler);
apiRouter.post("/clear-api-cache", ApiHandler.clearApiCacheHandler);
apiRouter.get("/get_jar", ApiHandler.getJarHandler);
apiRouter.get("/update_link", ApiHandler.updateLinkHandler);

apiRouter.use(ApiHandler.verifyHandler);

apiRouter.post("/get-access-key", ApiHandler.getAccessKeyHandler);

apiRouter.use(ApiHandler.packageConfigHandler);

apiRouter.post("/check-update", ApiHandler.checkUpdateHandler);
apiRouter.get("/get-source/:path(*)", ApiHandler.getSourceHandler);
