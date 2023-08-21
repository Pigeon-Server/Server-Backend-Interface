import express from "express";
import expressWS from 'express-ws';
import {error, logger} from "../nodejs/logger.mjs";
import multer from "multer";
import fs, {accessSync} from "fs";
import {Tracker} from '../nodejs/IPTracker.mjs';
import archiver from 'archiver';
import {config, packageConfig, savePackageConfig} from "../nodejs/config.mjs";
import {calculateMd5, generateKey, stringMd5} from "../nodejs/utils.mjs";
import {addUserAccess, addUserAccount, checkUserAccount, getKey, setKey, updateTime} from "../nodejs/mysql.mjs";
import {getPlayerStatus, judgeUser, login} from "../nodejs/apiManager.mjs";

export const router = express.Router();
expressWS(router);
const upload = multer({dest: "upload/"});
const tracker = new Tracker(config.callLimit.count, config.callLimit.time);
router.post("/upload-upgrade", upload.single("file"), async (req, res) => {
    const file = req.file;
    const {username, token, packName, password} = req.body;
    if ([username, token, password].includes(undefined)) {
        res.status(401).json({status: false, msg: "访问参数错误"});
        return
    }
    if (packName === undefined) {
        res.status(400).json({status: false, msg: "未指定包名"});
        return;
    }
    if (!file) {
        res.status(400).json({status: false, msg: "未上传文件"});
        return;
    }
    if (!Object.keys(config.adminDef).includes(username)) {
        res.status(403).json({status: false, msg: "无权访问"});
        return;
    }
    if (token !== config.adminDef[username]) {
        res.status(403).json({status: false, msg: "token错误"});
        return
    }
    const user = await login(username, token, password);
    if (!user) {
        res.status(403).json({status: false, msg: "登录失败"});
        return
    }
    try {
        fs.accessSync(`update/${packName}`, fs.constants.F_OK);
    } catch (ignored) {
        fs.mkdirSync(`update/${packName}`);
    }
    const md5 = calculateMd5(file.path);
    const destinationPath = `update/${packName}/${file.originalname}`;
    if (!(packName in packageConfig)) {
        packageConfig[packName] = {files: []};
    }
    if (packageConfig[packName]["files"].includes(file.originalname)) {
        if (packageConfig[packName][file.originalname]['md5'] === md5) {
            res.status(200).json({status: true, msg: "文件无变化"});
            fs.unlink(file.path, err => err ? error.error(err.message) : logger.info(`Delete file ${file.path}`));
            logger.info(`File ${file.originalname} has same MD5 ${md5}.`);
            return;
        }
    } else {
        packageConfig[packName]["files"].push(file.originalname);
        packageConfig[packName][file.originalname] = {
            'path': destinationPath,
            'name': file.originalname,
            md5
        };
    }
    fs.rename(file.path, destinationPath, (err) => {
        if (err) {
            error.error(`Save file error, ${file.originalname}`);
            return;
        }
        logger.info(`Save file ${file.originalname} to ${destinationPath}`);
    });
    res.status(200).json({status: true, msg: "上传成功"});
    savePackageConfig();
});

router.use(async (req, res, next) => {
    const {macAddress, uuid, username} = req.query;
    // 验证参数
    if ([macAddress, uuid, username].includes(undefined)) {
        logger.warn(`Access Denial: Missing parameter`);
        res.status(403).json({status: false, msg: "无身份标识,拒绝访问"});
        return;
    }
    // api访问限制
    if (!tracker.trackIP(req.ip, macAddress)) {
        logger.warn(`Access Denial: Api call limit`);
        res.status(429).json({msg: "超出API访问限制"});
        return;
    }
    // 验证账号
    if (await judgeUser(username, uuid, res)) {
        logger.warn(`Access Denial: Account verification failed`);
        return;
    }
    next();
});

router.get("/get-access-key", async (req, res) => {
    const {macAddress, username, uuid} = req.query;
    const result = await getKey(username, uuid);
    if (result.length === 1) {
        logger.info(`Send key ${result[0].accessKey} for ${username}.`);
        res.status(200).json({status: true, key: result[0].accessKey});
        return;
    }
    const key = generateKey();
    setKey(username, uuid, macAddress, req.ip, key).then((_) => {
        logger.info(`Generate new key ${key} for ${username}.`);
        res.status(200).json({status: true, key});
    }).catch(err => {
        error.error(err.message);
        res.status(500).json({status: false, msg: "服务器内部出错,请联系管理员"});
    })
});

router.use(async (req, res, next) => {
    const {macAddress, uuid, username, accessKey, packName} = req.query;
    if (accessKey === undefined) {
        logger.warn(`Access Denial: No accessKey`);
        res.status(403).json({status: false, msg: "无accessKey"});
        return;
    }
    const response = await getKey(username, uuid);
    if (response.length === 0 || response[0].accessKey !== accessKey) {
        logger.warn(`Access Denial: Invalid accessKey ${accessKey}`);
        res.status(403).json({status: false, msg: "accessKey无效"});
        return;
    }
    if (packName === undefined) {
        logger.warn(`Access Denial: No packName`);
        res.status(400).json({status: false, msg: "未指定包名"});
        return;
    }
    if (!(await getPlayerStatus(username, uuid).catch(err => error.error(err.message)))) {
        logger.warn(`Access Denial: Invalid username(${username}) or UUID(${uuid})`);
        res.status(403).json({status: false, msg: "用户名或UUID无效"});
        return;
    }
    const result = await checkUserAccount(username, uuid).catch(err => error.error(err.message));
    if (result === undefined) {
        logger.warn(`Access Denial: Mysql database error.`);
        res.status(500).json({status: false, msg: "服务器内部出错,请联系管理员"});
        return;
    }
    if (result.length === 1) {
        updateTime(username, uuid, packName).catch(err => error.error(err.message));
    } else {
        addUserAccount(username, uuid, macAddress, req.ip, packName).catch(err => error.error(err.message));
    }
    next();
});

router.get("/check-update", async (req, res) => {
    const {packName, localSource} = req.query;
    try {
        fs.accessSync(`update/${packName}`, fs.constants.F_OK);
    } catch (ignored) {
        logger.warn(`Access Denial: Unable to get update info.`);
        res.status(404).json({status: false, msg: "无法获取更新信息"});
        return;
    }
    if (!(packName in packageConfig)) {
        logger.warn(`Access Denial: The consolidation package configuration file could not be found.`);
        res.status(404).json({status: false, msg: "无法找到该整合包配置文件"});
        return;
    }
    const files = [];
    let temp = "";
    for (const index in packageConfig[packName]["files"]) {
        const i = packageConfig[packName]["files"][index];
        try {
            fs.accessSync(packageConfig[packName][i]["path"], fs.constants.F_OK);
        } catch (ignored) {
            error.error(`Cannot find file ${packageConfig[packName][i]["path"]}`);
            continue;
        }
        const tmp = calculateMd5(packageConfig[packName][i]["path"]);
        if (tmp !== packageConfig[packName][i]["md5"]) {
            logger.warn(`Access Denial: Profile MD5 validation failed.`);
            res.status(500).json({status: false, msg: "服务器配置文件验证失败,请联系管理员"});
            return;
        }
        temp += tmp;
        files.push({
            path: packageConfig[packName][i]["path"],
            name: packageConfig[packName][i]["name"]
        })
    }
    if (localSource !== undefined && localSource.toLowerCase() === stringMd5(temp)) {
        res.status(304).send();
        return;
    }
    const zip = archiver('zip', {zlib: {level: 9}});
    switch (config.syncMode) {
        case "force":
            res.status(202);
            break;
        case "increment":
            res.status(201);
            break;
        default:
            res.status(200);
    }
    zip.pipe(res);
    files.forEach(file => {
        zip.file(file.path, {name: file.name});
    });
    zip.finalize().then((_) => {
        logger.info(`Update file send successfully, packName: ${packName}`)
    }).catch(err => error.error(`Update file send error, ${err.message}`));
});

router.get("/get-source", async (req, res) => {
    const {macAddress, uuid, username, packName, path} = req.query;
    addUserAccess(username, uuid, macAddress, req.ip, packName, path).catch(err => error.error(err.message));
    const destinationPath = `source/${packName}/${path}`;
    try {
        accessSync(destinationPath, fs.constants.F_OK);
        logger.info(`Send file ${destinationPath} to ${username}`);
        res.download(destinationPath);
    } catch (err) {
        error.error(err.message);
        logger.warn(`Access Denial: Unable to find file.`);
        res.status(404).json({message: "更新文件出错,请联系管理员"});
    }
});