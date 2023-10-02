import express from "express";
import expressWS from 'express-ws';
import {api, error, logger} from "../nodejs/logger.mjs";
import fs, {accessSync} from "fs";
import {Tracker} from '../nodejs/IPTracker.mjs';
import {config} from "../nodejs/config.mjs";
import {generateKey, encryptMD5, encryptSHA1, encryptFile} from "../nodejs/utils.mjs";
import {addUserAccess, addUserAccount, checkUserAccount, getKey, setKey, updateTime} from "../nodejs/mysql.mjs";
import {getPlayerStatus} from "../nodejs/apiManager.mjs";
import {generateJsonToClient, syncConfigCache} from "../nodejs/syncFileManager.mjs";

export const router = express.Router();
expressWS(router);
const tracker = new Tracker(config.callLimit.count, config.callLimit.time);

router.use((req, res, next) => {
    api.info(`New access from ${req.ip}`);
    next();
});

router.get("/get_jar", (req, res) => {
    res.download("resource/HMCL.jar");
});

router.get("/update_link", (req, res) => {
    const jarConfig = {
        "jar": config.launchUpdate.baseUrl + "/api/get_jar",
        "jarsha1": encryptFile("resource/HMCL.jar", encryptSHA1),
        "changeLog": config.launchUpdate.changeLog,
        "version": config.launchUpdate.version
    };
    res.json(jarConfig);
});

router.use(async (req, res, next) => {
    const {macAddress, uuid, username, packName} = req.query;
    api.info(`Argument mac: ${macAddress}, uuid: ${uuid}, username: ${username}, packName: ${packName}`);
    // 验证参数
    if ([macAddress, uuid, username].includes(undefined)) {
        logger.warn(`Access Denial: Missing parameter`);
        res.status(401).json({status: false, msg: "无身份标识,拒绝访问"});
        return;
    }
    // api访问限制
    if (!tracker.trackIP(req.ip, macAddress)) {
        logger.warn(`Access Denial: Api call limit`);
        res.status(429).json({status: false, msg: "超出API访问限制"});
        return;
    }
    // 验证账号
    if (!(await getPlayerStatus(username, uuid, res))) {
        logger.warn(`Access Denial: Account verification failed`);
        return;
    }
    const result = await checkUserAccount({username, uuid, macAddress}).catch(err => error.error(err.message));
    if (result === undefined) {
        logger.warn(`Access Denial: Mysql database error.`);
        res.status(500).json({status: false, msg: "服务器内部出错,请联系管理员"});
        return;
    }
    if (result.length === 1) {
        updateTime({username, uuid, macAddress, ip: req.ip, packName}).catch(err => error.error(err.message));
    } else {
        await addUserAccount({username, uuid, macAddress, ip: req.ip, packName}).catch(err => error.error(err.message));
    }
    if (packName === undefined) {
        logger.warn(`Access Denial: No packName`);
        res.status(439).json({status: false, msg: "未指定包名"});
        return;
    }
    next();
});

router.get("/get-access-key", async (req, res) => {
    const {macAddress, username, uuid, packName} = req.query;
    const result = await getKey({username, uuid, macAddress, packName});
    if (result.length === 1) {
        logger.info(`Send key ${result[0].accessKey} for ${username}.`);
        res.status(200).json({status: true, key: result[0].accessKey});
        return;
    }
    const key = generateKey();
    setKey({username, uuid, macAddress, ip: req.ip, key, packName}).then((_) => {
        logger.info(`Generate new key ${key} for ${username}.`);
        res.status(200).json({status: true, key});
    }).catch(err => {
        error.error(err.message);
        res.status(500).json({status: false, msg: "服务器内部出错,请联系管理员"});
    })
});

router.use(async (req, res, next) => {
    const {uuid, username, accessKey, packName, macAddress} = req.query;
    api.info(`Argument accessKey: ${accessKey}`);
    if (accessKey === undefined) {
        logger.warn(`Access Denial: No accessKey`);
        res.status(403).json({status: false, msg: "无accessKey"});
        return;
    }
    const response = await getKey({username, uuid, macAddress, packName});
    if (response.length === 0 || response[0].accessKey !== accessKey) {
        logger.warn(`Access Denial: Invalid accessKey ${accessKey}`);
        res.status(438).json({status: false, msg: "accessKey无效"});
        return;
    }
    if (syncConfigCache[packName] === undefined) {
        logger.warn(`Access Denial: The consolidation package configuration file could not be found.`);
        res.status(441).json({status: false, msg: "无法找到该整合包配置文件"});
        return;
    }
    const {basePath} = syncConfigCache[packName];
    if (basePath === undefined) {
        logger.warn(`Access Denial: Unable to get baseBath for pack ${packName}.`);
        res.status(440).json({status: false, msg: "无法获取更新信息"});
        return;
    }
    try {
        fs.accessSync(`${basePath}`, fs.constants.F_OK);
    } catch (ignored) {
        logger.warn(`Access Denial: Unable to read basePath ${basePath} for pack ${packName}.`);
        res.status(440).json({status: false, msg: "无法获取更新信息"});
        return;
    }
    next();
});

router.get("/check-update", async (req, res) => {
    const {packName, localSource} = req.query;
    res.setHeader("X-Update-Max-Threads", config.updateMaxThread);
    const clientJson = generateJsonToClient(syncConfigCache[packName]);
    if (encryptMD5(JSON.stringify(clientJson)) !== syncConfigCache[packName].md5) {
        logger.warn(`Access Denial: Profile MD5 validation failed.`);
        res.status(515).json({status: false, msg: "服务器配置文件验证失败,请联系管理员"});
        return;
    }
    if (localSource !== undefined && localSource.toLowerCase() === syncConfigCache[packName].md5) {
        logger.debug(`Same MD5 ${localSource} with client, send nothing.`);
        res.status(304).send();
        return;
    }
    res.status(200).json(clientJson);
});

router.get("/get-source/:path(*)", async (req, res) => {
    const {macAddress, uuid, username, packName} = req.query;
    const path = req.params.path;
    addUserAccess({username, uuid, macAddress, ip: req.ip, packName, path}).catch(err => error.error(err.message));
    const {basePath} = syncConfigCache[packName];
    const destinationPath = `${basePath}/${path}`;
    try {
        accessSync(destinationPath, fs.constants.F_OK);
        logger.info(`Send file ${destinationPath} to ${username}`);
        res.download(destinationPath);
    } catch (err) {
        error.error(err.message);
        logger.warn(`Access Denial: Unable to find file.`);
        res.status(404).json({status: false, message: "更新文件出错,请联系管理员"});
    }
});