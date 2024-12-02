type Runnable<T> = (param: T) => void;
type Callback = () => void;
type AsyncCallback = () => Promise<void>;
type Override<P, S> = Omit<P, keyof S> & S;
type JwtData = {
    username: string,
    permission: number,
    type?: string,
    iat: number,
    exp: number,
    iss: string,
    sub: string
};

type OauthTokenData = {
    access_token: string,
    refresh_token: string,
    expires_in: number,
}

type UserApiData = {
    permission: number,
    nickname: string
}

type FileOperationParam = {
    sourcePath: string,
    destPath: string
}

type ServiceReturn = {
    code: number,
    response: Reply
}