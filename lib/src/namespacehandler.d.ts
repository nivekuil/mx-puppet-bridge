import { PuppetBridge } from "./puppetbridge";
import { IRemoteUser, IRemoteRoom, IRemoteGroup, IReceiveParams } from "./interfaces";
export interface IPuppetCreateInfo {
    public: boolean;
    invites: Set<string>;
}
export declare class NamespaceHandler {
    private bridge;
    private enabled;
    private usersInRoom;
    private puppetsForUser;
    private puppetsForRoom;
    private puppetsForGroup;
    constructor(bridge: PuppetBridge);
    getSuffix(puppetId: number, id: string): Promise<string>;
    fromSuffix(suffix: string): null | {
        puppetId: number;
        id: string;
    };
    canSeeRoom(room: IRemoteRoom, sender: string): Promise<boolean>;
    canSeeGroup(group: IRemoteGroup, sender: string): Promise<boolean>;
    isSoleAdmin(room: IRemoteRoom, sender: string | number): Promise<boolean>;
    isAdmin(room: IRemoteRoom, sender: string | number): Promise<boolean>;
    getDbPuppetId(puppetId: number): Promise<number>;
    getRoomPuppetUserIds(room: IRemoteRoom): Promise<Set<string>>;
    getRoomCreateInfo(room: IRemoteRoom): Promise<IPuppetCreateInfo>;
    getGroupCreateInfo(group: IRemoteGroup): Promise<IPuppetCreateInfo>;
    createUser(user: IRemoteUser): Promise<IRemoteUser | null>;
    createRoom(room: IRemoteRoom): Promise<IRemoteRoom | null>;
    createGroup(group: IRemoteGroup): Promise<IRemoteGroup | null>;
    getUserIdsInRoom(room: IRemoteRoom): Promise<Set<string> | null>;
    getRemoteUser(user: IRemoteUser | null, sender: string): Promise<IRemoteUser | null>;
    getRemoteRoom(room: IRemoteRoom | null, sender: string): Promise<IRemoteRoom | null>;
    getRemoteGroup(group: IRemoteGroup | null, sender: string): Promise<IRemoteGroup | null>;
    isMessageBlocked(params: IReceiveParams): Promise<boolean>;
    private maybeGetPuppetCreateInfo;
    private getPuppetCreateInfo;
    private populateUsersInRoom;
    private getRemote;
    private populatePuppetsForUser;
    private populatePuppetsForRoom;
    private populatePuppetsForGroup;
    private populateThingForPuppet;
    private getRelay;
}
