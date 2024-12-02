export enum HttpCode {
    OK = 200,
    Created,
    Accepted,
    NoContent = 204,

    MovedPermanently = 301,
    Found,
    NotModified = 304,

    BadRequest = 400,
    Unauthorized,
    Forbidden = 403,
    NotFound,
    MethodNotAllowed,
    TooManyRequests = 429,

    InternalServerError = 500,
    NotImplemented
}