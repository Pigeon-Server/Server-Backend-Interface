const path = require('path'); //路径转换
const fs = require('fs'); //文件
const cookieParser = require('cookie-parser'); //cookie
const session = require('express-session'); //session
const express = require('express'); //express
const expressWs = require('express-ws') // 引入 WebSocket 包
//自写模块
const config = require('./config.json'); //配置读取
const {logger, error} = require('./nodejs/logger.js'); //日志模块
const Utils = require('./nodejs/utils.js')

// 初始化express
const app = express();

// 配置cookie加密和session
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

// 注册路由
const api = require("./router/apiRouter");
app.use('/api', api);

//注册post参数解析
app.use(express.urlencoded({extended: false})); //form表单编码
app.use(express.json())

// 全局中间件-访问记录
app.use((req, res, next) => {
    Utils.enableHSTS(res); // 判断是否启用HSTS
    logger.debug(`[${req.protocol}] Client request for ${req.path} from ${req.ip}`);
    next();
})

//静态资源绑定
app.use(["/resource", "/api/resource"], express.static(path.join(__dirname, "/resource"), {
    dotfiles: 'ignore',
    etag: true,
    extensions: ['htm', 'html'],
    index: false,
    maxAge: '1d',
    redirect: true,
    setHeaders(res, path, stat) {
        res.set('x-timestamp', Date.now().toString())
    }
}));

// 全局中间件-错误
app.use((err, req, res, next) => {
    error.error(`Server Error ${err.path}`)
})

// 配置文件解析
const port = config.port;
if (config.https.enable) {
    if (fs.existsSync(path.join(__dirname, "/certificate/certificate.key")) && fs.existsSync(path.join(__dirname, "/certificate/certificate.crt"))) {
        const https = require('https')
            .createServer({
                key: fs.readFileSync(path.join(__dirname, "/certificate/certificate.key")),
                cert: fs.readFileSync(path.join(__dirname, "/certificate/certificate.crt"))
            }, app);
        const wsServer = expressWs(app, https); // 为app添加ws服务，并且使用https
        app.locals.wss = wsServer.getWss()
        https.listen(port);
        if (port !== 443) {
            logger.info(`Server running at https://0.0.0.0:${port}/`);
        } else {
            logger.info(`Server running at https://0.0.0.0/`);
        }
    } else {
        error.error("证书文件不存在！");
        process.exit();
    }
} else {
    const http = require('http').createServer(app);
    const wsServer = expressWs(app, http); // 为app添加ws服务，并且使用http
    app.locals.wss = wsServer.getWss()
    http.listen(port);
    if (port === 443) {
        error.error(`Can't use port 443 in http!`);
        process.exit();
    } else if (config.https.enableHSTS) {
        error.error(`If you want to enable HSTS, please enable HTTPS first`);
        process.exit()
    } else if (port !== 80) {
        logger.info(`Server running at http://0.0.0.0:${port}/`);
    } else {
        logger.info(`Server running at http://0.0.0.0/`);
    }
}