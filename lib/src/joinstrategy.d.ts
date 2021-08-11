import { IJoinRoomStrategy } from "@sorunome/matrix-bot-sdk";
import { PuppetBridge } from "./puppetbridge";
export declare class PuppetBridgeJoinRoomStrategy implements IJoinRoomStrategy {
    private underlyingStrategy;
    private bridge;
    constructor(underlyingStrategy: IJoinRoomStrategy, bridge: PuppetBridge);
    joinRoom(roomIdOrAlias: string, userId: string, apiCall: (roomIdOrAlias: string) => Promise<string>): Promise<string>;
}
