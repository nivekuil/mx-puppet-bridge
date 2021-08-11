import { IDatabaseConnector, ISqlCommandParameters, ISqlRow } from "./connector";
import * as prometheus from "prom-client";
export declare class SQLite3 implements IDatabaseConnector {
    private filename;
    type: string;
    latency: prometheus.Histogram<string>;
    private db;
    private insertId;
    constructor(filename: string);
    Open(): Promise<void>;
    Get(sql: string, parameters?: ISqlCommandParameters): Promise<ISqlRow | null>;
    All(sql: string, parameters?: ISqlCommandParameters): Promise<ISqlRow[]>;
    Run(sql: string, parameters?: ISqlCommandParameters, returnId?: string): Promise<number>;
    Close(): Promise<void>;
    Exec(sql: string): Promise<void>;
}
