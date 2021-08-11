import * as prometheus from "prom-client";
declare type SQLTYPES = number | boolean | string | null;
export interface ISqlCommandParameters {
    [paramKey: string]: SQLTYPES | Promise<SQLTYPES>;
}
export interface ISqlRow {
    [key: string]: SQLTYPES;
}
export interface IDatabaseConnector {
    type: string;
    latency: prometheus.Histogram<string>;
    Open(): void;
    Get(sql: string, parameters?: ISqlCommandParameters): Promise<ISqlRow | null>;
    All(sql: string, parameters?: ISqlCommandParameters): Promise<ISqlRow[]>;
    Run(sql: string, parameters?: ISqlCommandParameters, returnId?: string): Promise<number>;
    Close(): Promise<void>;
    Exec(sql: string): Promise<void>;
}
export {};
