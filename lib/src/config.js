"use strict";
/*
Copyright 2019, 2020 mx-puppet-bridge
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
const MAX_AUTOJOIN_USERS = 200;
const ROOM_USER_AUTOJOIN_DELAY = 5000;
class Config {
    constructor() {
        this.bridge = new BridgeConfig();
        this.logging = new LoggingConfig();
        this.database = new DatabaseConfig();
        this.metrics = new MetricsConfig();
        this.provisioning = new ProvisioningConfig();
        this.presence = new PresenceConfig();
        this.relay = new RelayConfig();
        this.selfService = new SelfServiceConfig();
        this.homeserverUrlMap = {};
        this.namePatterns = new NamePatternsConfig();
        this.limits = new LimitsConfig();
    }
    // tslint:disable-next-line no-any
    applyConfig(newConfig, configLayer = this) {
        if (!newConfig) {
            return;
        }
        Object.keys(newConfig).forEach((key) => {
            if (configLayer[key] instanceof Object && !(configLayer[key] instanceof Array)) {
                this.applyConfig(newConfig[key], configLayer[key]);
            }
            else {
                configLayer[key] = newConfig[key];
            }
        });
    }
}
exports.Config = Config;
class BridgeConfig {
    constructor() {
        this.bindAddress = "localhost";
        this.loginSharedSecretMap = {};
        this.enableGroupSync = false;
        this.stripHomeservers = [];
    }
}
class LoggingConfig {
    constructor() {
        this.console = "info";
        this.lineDateFormat = "MMM-D HH:mm:ss.SSS";
        this.files = [];
    }
}
exports.LoggingConfig = LoggingConfig;
class LoggingInterfaceModuleConfig {
}
exports.LoggingInterfaceModuleConfig = LoggingInterfaceModuleConfig;
class LoggingInterfaceConfig {
    constructor() {
        this.level = "info";
        this.enabled = [];
        this.disabled = [];
    }
}
exports.LoggingInterfaceConfig = LoggingInterfaceConfig;
class LoggingFileConfig extends LoggingInterfaceConfig {
    constructor() {
        super(...arguments);
        this.maxFiles = "14d";
        this.maxSize = "50m";
        this.datePattern = "YYYY-MM-DD";
    }
}
exports.LoggingFileConfig = LoggingFileConfig;
class MetricsConfig {
    constructor() {
        this.enabled = false;
        this.port = 8000;
        this.path = "/metrics";
    }
}
exports.MetricsConfig = MetricsConfig;
class DatabaseConfig {
    constructor() {
        this.filename = "database.db";
    }
}
exports.DatabaseConfig = DatabaseConfig;
class ProvisioningConfig {
    constructor() {
        this.whitelist = [];
        this.blacklist = [];
        this.apiPrefix = "/_matrix/provision";
    }
}
class PresenceConfig {
    constructor() {
        this.enabled = true;
        this.interval = 500;
        this.enableStatusState = false;
        this.statusStateBlacklist = [];
    }
}
exports.PresenceConfig = PresenceConfig;
class RelayConfig {
    constructor() {
        this.whitelist = [];
        this.blacklist = [];
    }
}
class SelfServiceConfig {
    constructor() {
        this.whitelist = [];
        this.blacklist = [];
    }
}
class NamePatternsConfig {
}
class LimitsConfig {
    constructor() {
        this.maxAutojoinUsers = MAX_AUTOJOIN_USERS;
        this.roomUserAutojoinDelay = ROOM_USER_AUTOJOIN_DELAY;
    }
}
//# sourceMappingURL=config.js.map