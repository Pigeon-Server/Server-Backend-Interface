import express from "express";
import {ApiHandler} from "@/handler/apiHandler";

export const apiRouter = express.Router();

apiRouter.use(ApiHandler.limitHandler);

apiRouter.get("/server-status", ApiHandler.getServerStatusHandler);
apiRouter.post("/clear-api-cache", ApiHandler.clearApiCacheHandler);
apiRouter.get("/get_jar", ApiHandler.getJarHandler);
apiRouter.get("/update_link", ApiHandler.updateLinkHandler);

apiRouter.use(ApiHandler.verifyHandler);

apiRouter.get("/get-access-key", ApiHandler.getAccessKeyHandler);

apiRouter.use(ApiHandler.packageConfigHandler);

apiRouter.get("/check-update", ApiHandler.checkUpdateHandler);
apiRouter.get("/get-source/:path(*)", ApiHandler.getSourceHandler);
