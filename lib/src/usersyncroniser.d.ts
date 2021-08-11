import { PuppetBridge } from "./puppetbridge";
import { IRemoteUser, IRemoteUserRoomOverride, RemoteUserResolvable } from "./interfaces";
import { MatrixClient } from "@sorunome/matrix-bot-sdk";
import { IUserStoreEntry, IUserStoreRoomOverrideEntry } from "./db/interfaces";
import { ITokenResponse } from "./provisioner";
export declare class UserSyncroniser {
    private bridge;
    private userStore;
    private clientLock;
    private roomOverrideLock;
    constructor(bridge: PuppetBridge);
    getClientFromTokenCallback(token: ITokenResponse | null): Promise<MatrixClient | null>;
    maybeGetClient(data: IRemoteUser): Promise<MatrixClient | null>;
    getPuppetClient(puppetId: number): Promise<MatrixClient | null>;
    getClient(data: IRemoteUser): Promise<MatrixClient>;
    getPartsFromMxid(mxid: string): IRemoteUser | null;
    resolve(str: RemoteUserResolvable): Promise<IRemoteUser | null>;
    deleteForMxid(mxid: string): Promise<void>;
    setRoomOverride(userData: IRemoteUser, roomId: string, roomOverrideData?: IUserStoreRoomOverrideEntry | null, client?: MatrixClient | null, origUserData?: IUserStoreEntry | null): Promise<void>;
    updateRoomOverride(client: MatrixClient, userData: IRemoteUser, roomId: string, roomOverride: IRemoteUserRoomOverride, origUserData?: IUserStoreEntry): Promise<void>;
}
