export declare class Config {
    bridge: BridgeConfig;
    logging: LoggingConfig;
    database: DatabaseConfig;
    metrics: MetricsConfig;
    provisioning: ProvisioningConfig;
    presence: PresenceConfig;
    relay: RelayConfig;
    selfService: SelfServiceConfig;
    homeserverUrlMap: {
        [key: string]: string;
    };
    namePatterns: NamePatternsConfig;
    limits: LimitsConfig;
    applyConfig(newConfig: {
        [key: string]: any;
    }, configLayer?: {
        [key: string]: any;
    }): void;
}
declare class BridgeConfig {
    bindAddress: string;
    port: number;
    domain: string;
    homeserverUrl: string;
    mediaUrl: string;
    loginSharedSecretMap: {
        [homeserver: string]: string;
    };
    displayname?: string;
    avatarUrl?: string;
    enableGroupSync: boolean;
    stripHomeservers: string[];
}
export declare class LoggingConfig {
    console: string | LoggingInterfaceConfig;
    lineDateFormat: string;
    files: LoggingFileConfig[];
}
export declare class LoggingInterfaceModuleConfig {
    module: string;
    regex: string;
}
export declare class LoggingInterfaceConfig {
    level: string;
    enabled: (string | LoggingInterfaceModuleConfig)[];
    disabled: (string | LoggingInterfaceModuleConfig)[];
}
export declare class LoggingFileConfig extends LoggingInterfaceConfig {
    file: string;
    maxFiles: string;
    maxSize: string | number;
    datePattern: string;
}
export declare class MetricsConfig {
    enabled: boolean;
    port: number;
    path: string;
}
export declare class DatabaseConfig {
    connString: string;
    filename: string;
}
declare class ProvisioningConfig {
    whitelist: string[];
    blacklist: string[];
    sharedSecret: string;
    apiPrefix: string;
}
export declare class PresenceConfig {
    enabled: boolean;
    interval: number;
    enableStatusState: boolean;
    statusStateBlacklist: string[];
}
declare class RelayConfig {
    whitelist: string[];
    blacklist: string[];
}
declare class SelfServiceConfig {
    whitelist: string[];
    blacklist: string[];
}
declare class NamePatternsConfig {
    user: string;
    userOverride: string;
    room: string;
    group: string;
    emote: string;
}
declare class LimitsConfig {
    maxAutojoinUsers: number;
    roomUserAutojoinDelay: number;
}
export {};
