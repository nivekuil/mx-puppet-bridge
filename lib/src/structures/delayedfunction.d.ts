declare type DelayedFunctionFn = () => void | Promise<void>;
export declare class DelayedFunction {
    private readonly map;
    constructor();
    set(key: string, fn: DelayedFunctionFn, timeout: number, clearOldTimer?: boolean): void;
    release(key: string): void;
}
export {};
