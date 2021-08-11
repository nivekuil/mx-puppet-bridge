import { IPuppetData } from "../interfaces";
export interface IProfileDbEntry {
    name?: string | null;
    avatarUrl?: string | null;
    avatarMxc?: string | null;
    avatarHash?: string | null;
}
export interface IUserStoreEntry extends IProfileDbEntry {
    puppetId: number;
    userId: string;
    externalUrl?: string | null;
}
export interface IUserStoreRoomOverrideEntry extends IProfileDbEntry {
    puppetId: number;
    userId: string;
    roomId: string;
}
export interface IRoomStoreEntry extends IProfileDbEntry {
    mxid: string;
    roomId: string;
    puppetId: number;
    topic?: string | null;
    groupId?: string | null;
    isDirect: boolean;
    e2be: boolean;
    externalUrl?: string | null;
    isUsed: boolean;
}
export interface IGroupStoreEntry extends IProfileDbEntry {
    mxid: string;
    groupId: string;
    puppetId: number;
    shortDescription?: string | null;
    longDescription?: string | null;
    roomIds: string[];
    externalUrl?: string | null;
}
export interface IEmoteStoreEntry extends IProfileDbEntry {
    puppetId: number;
    roomId: string | null;
    emoteId: string;
    data: IPuppetData;
}
