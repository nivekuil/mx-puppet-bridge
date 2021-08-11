import { IDatabaseConnector } from "./connector";
export interface IReactionStoreEntry {
    puppetId: number;
    roomId: string;
    userId: string;
    eventId: string;
    reactionMxid: string;
    key: string;
}
export declare class DbReactionStore {
    private db;
    private protocol;
    constructor(db: IDatabaseConnector, protocol?: string);
    exists(data: IReactionStoreEntry): Promise<boolean>;
    insert(data: IReactionStoreEntry): Promise<boolean>;
    getFromReactionMxid(reactionMxid: string): Promise<IReactionStoreEntry | null>;
    getFromKey(data: IReactionStoreEntry): Promise<IReactionStoreEntry | null>;
    getForEvent(puppetId: number, eventId: string): Promise<IReactionStoreEntry[]>;
    delete(reactionMxid: string): Promise<void>;
    deleteForEvent(puppetId: number, eventId: string): Promise<void>;
    private getFromRow;
    private labels;
}
