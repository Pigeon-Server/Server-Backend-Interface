/**********************************************
 * @file apiManager.ts
 * @desc 皮肤站api以及缓存实现
 * @author Half_nothing
 * @since 1.3.0
 * @date 2024.03.03
 **********************************************/
import temp from "axios";
import type {AxiosStatic, AxiosRequestConfig} from "axios";
import type {Response} from "express";
import {logger} from "@/base/logger";
import {Config} from "@/base/config";
import updateConfig = Config.updateConfig;
import {Utils} from "@/utils/utils";
import getTime = Utils.getTime;

temp.defaults.baseURL = "https://skin.pigeon-server.cn";

const userExist = new Map();
const uuidCache = new Map();
const requestConfig: AxiosRequestConfig = {
    headers: {
        "api-key": updateConfig.apikey.key
    }
};

/**
 * @function
 * @name clearApiCache
 * @desc 清空api缓存
 * @version 1.0.0
 * @since 1.3.0
 * @export
 */

let nextClear = getTime(true, updateConfig.apikey.clearInterval, "milliseconds");
export const getNextClearTime = () => {
    return nextClear;
};
logger.debug("Time of next cache clearing: " + nextClear);

export function clearApiCache() {
    nextClear = getTime(true, updateConfig.apikey.clearInterval, "milliseconds");
    userExist.clear();
    uuidCache.clear();
    logger.debug("Clear Api Cache.");
    logger.debug("Time of next cache clearing: " + nextClear);
}

setInterval(clearApiCache, updateConfig.apikey.clearInterval);

/**
 * @field
 * @name axios
 * @desc axios实例
 * @type {AxiosStatic}
 * @export
 */
export const axios: AxiosStatic = temp;

/**
 * @function
 * @name getPlayerStatus
 * @desc 检查给定用户名和uuid的账户是否合法
 * @param username {string} 用户名
 * @param uuid {string} 用户UUID
 * @param res {Response} express res实例
 * @return {Promise<boolean>}
 * @return {true} 验证通过
 * @return {false} 验证失败
 * @version 1.0.0
 * @since 1.3.0
 * @export
 */
export async function getPlayerStatus(username: string, uuid: string, res: Response): Promise<boolean> {
    if (userExist.has(username)) {
        switch (userExist.get(username)) {
            case 1:
                return true;
            case 2:
                res.status(435).json({status: false, msg: `账号${username}不存在`});
                return false;
            case 3:
                res.status(436).json({status: false, msg: `账号${username}已被封禁`});
                return false;
            case 4:
                if (uuidCache.has(username) && uuidCache.get(username) === uuid) {
                    res.status(437).json({status: false, msg: `UUID验证失败`});
                    return false;
                }
        }
    }
    const response = await axios.get(`/api/ps-api/player/status/${username}`, requestConfig);
    const {status, userstatus, playeruuid} = response.data;
    uuidCache.set(username, uuid);
    if (status !== "1") {
        res.status(435).json({status: false, msg: `账号${username}不存在`});
        userExist.set(username, 2);
        return false;
    }
    if (userstatus === "0") {
        res.status(436).json({status: false, msg: `账号${username}已被封禁`});
        userExist.set(username, 3);
        return false;
    }
    if (playeruuid !== uuid) {
        res.status(437).json({status: false, msg: `UUID验证失败`});
        userExist.set(username, 4);
        return false;
    }
    userExist.set(username, 1);
    return true;
}
