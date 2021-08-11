import { PuppetBridge } from "./puppetbridge";
import { IRemoteRoom } from "./interfaces";
export declare class EventSyncroniser {
    private bridge;
    private eventStore;
    constructor(bridge: PuppetBridge);
    insert(room: IRemoteRoom, matrixId: string, remoteId?: string): Promise<void>;
    remove(room: IRemoteRoom, remoteId: string): Promise<void>;
    getMatrix(room: IRemoteRoom, remoteId: string): Promise<string[]>;
    getRemote(room: IRemoteRoom, matrixId: string): Promise<string[]>;
}
