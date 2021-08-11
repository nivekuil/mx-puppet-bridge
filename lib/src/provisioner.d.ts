import { PuppetBridge } from "./puppetbridge";
import { IPuppet, PuppetType } from "./db/puppetstore";
import { IPuppetData, RemoteRoomResolvable, RemoteGroupResolvable } from "./interfaces";
export interface IProvisionerDesc {
    puppetId: number;
    desc: string;
    type: PuppetType;
    isPublic: boolean;
}
export interface ITokenResponse {
    token: string;
    hsUrl: string;
    mxid: string;
}
export declare class Provisioner {
    private bridge;
    private puppetStore;
    constructor(bridge: PuppetBridge);
    getAll(): Promise<IPuppet[]>;
    getForMxid(puppetMxid: string): Promise<IPuppet[]>;
    get(puppetId: number): Promise<IPuppet | null>;
    getMxid(puppetId: number): Promise<string>;
    loginWithSharedSecret(mxid: string): Promise<string | null>;
    getHsUrl(mxid: string): Promise<string>;
    getToken(puppetId: number | string): Promise<ITokenResponse | null>;
    setToken(mxid: string, token: string | null): Promise<void>;
    setUserId(puppetId: number, userId: string): Promise<void>;
    setData(puppetId: number, data: IPuppetData): Promise<void>;
    setType(puppetId: number, type: PuppetType): Promise<void>;
    setIsPublic(puppetId: number, isPublic: boolean): Promise<void>;
    setAutoinvite(puppetId: number, autoinvite: boolean): Promise<void>;
    setIsGlobalNamespace(puppetId: number, isGlobalNamespace: boolean): Promise<void>;
    canCreate(mxid: string): boolean;
    canRelay(mxid: string): boolean;
    canSelfService(mxid: string): boolean;
    new(puppetMxid: string, data: IPuppetData, userId?: string): Promise<number>;
    update(puppetMxid: string, puppetId: number, data: IPuppetData, userId?: string): Promise<void>;
    delete(puppetMxid: string, puppetId: number): Promise<void>;
    getDesc(puppetMxid: string, puppetId: number): Promise<IProvisionerDesc | null>;
    getDescMxid(puppetMxid: string): Promise<IProvisionerDesc[]>;
    bridgeRoom(userId: string, mxid: string, remoteIdent: string): Promise<void>;
    unbridgeRoom(userId: string, ident: RemoteRoomResolvable): Promise<boolean>;
    /**
     * Gives 100 power level to a user of a puppet-owned room
     * @param {string} userId
     * @param {RemoteRoomResolvable} room resolvable
     * @returns {Promise<void>}
     */
    setAdmin(userId: string, ident: RemoteRoomResolvable): Promise<void>;
    adjustMute(userId: string, room: string): Promise<void>;
    adjustMuteIfInRoom(userId: string, room: string): Promise<void>;
    adjustMuteListRooms(puppetId: number, userId: string): Promise<void>;
    adjustMuteEverywhere(userId: string): Promise<void>;
    invite(userId: string, ident: RemoteRoomResolvable): Promise<boolean>;
    groupInvite(userId: string, ident: RemoteGroupResolvable): Promise<boolean>;
    private getDescFromData;
    private isWhitelisted;
}
