/**********************************************
 * @file tracker.ts
 * @desc API访问限制器
 * @author Half_nothing
 * @email Half_nothing@163.com
 * @since 1.3.0
 * @date 2024.03.04
 * @license GNU General Public License (GPL)
 **********************************************/

/**
 * @class
 * @name Tracker
 * @description API访问限制器类
 * @author Half_nothing
 * @version 1.0.2
 * @since 1.0.0
 * @export
 */
export class Tracker {
    private readonly limit: number;
    private readonly windowSize: number;
    private ipWindows: Map<string, { start: number, count: number }>;
    private macWindows: Map<string, { start: number, count: number }>;

    /**
     * @function
     * @public
     * @desc 构造函数
     * @param limit {number} API访问限制
     * @param windowSize {number} 滑动窗口大小
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    constructor(limit: number, windowSize: number) {
        this.limit = limit;
        this.windowSize = windowSize;
        this.ipWindows = new Map();
        this.macWindows = new Map();
    }

    /**
     * @function
     * @public
     * @desc 检查ip和mac是否超出访问限制
     * @param ip {string} 客户端ip
     * @param mac {string?} 客户端mac地址
     * @return {true} 没有超出限制
     * @return {false} 超出访问限制
     * @version 1.0.1
     * @since 1.3.0
     * @export
     */
    trackIP(ip: string, mac?: string): boolean {
        const now = Date.now();
        if (mac === undefined || mac === null) {
            return this._trackIP(now, ip);
        }
        return this._trackIP(now, ip) && this._trackMac(now, mac);
    }

    /**
     * @function
     * @private
     * @desc 检查ip是否超出访问限制
     * @param now {number} 当前时间
     * @param ip {string} 客户端ip
     * @return {true} 没有超出限制
     * @return {false} 超出访问限制
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    private _trackIP(now: number, ip: string): boolean {
        if (this.ipWindows.has(ip)) {
            const window = this.ipWindows.get(ip)!;
            if (now - window.start >= this.windowSize) {
                window.start = now;
                window.count = 1;
                return window.count <= this.limit;
            }
            window.count++;
            return window.count <= this.limit;
        }
        const window = {start: now, count: 1};
        this.ipWindows.set(ip, window);
        return true;
    }

    /**
     * @function
     * @private
     * @desc 检查mac是否超出访问限制
     * @param now {number} 当前时间
     * @param mac {string} 客户端mac地址
     * @return {true} 没有超出限制
     * @return {false} 超出访问限制
     * @version 1.0.0
     * @since 1.3.0
     * @export
     */
    private _trackMac(now: number, mac: string): boolean {
        if (this.macWindows.has(mac)) {
            const window = this.macWindows.get(mac)!;
            if (now - window.start >= this.windowSize) {
                window.start = now;
                window.count = 1;
                return window.count <= this.limit;
            }
            window.count++;
            return window.count <= this.limit;
        }
        const window = {start: now, count: 1};
        this.macWindows.set(mac, window);
        return true;
    }
}
