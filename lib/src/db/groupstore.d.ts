import { IDatabaseConnector } from "./connector";
import { IGroupStoreEntry } from "./interfaces";
export declare class DbGroupStore {
    private db;
    private groupsCache;
    private protocol;
    constructor(db: IDatabaseConnector, cache?: boolean, protocolId?: string);
    newData(mxid: string, groupId: string, puppetId: number): IGroupStoreEntry;
    getByRemote(puppetId: number, groupId: string, ignoreCache?: boolean): Promise<IGroupStoreEntry | null>;
    getByPuppetId(puppetId: number): Promise<IGroupStoreEntry[]>;
    getByMxid(mxid: string): Promise<IGroupStoreEntry | null>;
    set(data: IGroupStoreEntry): Promise<void>;
    delete(data: IGroupStoreEntry): Promise<void>;
    private getFromRow;
    private labels;
}
