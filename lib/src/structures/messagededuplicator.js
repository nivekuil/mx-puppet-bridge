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
const lock_1 = require("./lock");
const expire_set_1 = require("expire-set");
const DEFAULT_LOCK_TIMEOUT = 30000;
const DEFAULT_LOCK_DATA_TIMEOUT = 300000;
class MessageDeduplicator {
    constructor(lockTimeout, lockDataTimeout) {
        this.locks = new lock_1.Lock(lockTimeout || DEFAULT_LOCK_TIMEOUT);
        const ldt = lockDataTimeout || DEFAULT_LOCK_DATA_TIMEOUT;
        this.data = new expire_set_1.default(ldt);
        this.authorIds = new expire_set_1.default(ldt);
    }
    lock(roomId, authorId, message) {
        this.locks.set(roomId);
        this.authorIds.add(authorId);
        if (message) {
            this.data.add(`${roomId};${authorId};m:${message}`);
        }
    }
    unlock(roomId, authorId, eventId) {
        if (authorId) {
            this.authorIds.add(authorId);
        }
        if (authorId && eventId) {
            this.data.add(`${roomId};${authorId};e:${eventId}`);
        }
        this.locks.release(roomId);
    }
    dedupe(roomId, authorId, eventId, message, clear = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.authorIds.has(authorId)) {
                return false;
            }
            yield this.locks.wait(roomId);
            let returnValue = false;
            if (eventId) {
                const key = `${roomId};${authorId};e:${eventId}`;
                if (this.data.has(key)) {
                    if (clear) {
                        this.data.delete(key);
                    }
                    returnValue = true;
                }
            }
            if (message) {
                const key = `${roomId};${authorId};m:${message}`;
                if (this.data.has(key)) {
                    if (clear) {
                        this.data.delete(key);
                    }
                    returnValue = true;
                }
            }
            return returnValue;
        });
    }
    dispose() {
        for (const key of this.data.all) {
            this.data.delete(key);
        }
        for (const key of this.authorIds.all) {
            this.authorIds.delete(key);
        }
        this.locks.dispose();
    }
}
exports.MessageDeduplicator = MessageDeduplicator;
//# sourceMappingURL=messagededuplicator.js.map