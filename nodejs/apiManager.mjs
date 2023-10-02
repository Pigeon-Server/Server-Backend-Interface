/**
 * @file API相关验证,以及缓存管理
 * @module apiManager
 * @author Half_nothing
 * @version 0.2.4
 * @since 0.2.0
 */
import temp from "axios";
import {logger} from "./logger.mjs";
import {config} from "./config.mjs";

temp.defaults.baseURL = "https://skin.pigeon-server.cn";

const userExist = new Map();
const uuidCache = new Map();

setInterval(() => {
    userExist.clear();
    uuidCache.clear();
    logger.debug("Clear Api Cache.");
}, 3600000);

/**
 * @field
 * @name axios
 * @description axios实例
 * @type {AxiosStatic | axios.AxiosStatic | axios}
 * @export
 */
export const axios = temp;

/**
 * @function
 * @name getPlayerStatus
 * @description 检查给定用户名和uuid的账户是否合法
 * @param username {string} 用户名
 * @param uuid {string} 用户UUID
 * @param res {Response} express res实例
 * @returns {Promise<boolean>}
 * @author Half_nothing
 * @version 0.2.4
 * @since 0.2.0
 * @export
 */
export async function getPlayerStatus(username, uuid, res) {
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
    const response = await axios.get(`/api/ps-api/player/status/${username}`, {
        headers: {
            "api-key": config.apikey.key
        }
    });
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