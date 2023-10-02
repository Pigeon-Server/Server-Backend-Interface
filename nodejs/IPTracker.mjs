/**
 * @file API访问限制器
 * @module IPTracker
 * @author Half_nothing
 * @version 0.2.0
 * @since 0.2.0
 */

/**
 * @class
 * @name Tracker
 * @description API访问限制器类
 * @author Half_nothing
 * @version 0.2.0
 * @since 0.2.0
 * @export
 */
export class Tracker {
    /**
     * @function
     * @public
     * @name constructor
     * @description 构造函数
     * @param limit {number} API访问限制
     * @param windowSize {number} 滑动窗口大小
     * @author Half_nothing
     * @version 0.2.0
     * @since 0.2.0
     * @export
     */
    constructor(limit, windowSize) {
        this.limit = limit;
        this.windowSize = windowSize;
        this.ipWindows = new Map();
        this.macWindows = new Map();
    }

    /**
     * @function
     * @public
     * @name trackIP
     * @description 检查ip和mac是否超出访问限制
     * @param ip {string} 客户端ip
     * @param mac {string} 客户端mac地址
     * @returns {boolean} true: 没有超出限制 false: 超出访问限制
     * @author Half_nothing
     * @version 0.2.0
     * @since 0.2.0
     * @export
     */
    trackIP(ip, mac) {
        const now = Date.now();
        if (this.ipWindows.has(ip)) {
            const window = this.ipWindows.get(ip);
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
        if (this.macWindows.has(mac)) {
            const window = this.macWindows.get(mac);
            if (now - window.start >= this.windowSize) {
                window.start = now;
                window.count = 1;
                return window.count <= this.limit;
            }
            window.count++;
            return window.count <= this.limit;
        }
        this.macWindows.set(mac, window);
        return true;
    }
}
