import { PuppetBridge } from "./puppetbridge";
import { IRemoteEmote, IRemoteRoom } from "./interfaces";
export declare class EmoteSyncroniser {
    private bridge;
    private emoteStore;
    private emoteSetLock;
    constructor(bridge: PuppetBridge);
    set(data: IRemoteEmote, updateRoom?: boolean): Promise<{
        emote: IRemoteEmote;
        update: boolean;
    }>;
    get(search: IRemoteEmote): Promise<IRemoteEmote | null>;
    getByMxc(roomOrPuppet: IRemoteRoom | number, mxc: string): Promise<IRemoteEmote | null>;
    setMultiple(emotes: IRemoteEmote[]): Promise<void>;
    updateRoom(room: IRemoteRoom): Promise<void>;
}
