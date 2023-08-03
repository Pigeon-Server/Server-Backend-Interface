const mysql = require('mysql2');
const config = require('../config.json');
const {database} = require('./logger.js');
let databasePool = null;

function connectDatabase() {
    databasePool = mysql.createPool(({
        ...config.database,
        waitForConnections: true,
        multipleStatements: false,
        queueLimit: 0
    }))
    databasePool.on("error", err => {
        database.error(`Disconnect from the database ${config.database.host}.`)
        setTimeout(connectDatabase, 2000);
    })
}

module.exports.connectDatabase = connectDatabase
module.exports.runSqlCommand = (cmd) => {
    return new Promise((resolve, reject) => {
        databasePool.query(cmd, (err, result) => err ? reject(err) : resolve(result))
    })
}