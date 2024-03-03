import log4js from "log4js";

const optional = {
    maxLogSize: "10M",
    backups: 10,
    compress: true,
    alwaysIncludePattern: true
};

log4js.configure(
    {
        appenders: {
            console: {
                type: "console",
                layout: {
                    type: "pattern",
                    pattern: "%[[%d] [%p] [%c|%z] [%f{1}|%l:%o] -%] %m"
                }
            },
            access: {
                type: "dateFile",
                filename: "logs/access",
                pattern: "yyyy-MM-dd.log",
                ...optional,
                layout: {
                    type: "pattern",
                    pattern: "[%d] [%p] %m"
                }
            },
            logger: {
                type: "dateFile",
                filename: "logs/log",
                pattern: "yyyy-MM-dd.log",
                ...optional,
                layout: {
                    type: "pattern",
                    pattern: "[%d] [%p] [%c|%z] [%f{1}|%l:%o] - %m"
                }
            }
        },
        categories: {
            default: {
                appenders: ['console'],
                enableCallStack: true,
                level: 'debug'
            },
            connection: {
                appenders: ['access'],
                enableCallStack: true,
                level: 'debug'
            },
            logger: {
                appenders: ['console', 'logger'],
                enableCallStack: true,
                level: 'debug'
            }
        }
    }
);

export const logger = log4js.getLogger('logger');
export const connectionLogger = log4js.connectLogger(log4js.getLogger('connection'),
    {
        level: 'auto',
        statusRules: [
            {from: 200, to: 299, level: "debug"},
            {from: 300, to: 399, level: "info"},
            {from: 400, to: 499, level: "warn"},
            {from: 500, to: 599, level: "error"}
        ]
    });
