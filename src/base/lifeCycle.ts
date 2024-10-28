import process from "node:process";
import {logger} from "@/base/logger";
import log4js from "log4js";

export enum ServerLifeCycleEvent {
    ServerDatabaseInit,
    ServerExit,
    ServerExitNormal,
    ServerExitAbnormal
}

export class ServerLifeCycle {
    private static _lifeCycleEventHandler: Map<ServerLifeCycleEvent, Callback[]> = new Map();

    static addEventHandler(serverLifeCycleEvent: ServerLifeCycleEvent, handler: Callback) {
        if (this._lifeCycleEventHandler.has(serverLifeCycleEvent)) {
            this._lifeCycleEventHandler.get(serverLifeCycleEvent)?.push(handler);
        } else {
            this._lifeCycleEventHandler.set(serverLifeCycleEvent, [handler]);
        }
    }

    static emitEvent(serverLifeCycleEvent: ServerLifeCycleEvent) {
        if (this._lifeCycleEventHandler.has(serverLifeCycleEvent)) {
            this._lifeCycleEventHandler.get(serverLifeCycleEvent)!!.forEach(handler => handler());
        }
    }

    static {
        process.on('exit', (code) => {
            this.emitEvent(ServerLifeCycleEvent.ServerExit);
            if (code === 0) {
                this.emitEvent(ServerLifeCycleEvent.ServerExitNormal);
                logger.info(`About to exit with code: ${code}`);
            } else {
                this.emitEvent(ServerLifeCycleEvent.ServerExitAbnormal);
                logger.error(`About to exit with code: ${code}`);
            }
            log4js.shutdown();
        });

        process.on('SIGINT', () => {
            process.exit(-1);
        });
    }
}