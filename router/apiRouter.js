const express = require("express");
const router = express.Router();
// 为子路由添加ws方法
const expressWS = require('express-ws');
const {logger, message, error} = require("../nodejs/logger");
expressWS(router);

//api定义
router.ws('/server-message', (ws, req) => {
    logger.info(`New Client Connection:[${req.socket.remoteAddress}]:${req.socket.remotePort}`)
    ws.on('message', data => {
        if (data === 'Ping'){
            ws.send('Pong');
            return;
        }
        let info = null
        try {
            info = JSON.parse(data)
        } catch (SyntaxError) {
            error.error("Receive Illegal Data")
            ws.send("Data Format Error")
            ws.close(1000)
        }
        if (info == null) {
            return
        }
        message.info('Receive Message:', data)
        req.app.locals.wss.clients.forEach(client => {
            if (client !== ws) {
                client.send(data)
            }
        })
    })
    ws.on('close', (code) => {
        logger.info("Client Disconnect, Code:", code)
    })
})

router.get("/check-update", (req, res) => {

})


// 导出子路由变量
module.exports = router;