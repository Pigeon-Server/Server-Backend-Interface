const config = require("../config.json");

class Utils {
    static randomNum(max) {
        return 1 + Math.round(Math.random() * (max - 1));
    }

    static randomArr(max, length = 1) {
        if (length === 1) {
            return Utils.randomNum(max);
        }
        if (length > max) {
            length = max;
        }
        let output = [];
        while (length > 0) {
            let num = Utils.randomNum(max);
            if (output.includes(num)) {
                continue;
            }
            output.push(num);
            length--;
        }
        return output;
    }

    static dataBaseInjectionFiltering(str) {
        return str.toString().toLowerCase().match("and|drop|;|sleep|\'|delete|or|true|false|version|insert|into|select|join|like|union|update|where|\"");
    }

    static enableHSTS(res) {
        if (!config.https.enable || !config.https.enableHSTS) {
            return
        }
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
}

module.exports = Utils