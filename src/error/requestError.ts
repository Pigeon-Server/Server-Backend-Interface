import {HttpCode} from "@/utils/httpCode";

export class RequestError extends Error {
    public readonly statusCode: HttpCode;

    constructor(statusCode: HttpCode, message?: string) {
        super(message);
        this.statusCode = statusCode;
    }
}

export class IllegalPathError extends RequestError {
    constructor(message: string = "非法的文件路径") {
        super(HttpCode.BadRequest, message);
    }
}

export class TargetNotFoundError extends RequestError {
    constructor(message: string = "无法找到指定文件") {
        super(HttpCode.NotFound, message);
    }
}

export class FileExistsError extends RequestError {
    constructor(message: string = "存在同名文件") {
        super(HttpCode.BadRequest, message);
    }
}

export class ParamMismatchError extends RequestError {
    constructor(message: string = "缺少查询参数") {
        super(HttpCode.BadRequest, message);
    }
}

export class RefererError extends RequestError {
    constructor(message: string = "Direct access to this interface is not allowed") {
        super(HttpCode.BadRequest, message);
    }
}

export class CSRFAttachError extends RequestError {
    constructor(message: string = "You may have suffered a CSRF attack") {
        super(HttpCode.BadRequest, message);
    }
}

export class InternalServerError extends RequestError {
    constructor(message: string = "服务器内部出错,请联系管理员") {
        super(HttpCode.InternalServerError, message);
    }
}