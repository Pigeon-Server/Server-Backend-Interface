import temp from "axios";
import {error, logger} from "./logger.mjs";
import {config} from "./config.mjs";

temp.defaults.baseURL = "https://skin.pigeon-server.cn";

const userCache = new Map();
const adminCache = new Map();
const userExist = new Map();
setInterval(() => {
    logoutALL().then(() => userCache.clear());
    adminCache.clear();
    userExist.clear();
    logger.debug("Clear Api Cache.");
}, 3600000);

export const axios = temp;

export async function logout(username, accessToken) {
    const response = await axios.post("/api/yggdrasil/authserver/invalidate", {
        accessToken
    }).catch(err => error.error(err.message));
    if (response.status === 204) {
        logger.info(`Log out from ${username} successfully.`);
    }
}

export async function logoutALL() {
    for (const [key, value] of userCache) {
        await logout(key, value);
    }
}

export async function checkAdmin(username) {
    if (adminCache.has(username)) {
        return adminCache.get(username);
    }
    let response = await axios.get(`/api/ps-api/user/playerGetUid/${username}`, {
        headers: {
            "api-key": config.apikey.key
        }
    });
    if (response.data.status === "0") {
        adminCache.set(username, false);
        return false;
    }
    response = await axios.get(`/api/ps-api/user/isAdmin/${response.data.UID}`, {
        headers: {
            "api-key": config.apikey.key
        }
    });
    adminCache.set(username, response.data.status === "1" && response.data.isAdmin);
    return adminCache.get(username);
}

export async function checkUser(username, clientToken) {
    if (userCache.has(username)) {
        const accessToken = userCache.get(username);
        if (accessToken === null) {
            return false;
        }
        const response = await axios.post("/api/yggdrasil/authserver/validate", {
            accessToken,
            clientToken
        }).catch(err => {
            error.error(err.message);
            if (err.response !== undefined) {
                error.error(err.response.data.errorMessage);
            }
        });
        if (response === undefined) {
            userCache.set(username, null);
            return false;
        }
        return true;
    }
    return false;
}

export async function login(username, clientToken, password) {
    if (await checkUser(username, clientToken)) {
        return true;
    }
    const response = await axios.post("/api/yggdrasil/authserver/authenticate", {
        username,
        password,
        clientToken,
        requestUser: false,
        agent: {
            name: "Minecraft",
            version: 1
        }
    }).catch(err => {
        error.error(err.message);
        if (err.response !== undefined) {
            error.error(err.response.data.errorMessage);
        }
    });
    if (response !== undefined) {
        userCache.set(username, response.data.accessToken);
        return true;
    }
    return false;
}

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
                res.status(437).json({status: false, msg: `UUID验证失败`});
                return false;
        }
    }
    const response = await axios.get(`/api/ps-api/player/status/${username}`, {
        headers: {
            "api-key": config.apikey.key
        }
    });
    const {status, userstatus, playeruuid} = response.data;
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