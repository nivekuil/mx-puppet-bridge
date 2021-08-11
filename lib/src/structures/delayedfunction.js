"use strict";
/*
Copyright 2020 mx-puppet-bridge
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
class DelayedFunction {
    constructor() {
        this.map = new Map();
    }
    set(key, fn, timeout, clearOldTimer = true) {
        if (clearOldTimer) {
            // clear the old timeout
            this.release(key);
        }
        else if (this.map.has(key)) {
            return;
        }
        // set the new timeout
        const i = setTimeout(() => {
            this.map.delete(key);
            fn();
        }, timeout);
        this.map.set(key, i);
    }
    release(key) {
        if (!this.map.has(key)) {
            return;
        }
        clearTimeout(this.map.get(key));
        this.map.delete(key);
    }
}
exports.DelayedFunction = DelayedFunction;
//# sourceMappingURL=delayedfunction.js.map