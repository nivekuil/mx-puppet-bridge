import { PuppetBridge } from "./puppetbridge";
import { IRemoteGroup, RemoteGroupResolvable } from "./interfaces";
import { IGroupStoreEntry } from "./db/interfaces";
export declare class GroupSyncroniser {
    private bridge;
    private groupStore;
    private mxidLock;
    constructor(bridge: PuppetBridge);
    maybeGet(data: IRemoteGroup): Promise<IGroupStoreEntry | null>;
    maybeGetMxid(data: IRemoteGroup): Promise<string | null>;
    getMxid(data: IRemoteGroup, doCreate?: boolean): Promise<string>;
    addRoomToGroup(group: IRemoteGroup, roomId: string, recursionStop?: boolean): Promise<void>;
    removeRoomFromGroup(group: IRemoteGroup, roomId: string): Promise<void>;
    getPartsFromMxid(mxid: string): Promise<IRemoteGroup | null>;
    resolve(str: RemoteGroupResolvable): Promise<IRemoteGroup | null>;
    private makeRandomId;
}
