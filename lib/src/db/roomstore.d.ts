import { IDatabaseConnector } from "./connector";
import { IRoomStoreEntry } from "./interfaces";
export declare class DbRoomStore {
    private db;
    private remoteCache;
    private mxidCache;
    private opCache;
    private protocol;
    constructor(db: IDatabaseConnector, cache?: boolean, protocol?: string);
    newData(mxid: string, roomId: string, puppetId: number): IRoomStoreEntry;
    getAll(): Promise<IRoomStoreEntry[]>;
    getByRemote(puppetId: number, roomId: string): Promise<IRoomStoreEntry | null>;
    getByPuppetId(puppetId: number): Promise<IRoomStoreEntry[]>;
    getByMxid(mxid: string): Promise<IRoomStoreEntry | null>;
    set(data: IRoomStoreEntry): Promise<void>;
    delete(data: IRoomStoreEntry): Promise<void>;
    toGlobalNamespace(puppetId: number, roomId: string): Promise<void>;
    setRoomOp(roomMxid: string, userMxid: string): Promise<void>;
    getRoomOp(roomMxid: string): Promise<string | null>;
    private getFromRow;
    private labels;
}
