import { IDatabaseConnector } from "./connector";
export declare class DbEventStore {
    private db;
    private protocol;
    constructor(db: IDatabaseConnector, protocol?: string);
    insert(puppetId: number, roomId: string, matrixId: string, remoteId: string): Promise<void>;
    remove(puppetId: number, roomId: string, remoteId: string): Promise<void>;
    getMatrix(puppetId: number, roomId: string, remoteId: string): Promise<string[]>;
    getRemote(puppetId: number, roomId: string, matrixId: string): Promise<string[]>;
    private labels;
}
