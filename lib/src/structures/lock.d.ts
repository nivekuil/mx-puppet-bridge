export declare class Lock<T> {
    private timeout;
    private locks;
    private lockPromises;
    constructor(timeout: number);
    set(key: T): void;
    release(key: T): void;
    wait(key: T): Promise<void>;
    dispose(): void;
}
