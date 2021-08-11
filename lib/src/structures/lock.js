"use strict";
/*
Copyright 2019 mx-puppet-bridge
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class Lock {
    constructor(timeout) {
        this.timeout = timeout;
        this.locks = new Map();
        this.lockPromises = new Map();
    }
    set(key) {
        // if there is a lock set.....we don't set a second one ontop
        if (this.locks.has(key)) {
            return;
        }
        // set a dummy lock so that if we re-set again before releasing it won't do anthing
        this.locks.set(key, { i: null, r: null });
        const p = new Promise((resolve) => {
            // first we check if the lock has the key....if not, e.g. if it
            // got released too quickly, we still want to resolve our promise
            if (!this.locks.has(key)) {
                resolve();
                return;
            }
            // create the interval that will release our promise after the timeout
            const i = setTimeout(() => {
                this.release(key);
            }, this.timeout);
            // aaand store to our lock
            this.locks.set(key, { r: resolve, i });
        });
        this.lockPromises.set(key, p);
    }
    release(key) {
        // if there is nothing to release then there is nothing to release
        if (!this.locks.has(key)) {
            return;
        }
        const lock = this.locks.get(key);
        if (lock.r !== null) {
            lock.r();
        }
        if (lock.i !== null) {
            clearTimeout(lock.i);
        }
        this.locks.delete(key);
        this.lockPromises.delete(key);
    }
    wait(key) {
        return __awaiter(this, void 0, void 0, function* () {
            // we wait for a lock release only if a promise is present
            const promise = this.lockPromises.get(key);
            if (promise) {
                yield promise;
            }
        });
    }
    dispose() {
        for (const key of this.locks.keys()) {
            this.release(key);
        }
    }
}
exports.Lock = Lock;
//# sourceMappingURL=lock.js.map