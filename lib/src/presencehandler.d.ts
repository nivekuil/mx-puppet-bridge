import { PuppetBridge } from "./puppetbridge";
import { PresenceConfig } from "./config";
import { MatrixPresence } from "./interfaces";
export declare class PresenceHandler {
    private bridge;
    private config;
    private presenceQueue;
    private interval;
    constructor(bridge: PuppetBridge, config: PresenceConfig);
    get queueCount(): number;
    start(): Promise<void>;
    stop(): void;
    set(mxid: string, presence: MatrixPresence): void;
    setStatus(mxid: string, status: string): void;
    setStatusInRoom(mxid: string, roomId: string): void;
    remove(mxid: string): void;
    private queueIndex;
    private handled;
    private processIntervalThread;
    private setMatrixPresence;
    private setMatrixStatus;
    private setMatrixStatusInRoom;
}
