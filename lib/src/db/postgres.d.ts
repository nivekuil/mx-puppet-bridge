import { IDatabaseConnector, ISqlCommandParameters, ISqlRow } from "./connector";
import * as prometheus from "prom-client";
export declare class Postgres implements IDatabaseConnector {
    private connectionString;
    static ParameterizeSql(sql: string): string;
    type: string;
    latency: prometheus.Histogram<string>;
    private db;
    constructor(connectionString: string);
    Open(): void;
    Get(sql: string, parameters?: ISqlCommandParameters): Promise<ISqlRow | null>;
    All(sql: string, parameters?: ISqlCommandParameters): Promise<ISqlRow[]>;
    Run(sql: string, parameters?: ISqlCommandParameters, returnId?: string): Promise<number>;
    Close(): Promise<void>;
    Exec(sql: string): Promise<void>;
}
