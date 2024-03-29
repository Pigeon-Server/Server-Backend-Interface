import path from "path";
import alias from "module-alias";

alias(path.resolve(__dirname, "../"));

import {connectionLogger, logger} from "@/base/logger";
import {SyncFileManager} from "@/manager/syncFileManager";
import {Database} from "@/base/mysql";
import express from "express";
import {NextFunction, Response, Request} from "express";
import process from "node:process";
import fs from "fs";
import https from "https";
import http from "http";
import {Config} from "@/base/config";
import {Utils} from "@/utils/utils";
import {apiRouter} from "@/router/api";
import {FileUtils} from "@/utils/fileUtils";
import {initCatcher} from "@/base/catcher";

import serverConfig = Config.serverConfig;
import enableHSTS = Utils.enableHSTS;
import checkFileExist = FileUtils.checkFileExist;

initCatcher();
SyncFileManager.checkSyncCache();
Database.INSTANCE;

const app = express();

app.set('trust proxy', true);
app.use(connectionLogger);

app.use((req: Request, res: Response, next: NextFunction) => {
    enableHSTS(res);
    logger.info(`[${req.protocol}] Client request ${req.path} from ${req.ip}`);
    next();
});

app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.use("/api", apiRouter);

app.use('*', (_: Request, res: Response) => {
    logger.info(`Not router match, redirect to home page ${serverConfig.homePage}`);
    res.redirect(serverConfig.homePage);
});

app.use((err: Error, _: Request, res: Response, __: NextFunction) => {
    logger.error(`Server Error! ${err.message}`);
    res.status(500);
    res.send("Server Error!")
});

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
    http.createServer(app).listen(port);
    if (serverConfig.https.enableHSTS) {
        logger.error(`If you want to enable HSTS, please enable HTTPS first`);
        process.exit(-1)
    }
    logger.info(`Server running at http://0.0.0.0${port === 80 ? "" : ":" + port}/`);
}
