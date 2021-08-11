import { LoggingConfig } from "./config";
import "winston-daily-rotate-file";
export declare class Log {
    private module;
    static get level(): string;
    static set level(level: string);
    static Configure(config: LoggingConfig): void;
    static ForceSilent(): void;
    private static config;
    private static logger;
    private static getTransportOpts;
    private static setupLogger;
    private static setupFileTransport;
    warning: (...msg: any[]) => void;
    constructor(module: string);
    error(...msg: any[]): void;
    warn(...msg: any[]): void;
    info(...msg: any[]): void;
    verbose(...msg: any[]): void;
    debug(...msg: any[]): void;
    silly(...msg: any[]): void;
    private log;
}
