import log4js from "log4js";
import {enableHSTS} from './nodejs/utils.mjs';
import {connectDatabase, databaseInit} from './nodejs/mysql.mjs';
import process from 'node:process';
import {connectionLogger, database, error, logger} from './nodejs/logger.mjs';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import express from 'express';
import expressWs from 'express-ws';
import https from 'https';
import http from 'http';
import {config, savePackageConfig} from "./nodejs/config.mjs";
import {router as api} from "./router/apiRouter.mjs";
import {logoutALL} from "./nodejs/apiManager.mjs";
// 初始化express
const app = express();

connectDatabase();
databaseInit().catch(err => {
    if (err) {
        database.error("Database Init Error!");
        error.error(err.message);
        process.exit(-1);
    }
});

process.on('exit', (code) => {
    if (code === 0) {
        logger.info(`About to exit with code: ${code}`);
    } else {
        logger.error(`About to exit with code: ${code}`);
    }
    savePackageConfig();
    log4js.shutdown();
});

process.on('SIGINT', async () => {
    await logoutALL();
    process.exit(-1);
});

process.on('uncaughtException', (err) => {
    error.error(err.message);
});

process.on('unhandledRejection', (err, _) => {
    error.error(err.message);
});

app.use(connectionLogger);
app.use((req, res, next) => {
    enableHSTS(res);
    logger.info(`[${req.protocol}] Client request for ${req.path} from ${req.ip}`);
    next();
});

app.use(cookieParser(config.cookie.key));
app.use(session({
    secret: config.cookie.key,
    resave: false,
    saveUninitialized: true,
    name: "UUID",
    cookie: {
        maxAge: config.cookie.timeout
    },
    rolling: true,
}));

app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.use('/api', api);

app.use(["/resource", "/api/resource"], express.static("/resource", {
    dotfiles: 'ignore',
    etag: true,
    extensions: ['htm', 'html'],
    index: false,
    maxAge: '1d',
    redirect: true,
    setHeaders(res, _, __) {
        res.set('x-timestamp', Date.now().toString())
    }
}));

app.use((err, req, res, _) => {
    error.error(`Server Error! ${err.message}`);
    res.status(500);
    res.send("Server Error!")
});

// 配置文件解析
const port = config.port;

if (config.https.enable) {
    if (fs.existsSync("certificate/certificate.key") && fs.existsSync("certificate/certificate.crt")) {
        const httpsServer = https.createServer({
            key: fs.readFileSync("certificate/certificate.key"),
            cert: fs.readFileSync("certificate/certificate.crt")
        }, app);
        const wsServer = expressWs(app, httpsServer); // 为app添加ws服务，并且使用https
        app.locals.wss = wsServer.getWss();
        httpsServer.listen(port);
        if (port === 443) {
            logger.info(`Server running at https://0.0.0.0/`);
        } else {
            logger.info(`Server running at https://0.0.0.0:${port}/`);
        }
    } else {
        error.error("证书文件不存在！");
        process.exit(-1);
    }
} else {
    const httpServer = http.createServer(app);
    const wsServer = expressWs(app, httpServer); // 为app添加ws服务，并且使用http
    app.locals.wss = wsServer.getWss();
    httpServer.listen(port);
    if (port === 443) {
        error.error(`Can't use port 443 in http!`);
        process.exit(-1);
    }
    if (config.https.enableHSTS) {
        error.error(`If you want to enable HSTS, please enable HTTPS first`);
        process.exit(-1)
    }
    if (port === 80) {
        logger.info(`Server running at http://0.0.0.0/`);
    } else {
        logger.info(`Server running at http://0.0.0.0:${port}/`);
    }
}