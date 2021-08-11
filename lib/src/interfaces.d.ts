/// <reference types="node" />
import { IStringFormatterVars } from "./structures/stringformatter";
import { MessageEvent, TextualMessageEventContent, FileMessageEventContent } from "@sorunome/matrix-bot-sdk";
export declare type MatrixPresence = "offline" | "online" | "unavailable";
declare type PuppetDataSingleType = string | number | boolean | IPuppetData | null | undefined;
export interface IPuppetData {
    [key: string]: PuppetDataSingleType | PuppetDataSingleType[];
}
export interface IRemoteProfile {
    avatarUrl?: string | null;
    avatarBuffer?: Buffer | null;
    downloadFile?: ((url: string) => Promise<Buffer>) | null;
    name?: string | null;
    nameVars?: IStringFormatterVars | null;
}
interface IRemoteBase extends IRemoteProfile {
    puppetId: number;
    externalUrl?: string | null;
}
export interface IRemoteUserRoomOverride extends IRemoteProfile {
}
export interface IRemoteUser extends IRemoteBase {
    userId: string;
    roomOverrides?: {
        [roomId: string]: IRemoteUserRoomOverride;
    } | null;
}
export interface IRemoteRoom extends IRemoteBase {
    roomId: string;
    topic?: string | null;
    groupId?: string | null;
    isDirect?: boolean | null;
    emotes?: (IRemoteEmote | IRemoteEmoteFragment)[] | null;
}
export interface IRemoteGroup extends IRemoteBase {
    groupId: string;
    shortDescription?: string | null;
    longDescription?: string | null;
    roomIds?: string[] | null;
}
export interface IRemoteEmoteFragment extends IRemoteProfile {
    roomId?: string | null;
    emoteId: string;
    externalUrl?: string | null;
    data?: IPuppetData | null;
}
export interface IRemoteEmote extends IRemoteBase {
    roomId?: string | null;
    emoteId: string;
    data?: IPuppetData | null;
    avatarMxc?: string | null;
}
declare type ResolvableString = string | undefined | null;
export declare type RemoteUserResolvable = IRemoteUser | ResolvableString;
export declare type RemoteRoomResolvable = RemoteUserResolvable | IRemoteRoom | ResolvableString;
export declare type RemoteGroupResolvable = RemoteRoomResolvable | IRemoteGroup | ResolvableString;
export interface IPuppetBridgeRegOpts {
    prefix: string;
    id: string;
    url: string;
    botUser?: string;
}
export interface IPuppetBridgeFeatures {
    file?: boolean;
    image?: boolean;
    audio?: boolean;
    video?: boolean;
    sticker?: boolean;
    presence?: boolean;
    typingTimeout?: number;
    edit?: boolean;
    reply?: boolean;
    advancedRelay?: boolean;
    globalNamespace?: boolean;
}
export interface IReceiveParams {
    user: IRemoteUser;
    room: IRemoteRoom;
    eventId?: string;
    externalUrl?: string;
}
export interface IMessageEvent {
    body: string;
    formattedBody?: string;
    emote?: boolean;
    notice?: boolean;
    eventId?: string;
}
export interface IPresenceEvent {
    currentlyActive?: boolean;
    lastActiveAgo?: number;
    presence: MatrixPresence;
    statusMsg?: string;
}
export interface IEventInfo {
    message?: IMessageEvent;
    file?: IFileEvent;
    event: MessageEvent<TextualMessageEventContent> | MessageEvent<FileMessageEventContent>;
    user: ISendingUser;
}
export interface IReplyEvent extends IMessageEvent {
    reply: IEventInfo;
}
export interface IFileEvent {
    filename: string;
    info?: {
        mimetype?: string;
        size?: number;
        w?: number;
        h?: number;
    };
    mxc: string;
    url: string;
    type: string;
    eventId?: string;
}
export declare type RetDataFn = (line: string) => Promise<IRetData>;
export interface IRetData {
    success: boolean;
    error?: string;
    data?: IPuppetData | Promise<IPuppetData>;
    userId?: string;
    fn?: RetDataFn;
}
export interface IRetList {
    name: string;
    id?: string;
    category?: boolean;
}
interface IProtocolInformationNamePatterns {
    user?: string;
    userOverride?: string;
    room?: string;
    group?: string;
}
export interface IProtocolInformation {
    id?: string;
    displayname?: string;
    externalUrl?: string;
    features?: IPuppetBridgeFeatures;
    namePatterns?: IProtocolInformationNamePatterns;
}
export interface ISendingUser {
    avatarMxc: string | null;
    avatarUrl: string | null;
    displayname: string;
    mxid: string;
    user: IRemoteUser | null;
}
export declare type CreateUserHook = (user: IRemoteUser) => Promise<IRemoteUser | null>;
export declare type CreateRoomHook = (room: IRemoteRoom) => Promise<IRemoteRoom | null>;
export declare type CreateGroupHook = (group: IRemoteGroup) => Promise<IRemoteGroup | null>;
export declare type UserExistsHook = (user: IRemoteUser) => Promise<boolean>;
export declare type RoomExistsHook = (room: IRemoteRoom) => Promise<boolean>;
export declare type GroupExistsHook = (group: IRemoteGroup) => Promise<boolean>;
export declare type GetDescHook = (puppetId: number, data: IPuppetData) => Promise<string>;
export declare type BotHeaderMsgHook = () => string;
export declare type GetDataFromStrHook = (str: string) => Promise<IRetData>;
export declare type GetDmRoomIdHook = (user: IRemoteUser) => Promise<string | null>;
export declare type ListUsersHook = (puppetId: number) => Promise<IRetList[]>;
export declare type ListRoomsHook = (puppetId: number) => Promise<IRetList[]>;
export declare type ListGroupsHook = (puppetId: number) => Promise<IRetList[]>;
export declare type GetUserIdsInRoomHook = (room: IRemoteRoom) => Promise<Set<string> | null>;
export declare type ResolveRoomIdHook = (ident: string) => Promise<string | null>;
export {};
