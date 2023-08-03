class IPTracker {
    constructor(limit, windowSize) {
        this.limit = limit;
        this.windowSize = windowSize;
        this.ipWindows = new Map();
    }

    trackIP(ip) {
        const now = Date.now();
        if (this.ipWindows.has(ip)) {
            const window = this.ipWindows.get(ip);
            if (now - window.start >= this.windowSize) {
                window.start = now;
                window.count = 1;
            } else {
                window.count++;
            }
            if (window.count > this.limit) {
                return false;
            }
        } else {
            const window = { start: now, count: 1 };
            this.ipWindows.set(ip, window);
        }
        return true;
    }
}

module.exports = IPTracker