"use strict";
/*
Copyright 2018 matrix-appservice-discord

Modified for mx-puppet-bridge
Copyright 2019-2020 mx-puppet-bridge

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const config_1 = require("./config");
const util_1 = require("util");
require("winston-daily-rotate-file");
const FORMAT_FUNC = winston_1.format.printf((info) => {
    return `${info.timestamp} [${info.module}] ${info.level}: ${info.message}`;
});
class Log {
    constructor(module) {
        this.module = module;
        this.warning = this.warn;
    }
    static get level() {
        return this.logger.level;
    }
    static set level(level) {
        this.logger.level = level;
    }
    static Configure(config) {
        // Merge defaults.
        Log.config = Object.assign(new config_1.LoggingConfig(), config);
        Log.setupLogger();
    }
    static ForceSilent() {
        new Log("Log").warn("Log set to silent");
        Log.logger.silent = true;
    }
    static getTransportOpts(config, colorize = false) {
        config = Object.assign(new config_1.LoggingInterfaceConfig(), config);
        const allEnabled = [];
        const allDisabled = [];
        const enhancedEnabled = {};
        const enhancedDisabled = {};
        for (const module of config.enabled) {
            if (typeof module === "string") {
                allEnabled.push(module);
            }
            else {
                allEnabled.push(module.module);
                enhancedEnabled[module.module] = module;
            }
        }
        for (const module of config.disabled) {
            if (typeof module === "string") {
                allDisabled.push(module);
            }
            else {
                allDisabled.push(module.module);
                enhancedDisabled[module.module] = module;
            }
        }
        const doEnabled = allEnabled.length > 0;
        const filterOutMods = winston_1.format((info, _) => {
            const module = info.module;
            if ((allDisabled.includes(module) &&
                (!enhancedDisabled[module] || info.message.match(enhancedDisabled[module].regex))) ||
                (doEnabled && (!allEnabled.includes(module) || (enhancedEnabled[module] && !info.message.match(enhancedEnabled[module].regex))))) {
                return false;
            }
            return info;
        });
        if (colorize) {
            return {
                level: config.level,
                format: winston_1.format.combine(winston_1.format.colorize(), filterOutMods(), FORMAT_FUNC),
            };
        }
        else {
            return {
                level: config.level,
                format: winston_1.format.combine(filterOutMods(), FORMAT_FUNC),
            };
        }
    }
    static setupLogger() {
        if (Log.logger) {
            Log.logger.close();
        }
        const tsports = Log.config.files.map((file) => Log.setupFileTransport(file));
        if (typeof Log.config.console === "string") {
            tsports.push(new winston_1.transports.Console({
                level: Log.config.console,
                format: winston_1.format.combine(winston_1.format.timestamp({
                    format: Log.config.lineDateFormat,
                }), winston_1.format.colorize(), FORMAT_FUNC),
            }));
        }
        else {
            tsports.push(new winston_1.transports.Console(Log.getTransportOpts(Log.config.console, true)));
        }
        Log.logger = winston_1.createLogger({
            format: winston_1.format.combine(winston_1.format.timestamp({
                format: Log.config.lineDateFormat,
            }), FORMAT_FUNC),
            transports: tsports,
        });
    }
    static setupFileTransport(config) {
        config = Object.assign(new config_1.LoggingFileConfig(), config);
        const opts = Object.assign(Log.getTransportOpts(config), {
            datePattern: config.datePattern,
            filename: config.file,
            maxFiles: config.maxFiles,
            maxSize: config.maxSize,
        });
        // tslint:disable-next-line no-any
        return new winston_1.transports.DailyRotateFile(opts);
    }
    // tslint:disable-next-line no-any
    error(...msg) {
        this.log("error", msg);
    }
    // tslint:disable-next-line no-any
    warn(...msg) {
        this.log("warn", msg);
    }
    // tslint:disable-next-line no-any
    info(...msg) {
        this.log("info", msg);
    }
    // tslint:disable-next-line no-any
    verbose(...msg) {
        this.log("verbose", msg);
    }
    // tslint:disable-next-line no-any
    debug(...msg) {
        this.log("debug", msg);
    }
    // tslint:disable-next-line no-any
    silly(...msg) {
        this.log("silly", msg);
    }
    // tslint:disable-next-line no-any
    log(level, msg) {
        if (!Log.logger) {
            // We've not configured the logger yet, so create a basic one.
            Log.config = new config_1.LoggingConfig();
            Log.setupLogger();
        }
        const msgStr = msg.map((item) => {
            return typeof (item) === "string" ? item : util_1.inspect(item);
        }).join(" ");
        Log.logger.log(level, msgStr, { module: this.module });
    }
}
exports.Log = Log;
//# sourceMappingURL=log.js.map