import axios from "axios";
import {Config} from "../config";
import {logger} from "../logger";
import {FileUtils} from "./fileUtils";
import {Response} from "express";
import checkDirExist = FileUtils.checkDirExist;
// import syncConfig = Config.syncConfig;

// if (syncConfig.useProxy) {
//     if (!syncConfig.proxyUrl.endsWith('/'))
//         syncConfig.proxyUrl += '/'
//     if (!syncConfig.repoUrl.endsWith('/'))
//         syncConfig.repoUrl += '/'
//     axios.defaults.baseURL = syncConfig.proxyUrl + syncConfig.repoUrl;
// }
// checkDirExist("cache", true);

// export namespace NetUtils {
//     import checkFileExist = FileUtils.checkFileExist;
//     import serverConfig = Config.serverConfig;
//
//     export function getModelData() {
//         axios.request({
//             method: "GET",
//             url: syncConfig.modelsDataPath
//         }).then((response) => {
//             checkFileExist("cache/temp_model_data.json", true, JSON.stringify(response.data, null, 2));
//         }).catch((err) => {
//             logger.error(err);
//         });
//     }
//
//     export function enableHSTS(res: Response) {
//         if (!serverConfig.https.enable || !serverConfig.https.enableHSTS) {
//             return
//         }
//         res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
//     }
// }