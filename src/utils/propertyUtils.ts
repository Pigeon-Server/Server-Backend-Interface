import os from "node:os";
import {round} from "lodash";

export namespace PropertyUtils {

    export const instanceCpuTick = () => {
        const cpus = os.cpus();
        let realTick = 0;
        let idleTick = 0;

        for (const cpu of cpus) {
            realTick += cpu.times.irq + cpu.times.idle + cpu.times.sys + cpu.times.user;
            idleTick += cpu.times.idle;
        }
        return {realTick, idleTick};
    };

    export const instanceCpuUsage = () => {
        const startQuantize = instanceCpuTick();
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const endQuantize = instanceCpuTick();
                const realTick = endQuantize.realTick - startQuantize.realTick;
                const idleTick = endQuantize.idleTick - startQuantize.idleTick;
                resolve(round((realTick - idleTick) / realTick * 100, 2));
            }, 100);
        });
    };

    export const instanceMemoryUsage = () => {
        const totalmem = os.totalmem();
        const freemem = os.freemem();
        const usage = round((totalmem - freemem) / totalmem * 100, 2);
        return {totalmem, freemem, usage};
    }
}