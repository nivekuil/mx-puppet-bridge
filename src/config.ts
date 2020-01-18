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

export class Config {
	public bridge: BridgeConfig = new BridgeConfig();
	public logging: LoggingConfig = new LoggingConfig();
	public database: DatabaseConfig = new DatabaseConfig();
	public provisioning: ProvisioningConfig = new ProvisioningConfig();
	public presence: PresenceConfig = new PresenceConfig();
	public relay: RelayConfig = new RelayConfig();
	public homeserverUrlMap: {[key: string]: string} = {};
	public namePatterns: NamePatternsConfig = new NamePatternsConfig();

	public applyConfig(newConfig: {[key: string]: any}, configLayer: {[key: string]: any} = this) {
		Object.keys(newConfig).forEach((key) => {
			if (configLayer[key] instanceof Object && !(configLayer[key] instanceof Array)) {
				this.applyConfig(newConfig[key], configLayer[key]);
			} else {
				configLayer[key] = newConfig[key];
			}
		});
	}
}

class BridgeConfig {
	public bindAddress: string = "localhost";
	public port: number;
	public domain: string;
	public homeserverUrl: string;
	public loginSharedSecretMap: {[homeserver: string]: string} = {};
	public displayname?: string;
	public avatarUrl?: string;
	public enableGroupSync: boolean = false;
}

export class LoggingConfig {
	public console: string | LoggingInterfaceConfig = "info";
	public lineDateFormat: string = "MMM-D HH:mm:ss.SSS";
	public files: LoggingFileConfig[] = [];
}

export class LoggingInterfaceModuleConfig {
	public module: string;
	public regex: string;
}

export class LoggingInterfaceConfig {
	public level: string = "info";
	public enabled: (string | LoggingInterfaceModuleConfig)[] = [];
	public disabled: (string | LoggingInterfaceModuleConfig)[] = [];
}

export class LoggingFileConfig extends LoggingInterfaceConfig {
	public file: string;
	public maxFiles: string = "14d";
	public maxSize: string|number = "50m";
	public datePattern: string = "YYYY-MM-DD";
}

export class DatabaseConfig {
	public connString: string;
	public filename: string = "database.db";
}

class ProvisioningConfig {
	public whitelist: string[] = [];
	public blacklist: string[] = [];
}

class PresenceConfig {
	public enabled: boolean = true;
	public interval: number = 500;
}

class RelayConfig {
	public enabled: boolean = false;
	public whitelist: string[] = [];
	public blacklist: string[] = [];
}

class NamePatternsConfig {
	public user: string;
	public userOverride: string;
	public room: string;
	public group: string;
}
