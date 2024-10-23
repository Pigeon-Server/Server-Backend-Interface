/**********************************************
 * @file apiManager.ts
 * @desc 皮肤站api以及缓存实现
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.03
 * @license GNU General Public License (GPL)
 **********************************************/
import type {AxiosRequestConfig, AxiosStatic} from "axios";
import axios_ from "axios";
import type {Response} from "express";
import {logger} from "@/base/logger";
import {Config} from "@/base/config";
import {Utils} from "@/utils/utils";
import updateConfig = Config.updateConfig;
import getDate = Utils.getDate;

axios_.defaults.baseURL = "https://skin.pigeon-server.cn";

const accountCacheMap = new Map<string, { status: AccountStatus, uuid: string }>();
const requestConfig: AxiosRequestConfig = {
    headers: {
        "api-key": updateConfig.apikey.key
    }
};

enum AccountStatus {
    PASSED,
    NOT_EXIST,
    BANNED,
    UUID_FAIL
}

/**
 * @function
 * @name clearApiCache
 * @desc 清空api缓存
 * @version 1.0.3
 * @since 1.3.0
 * @export
 */

let nextClear = getDate(true, updateConfig.apikey.clearInterval, "milliseconds");
export const getNextClearTime = () => {
    return nextClear;
};
logger.debug("Time of next cache clearing: " + nextClear);

export function clearApiCache() {
    nextClear = getDate(true, updateConfig.apikey.clearInterval, "milliseconds");
    accountCacheMap.clear();
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
export const axios: AxiosStatic = axios_;

/**
 * @function
 * @desc 检查给定apikey是否合法
 * @param key {string} 要检查的apikey
 * @return {Promise<boolean>}
 * @return {true} 验证通过
 * @return {false} 验证失败
 * @export
 */
export async function checkApiKey(key: string): Promise<boolean> {
    logger.debug(`Checking api key: ${key}`);
    const response = await axios.get(`/api/ps-api/system/apiKeyStatus/${key}`);
    logger.debug(`Key status: ${response.data.status}`);
    return response.data.status === "1";
}

/**
 * @function
 * @desc 检查给定用户名和uuid的账户是否合法
 * @param username {string} 用户名
 * @param uuid {string} 用户UUID
 * @param res {Response} express res实例
 * @return {Promise<boolean>}
 * @return {true} 验证通过
 * @return {false} 验证失败
 * @export
 */
export async function getPlayerStatus(username: string, uuid: string, res: Response): Promise<boolean> {
    logger.debug(`Checking account: ${username}(${uuid})`);
    if (accountCacheMap.has(username)) {
        logger.debug(`Account cache hit: ${username}`);
        const account = accountCacheMap.get(username)!!;
        if (account.uuid === uuid) {
            switch (account.status) {
                case AccountStatus.PASSED:
                    logger.debug(`Verification passed: ${username}(${uuid})`);
                    return true;
                case AccountStatus.NOT_EXIST:
                    logger.debug(`${username} not found`);
                    res.status(435).json({
                        status: false,
                        msg: `账号${username}不存在`
                    } as Reply);
                    return false;
                case AccountStatus.BANNED:
                    logger.debug(`${username} has been banned`);
                    res.status(436).json({
                        status: false,
                        msg: `账号${username}已被封禁`
                    } as Reply);
                    return false;
                case AccountStatus.UUID_FAIL:
                    logger.debug(`UUID verification fails, ${account.uuid}`);
                    res.status(437).json({
                        status: false,
                        msg: `UUID验证失败`
                    } as Reply);
                    return false;
            }
        } else {
            logger.debug(`Account uuid cache not match. Cached ${account.uuid}, now get ${uuid}, delete account cache`);
            accountCacheMap.delete(username);
        }
    }
    const response = await axios.get(`/api/ps-api/player/status/${username}`, requestConfig);
    const {status, userstatus, playeruuid} = response.data;
    if (status !== "1") {
        logger.debug(`${username} not found`);
        res.status(435).json({
            status: false,
            msg: `账号${username}不存在`
        } as Reply);
        accountCacheMap.set(username, {
            status: AccountStatus.NOT_EXIST,
            uuid: playeruuid
        });
        return false;
    }
    if (userstatus === "0") {
        logger.debug(`${username} has been banned`);
        res.status(436).json({
            status: false,
            msg: `账号${username}已被封禁`
        } as Reply);
        accountCacheMap.set(username, {
            status: AccountStatus.BANNED,
            uuid: playeruuid
        });
        return false;
    }
    if (playeruuid !== uuid) {
        logger.debug(`UUID verification fails, expect: ${playeruuid}, got: ${uuid}`);
        res.status(437).json({
            status: false,
            msg: `UUID验证失败`
        } as Reply);
        accountCacheMap.set(username, {
            status: AccountStatus.UUID_FAIL,
            uuid: playeruuid
        });
        return false;
    }
    accountCacheMap.set(username, {
        status: AccountStatus.PASSED,
        uuid: playeruuid
    });
    logger.debug(`Verification passed: ${username}(${uuid})`);
    return true;
}
