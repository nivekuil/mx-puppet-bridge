import { PuppetBridge } from "./puppetbridge";
import { IRemoteRoom, IReceiveParams, ISendingUser } from "./interfaces";
import { MatrixClient, RedactionEvent } from "@sorunome/matrix-bot-sdk";
import { MessageDeduplicator } from "./structures/messagededuplicator";
export declare class ReactionHandler {
    private bridge;
    deduplicator: MessageDeduplicator;
    private reactionStore;
    constructor(bridge: PuppetBridge);
    addRemote(params: IReceiveParams, eventId: string, key: string, client: MatrixClient, mxid: string): Promise<void>;
    removeRemote(params: IReceiveParams, eventId: string, key: string, client: MatrixClient, mxid: string): Promise<void>;
    removeRemoteAllOnMessage(params: IReceiveParams, eventId: string, client: MatrixClient, mxid: string): Promise<void>;
    addMatrix(room: IRemoteRoom, eventId: string, reactionMxid: string, key: string, asUser: ISendingUser | null): Promise<void>;
    handleRedactEvent(room: IRemoteRoom, event: RedactionEvent, asUser: ISendingUser | null): Promise<void>;
}
