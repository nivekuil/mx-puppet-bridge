/// <reference types="node" />
import { PuppetBridge } from "./puppetbridge";
import { IRemoteUser, IReceiveParams, IMessageEvent, MatrixPresence } from "./interfaces";
export declare class RemoteEventHandler {
    private bridge;
    private ghostInviteCache;
    constructor(bridge: PuppetBridge);
    setUserPresence(user: IRemoteUser, presence: MatrixPresence): Promise<void>;
    setUserStatus(user: IRemoteUser, status: string): Promise<void>;
    setUserTyping(params: IReceiveParams, typing: boolean): Promise<void>;
    sendReadReceipt(params: IReceiveParams): Promise<void>;
    addUser(params: IReceiveParams): Promise<void>;
    removeUser(params: IReceiveParams): Promise<void>;
    sendMessage(params: IReceiveParams, opts: IMessageEvent): Promise<void>;
    sendEdit(params: IReceiveParams, eventId: string, opts: IMessageEvent, ix?: number): Promise<void>;
    sendRedact(params: IReceiveParams, eventId: string): Promise<void>;
    sendReply(params: IReceiveParams, eventId: string, opts: IMessageEvent): Promise<void>;
    sendReaction(params: IReceiveParams, eventId: string, reaction: string): Promise<void>;
    removeReaction(params: IReceiveParams, eventId: string, reaction: string): Promise<void>;
    removeAllReactions(params: IReceiveParams, eventId: string): Promise<void>;
    sendFileByType(msgtype: string, params: IReceiveParams, thing: string | Buffer, name?: string): Promise<void>;
    private maybePrepareSend;
    private prepareSend;
    private preprocessBody;
    private preprocessMessageEvent;
}
