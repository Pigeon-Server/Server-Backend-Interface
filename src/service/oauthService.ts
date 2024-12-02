import {axios} from "@/module/apiManager";
import {Account} from "@/database/model/account";
import {Config} from "@/base/config";
import {Utils} from "@/utils/utils";
import {EncryptUtils} from "@/utils/encryptUtils";
import {AuthService} from "@/service/authService";

export namespace OAuthService {
    import generateKey = Utils.generateKey;
    import encryptPassword = EncryptUtils.encryptPassword;
    import generateJWTToken = AuthService.generateJWTToken;
    import updateConfig = Config.updateConfig;

    export const getOauthToken = async (code: string, redirect_uri: string) => {
        const tokenResponse = await axios.post(updateConfig.api.oauth.tokenUrl, {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirect_uri,
            client_id: updateConfig.api.oauth.clientId,
            client_secret: updateConfig.api.oauth.clientSecret
        });
        const token: OauthTokenData = tokenResponse.data;
        const response = await axios.get(`${updateConfig.api.baseUrl}/api/user`, {
            headers: {
                "Authorization": `Bearer ${token.access_token}`
            }
        });
        const data: UserApiData = response.data;
        const salt = generateKey();
        let account = await Account.findOne({
            where: {
                username: data.nickname,
            }
        });
        if (account === null) {
            account = await Account.create({
                username: data.nickname,
                password: encryptPassword("", salt),
                permission: data.permission,
                salt: salt
            });
        }
        return generateJWTToken({
            username: account.username,
            permission: account.permission,
            type: "refresh"
        });
    };
}