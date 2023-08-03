const log = require("log4js");
const config = require('../config.json');
log.configure(
    {
        appenders: {
            console: {type: 'console'},
            fileAccess: {
                type: 'file',
                filename: 'log/access.log',
                maxLogSize: config.logSize,
                backups: config.backupNumber,
                compress: config.enableCompress,
                keepFileExt: true
            },
            fileApi: {
                type: 'file',
                filename: 'log/api.log',
                maxLogSize: config.logSize,
                backups: config.backupNumber,
                compress: config.enableCompress,
                keepFileExt: true
            },
            fileError: {
                type: 'file',
                filename: 'log/error.log',
                maxLogSize: config.logSize,
                backups: config.backupNumber,
                compress: config.enableCompress,
                keepFileExt: true
            },
            fileMessage: {
                type: 'file',
                filename: 'log/message.log',
                maxLogSize: config.logSize,
                backups: config.backupNumber,
                compress: config.enableCompress,
                keepFileExt: true
            },
            fileDatabase: {
                type: 'file',
                filename: 'log/database.log',
                maxLogSize: config.logSize,
                backups: config.backupNumber,
                compress: config.enableCompress,
                keepFileExt: true
            }
        },
        categories: {
            default: {
                appenders: [
                    'console'
                ],
                level:'debug'},
            access: {
                appenders: [
                    'console',
                    'fileAccess'
                ],
                level: 'debug'
            },
            apiCall: {
                appenders: [
                    'console',
                    'fileApi'
                ],
                level:'debug'
            },
            error: {
                appenders: [
                    'console',
                    'fileError'
                ],
                level:'debug'
            },
            message: {
                appenders: [
                    'console',
                    'fileMessage'
                ],
                level:'debug'
            },
            database: {
                appenders: [
                    'console',
                    'fileDatabase'
                ],
                level:'debug'
            }
        }
    }
)

module.exports.logger = log.getLogger('access');
module.exports.api = log.getLogger('apiCall');
module.exports.error = log.getLogger('error');
module.exports.message = log.getLogger('message');
module.exports.database = log.getLogger('database');

