import { IDatabaseConnector } from "./connector";
import { IPuppetData } from "../interfaces";
export declare type PuppetType = "puppet" | "relay" | "invalid";
export declare const PUPPET_TYPES: PuppetType[];
export interface IPuppet {
    puppetId: number;
    puppetMxid: string;
    data: IPuppetData;
    userId: string | null;
    type: PuppetType;
    isPublic: boolean;
    autoinvite: boolean;
    isGlobalNamespace: boolean;
}
export interface IMxidInfo {
    puppetMxid: string;
    name: string | null;
    avatarMxc: string | null;
    avatarUrl: string | null;
    token: string | null;
    statusRoom: string | null;
}
export declare class DbPuppetStore {
    private db;
    private mxidCache;
    private puppetCache;
    private mxidInfoLock;
    private allPuppetIds;
    private protocol;
    constructor(db: IDatabaseConnector, cache?: boolean, protocol?: string);
    deleteStatusRoom(mxid: string): Promise<void>;
    getMxidInfo(puppetMxid: string): Promise<IMxidInfo | null>;
    getOrCreateMxidInfo(puppetMxid: string): Promise<IMxidInfo>;
    setMxidInfo(puppet: IMxidInfo): Promise<void>;
    getAll(): Promise<IPuppet[]>;
    getForMxid(puppetMxid: string): Promise<IPuppet[]>;
    get(puppetId: number): Promise<IPuppet | null>;
    getMxid(puppetId: number): Promise<string>;
    setUserId(puppetId: number, userId: string): Promise<void>;
    setData(puppetId: number, data: IPuppetData): Promise<void>;
    setType(puppetId: number, type: PuppetType): Promise<void>;
    setIsPublic(puppetId: number, isPublic: boolean): Promise<void>;
    setAutoinvite(puppetId: number, autoinvite: boolean): Promise<void>;
    setIsGlobalNamespace(puppetId: number, isGlobalNamespace: boolean): Promise<void>;
    new(puppetMxid: string, data: IPuppetData, userId?: string, isGlobalNamespace?: boolean): Promise<number>;
    delete(puppetId: number): Promise<void>;
    isGhostInRoom(ghostMxid: string, roomMxid: string): Promise<boolean>;
    joinGhostToRoom(ghostMxid: string, roomMxid: string): Promise<void>;
    getGhostsInRoom(room: string): Promise<string[]>;
    getRoomsOfGhost(ghost: string): Promise<string[]>;
    emptyGhostsInRoom(room: string): Promise<void>;
    leaveGhostFromRoom(ghostMxid: string, roomMxid: string): Promise<void>;
    private getRow;
    private labels;
}
