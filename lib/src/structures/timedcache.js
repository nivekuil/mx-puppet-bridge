"use strict";
/*
Copyright 2019 matrix-appservice-discord
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
Object.defineProperty(exports, "__esModule", { value: true });
class TimedCache {
    constructor(liveFor) {
        this.liveFor = liveFor;
        this.map = new Map();
    }
    clear() {
        this.map.clear();
    }
    delete(key) {
        return this.map.delete(key);
    }
    forEach(callbackfn) {
        for (const item of this) {
            callbackfn(item[1], item[0], this);
        }
    }
    get(key) {
        const v = this.map.get(key);
        if (v === undefined) {
            return;
        }
        const val = this.filterV(v);
        if (val !== undefined) {
            return val;
        }
        // Cleanup expired key
        this.map.delete(key);
    }
    has(key) {
        return this.get(key) !== undefined;
    }
    set(key, value) {
        this.map.set(key, {
            ts: Date.now(),
            value,
        });
        return this;
    }
    get size() {
        return this.map.size;
    }
    [Symbol.iterator]() {
        let iterator;
        return {
            next: () => {
                if (!iterator) {
                    iterator = this.map.entries();
                }
                let item;
                let filteredValue;
                // Loop if we have no item, or the item has expired.
                while (!item || filteredValue === undefined) {
                    item = iterator.next();
                    // No more items in map. Bye bye.
                    if (item.done) {
                        break;
                    }
                    filteredValue = this.filterV(item.value[1]);
                }
                if (item.done) {
                    // Typscript doesn't like us returning undefined for value, which is dumb.
                    // tslint:disable-next-line: no-any
                    return { done: true, value: undefined };
                }
                return { done: false, value: [item.value[0], filteredValue] };
            },
            [Symbol.iterator]: () => this[Symbol.iterator](),
        };
    }
    entries() {
        return this[Symbol.iterator]();
    }
    keys() {
        throw new Error("Method not implemented.");
    }
    values() {
        throw new Error("Method not implemented.");
    }
    get [Symbol.toStringTag]() {
        return "Map";
    }
    filterV(v) {
        if (Date.now() - v.ts < this.liveFor) {
            return v.value;
        }
    }
}
exports.TimedCache = TimedCache;
//# sourceMappingURL=timedcache.js.map