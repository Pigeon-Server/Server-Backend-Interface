import path from "path";
import alias from "module-alias";
alias(path.resolve(__dirname, "../"));

import {connectionLogger, logger} from "@/base/logger";
import {SyncFileManager} from "@/manager/syncFileManager";
import express, {Request, Response} from "express";
import cors from 'cors';
import process from "node:process";
import fs from "fs";
import https from "https";
import http from "http";
import {Config} from "@/base/config";
import {launcherApiRouter} from "@/router/launcherApi";
import {FileUtils} from "@/utils/fileUtils";
import {initCatcher} from "@/base/catcher";
import {Database} from "@/database/database";
import {CommonMiddleWare} from "@/middleware/commonMiddleWare";
import {frontendApiRouter} from "@/router/frontendApi";
import {oauthApiRouter} from "@/router/oauthApi";
import {authApiRouter} from "@/router/authApi";
import {serverApiRouter} from "@/router/serverApi";

import initDatabase = Database.initDatabase;
import serverConfig = Config.serverConfig;
import checkFileExist = FileUtils.checkFileExist;

initCatcher();
initDatabase(SyncFileManager.checkSyncCache);

const app = express();

app.set('trust proxy', true);
app.use(connectionLogger);

app.use(CommonMiddleWare.accessRecord);

app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.use(cors());

app.use("/api/launcher", launcherApiRouter);
app.use("/api/server", serverApiRouter);
app.use("/api/ui", frontendApiRouter);
app.use("/api/auth", authApiRouter);
app.use("/api/oauth", oauthApiRouter);

app.use('*', (_: Request, res: Response) => {
    logger.info(`Not router match, redirect to home page ${serverConfig.homePage}`);
    res.redirect(serverConfig.homePage);
});

app.use(CommonMiddleWare.errorHandler);

const port = serverConfig.port;

if (serverConfig.https.enable) {
    if (!checkFileExist(serverConfig.https.keyPath)) {
        logger.error("Can not find certificate key.");
        process.exit(-1);
    }
    if (!checkFileExist(serverConfig.https.crtPath)) {
        logger.error("Can not find certificate crt.");
        process.exit(-1);
    }
    https.createServer({
        key: fs.readFileSync(serverConfig.https.keyPath),
        cert: fs.readFileSync(serverConfig.https.crtPath)
    }, app).listen(port);
    logger.info(`Server running at https://0.0.0.0${port === 443 ? "" : ":" + port}/`);
} else {
    if (serverConfig.https.enableHSTS) {
        logger.error(`If you want to enable HSTS, please enable HTTPS first`);
        process.exit(-1)
    }
    http.createServer(app).listen(port);
    logger.info(`Server running at http://0.0.0.0${port === 80 ? "" : ":" + port}/`);
}
