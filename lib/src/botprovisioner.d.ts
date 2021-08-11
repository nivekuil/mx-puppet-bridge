import { PuppetBridge } from "./puppetbridge";
import { IRemoteRoom } from "./interfaces";
import { MessageEvent, TextualMessageEventContent } from "@sorunome/matrix-bot-sdk";
export declare type SendMessageFn = (s: string) => Promise<void>;
export declare type PidCommandFn = (pid: number, param: string, sendMessage: SendMessageFn) => Promise<void>;
declare type FullCommandFnSingle = (sender: string, param: string, sendMessage: SendMessageFn) => Promise<void>;
declare type FullCommandFnRoom = (sender: string, param: string, sendMessage: SendMessageFn, roomId?: string) => Promise<void>;
export declare type FullCommandFn = FullCommandFnSingle | FullCommandFnRoom;
export interface ICommand {
    fn: PidCommandFn | FullCommandFn;
    help: string;
    withPid?: boolean;
    inRoom?: boolean;
}
export declare class BotProvisioner {
    private bridge;
    private provisioner;
    private fnCollectListeners;
    private commands;
    constructor(bridge: PuppetBridge);
    processEvent(roomId: string, event: MessageEvent<TextualMessageEventContent>): Promise<void>;
    processRoomEvent(roomId: string, event: MessageEvent<TextualMessageEventContent>): Promise<void>;
    sendStatusMessage(room: number | IRemoteRoom, msg: string): Promise<void>;
    registerCommand(name: string, command: ICommand): void;
    private registerDefaultCommands;
    private sendMessage;
}
export {};
