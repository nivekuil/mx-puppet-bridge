export declare class TimedCache<K, V> implements Map<K, V> {
    private readonly liveFor;
    private readonly map;
    constructor(liveFor: number);
    clear(): void;
    delete(key: K): boolean;
    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void | Promise<void>): void;
    get(key: K): V | undefined;
    has(key: K): boolean;
    set(key: K, value: V): this;
    get size(): number;
    [Symbol.iterator](): IterableIterator<[K, V]>;
    entries(): IterableIterator<[K, V]>;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    get [Symbol.toStringTag](): "Map";
    private filterV;
}
