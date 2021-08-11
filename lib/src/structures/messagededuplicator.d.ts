export declare class MessageDeduplicator {
    private locks;
    private lockDataTimeout;
    private data;
    private authorIds;
    constructor(lockTimeout?: number, lockDataTimeout?: number);
    lock(roomId: string, authorId: string, message?: string): void;
    unlock(roomId: string, authorId?: string, eventId?: string): void;
    dedupe(roomId: string, authorId: string, eventId?: string, message?: string, clear?: boolean): Promise<boolean>;
    dispose(): void;
}
