import { PuppetBridge } from "./puppetbridge";
import { IRemoteRoom, RemoteRoomResolvable } from "./interfaces";
import { IRoomStoreEntry } from "./db/interfaces";
import { MatrixClient } from "@sorunome/matrix-bot-sdk";
export declare class RoomSyncroniser {
    private bridge;
    private roomStore;
    private mxidLock;
    constructor(bridge: PuppetBridge);
    getRoomOp(room: string | IRemoteRoom): Promise<MatrixClient | null>;
    maybeGet(data: IRemoteRoom): Promise<IRoomStoreEntry | null>;
    maybeGetMxid(data: IRemoteRoom): Promise<string | null>;
    getMxid(data: IRemoteRoom, client?: MatrixClient, doCreate?: boolean): Promise<{
        mxid: string;
        created: boolean;
    }>;
    insert(mxid: string, roomData: IRemoteRoom): Promise<void>;
    markAsDirect(room: IRemoteRoom, direct?: boolean): Promise<void>;
    markAsUsed(room: IRemoteRoom, used?: boolean): Promise<void>;
    updateBridgeInformation(data: IRemoteRoom): Promise<void>;
    getPartsFromMxid(mxid: string): Promise<IRemoteRoom | null>;
    addGhosts(room: IRemoteRoom): Promise<void>;
    maybeLeaveGhost(roomMxid: string, userMxid: string): Promise<void>;
    puppetToGlobalNamespace(puppetId: number): Promise<void>;
    rebridge(mxid: string, data: IRemoteRoom): Promise<void>;
    delete(data: IRemoteRoom, keepUsers?: boolean): Promise<void>;
    deleteForMxid(mxid: string): Promise<void>;
    deleteForPuppet(puppetId: number): Promise<void>;
    resolve(str: RemoteRoomResolvable, sender?: string): Promise<IRemoteRoom | null>;
    private attemptRoomRestore;
    private giveOp;
    private removeGhostsFromRoom;
    private deleteEntries;
}
