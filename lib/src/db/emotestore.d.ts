import { IDatabaseConnector } from "./connector";
import { IEmoteStoreEntry } from "./interfaces";
export declare class DbEmoteStore {
    private db;
    private protocol;
    constructor(db: IDatabaseConnector, protocol?: string);
    newData(puppetId: number, roomId: string | null, emoteId: string): IEmoteStoreEntry;
    get(puppetId: number, roomId: string | null, emoteId: string): Promise<IEmoteStoreEntry | null>;
    getByMxc(puppetId: number, roomId: string | null, mxid: string): Promise<IEmoteStoreEntry | null>;
    getForRoom(puppetId: number, roomId: string): Promise<IEmoteStoreEntry[]>;
    set(data: IEmoteStoreEntry): Promise<void>;
    private getFromRow;
    private labels;
}
