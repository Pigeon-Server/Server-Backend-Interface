export class Tracker {
    constructor(limit, windowSize) {
        this.limit = limit;
        this.windowSize = windowSize;
        this.ipWindows = new Map();
        this.macWindows = new Map();
    }

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
