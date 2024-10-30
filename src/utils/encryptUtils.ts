/**********************************************
 * @file encryptUtils.ts
 * @desc 哈希编码相关操作
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.03
 * @license GNU General Public License (GPL)
 **********************************************/

import {createHash} from "crypto";
import {readFileSync} from "fs";

export namespace EncryptUtils {
    export function encrypt(algorithm: string, content: string): string {
        return createHash(algorithm).update(content, 'utf8').digest('hex');
    }

    export function encryptFile(filePath: string, encrypt: Function) {
        return encrypt.call(null, readFileSync(filePath));
    }

    export function encryptSHA1(content: string): string {
        return encrypt('sha1', content);
    }

    export function encryptSHA256(content: string): string {
        return encrypt('sha256', content);
    }

    export function encryptMD5(content: string): string {
        return encrypt('md5', content);
    }
}
