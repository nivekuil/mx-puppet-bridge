import { PuppetBridge } from "./puppetbridge";
import { MessageDeduplicator } from "./structures/messagededuplicator";
export declare class TypingHandler {
    private bridge;
    private timeout;
    deduplicator: MessageDeduplicator;
    private typingUsers;
    constructor(bridge: PuppetBridge, timeout: number);
    set(mxid: string, roomId: string, typing: boolean): Promise<void>;
    private handled;
}
