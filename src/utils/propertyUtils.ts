import os from "node:os";
import {round} from "lodash";
import {getDiskInfo} from "node-disk-info";
import {Utils} from "@/utils/utils";

export namespace PropertyUtils {

    import sleep = Utils.sleep;
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

    export const instanceCpuUsage = async (): Promise<number> => {
        const startQuantize = instanceCpuTick();
        await sleep(100);
        const endQuantize = instanceCpuTick();
        const realTick = endQuantize.realTick - startQuantize.realTick;
        const idleTick = endQuantize.idleTick - startQuantize.idleTick;
        return round((realTick - idleTick) / realTick * 100, 2);
    };

    export const instanceMemoryUsage = () => {
        const totalmem = os.totalmem();
        const freemem = os.freemem();
        const usage = round((totalmem - freemem) / totalmem * 100, 2);
        return {totalmem, freemem, usage};
    };

    export const instanceDiskUsage = async () => {
        const disks = await getDiskInfo();
        let totalSpace = 0;
        let usageSpace = 0;
        disks.forEach((disk) => {
            totalSpace += disk.available + disk.used;
            usageSpace += disk.used;
        });
        const usage = round(usageSpace / totalSpace * 100, 2);
        return {totalSpace, usageSpace, usage};
    };
}