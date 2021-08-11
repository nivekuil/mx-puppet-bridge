import { IDatabaseConnector } from "./connector";
import { IUserStoreEntry, IUserStoreRoomOverrideEntry } from "./interfaces";
export declare class DbUserStore {
    private db;
    private usersCache;
    private protocol;
    constructor(db: IDatabaseConnector, cache?: boolean, protocol?: string);
    newData(puppetId: number, userId: string): IUserStoreEntry;
    getAll(): Promise<IUserStoreEntry[]>;
    get(puppetId: number, userId: string): Promise<IUserStoreEntry | null>;
    set(data: IUserStoreEntry): Promise<void>;
    delete(data: IUserStoreEntry): Promise<void>;
    newRoomOverrideData(puppetId: number, userId: string, roomId: string): IUserStoreRoomOverrideEntry;
    getRoomOverride(puppetId: number, userId: string, roomId: string): Promise<IUserStoreRoomOverrideEntry | null>;
    setRoomOverride(data: IUserStoreRoomOverrideEntry): Promise<void>;
    getAllRoomOverrides(puppetId: number, userId: string): Promise<IUserStoreRoomOverrideEntry[]>;
    private getRoomOverrideFromRow;
    private labels;
}
