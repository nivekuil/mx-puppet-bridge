"use strict";
/*
Copyright 2019, 2020 mx-puppet-bridge
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
const log_1 = require("./log");
const expire_set_1 = require("expire-set");
const messagededuplicator_1 = require("./structures/messagededuplicator");
const log = new log_1.Log("TypingHandler");
class TypingHandler {
    constructor(bridge, timeout) {
        this.bridge = bridge;
        this.timeout = timeout;
        this.deduplicator = new messagededuplicator_1.MessageDeduplicator();
        this.typingUsers = new expire_set_1.default(this.timeout);
    }
    set(mxid, roomId, typing) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.handled(mxid)) {
                return;
            }
            log.verbose(`Updating typing for ${mxid} in room ${roomId} to ${typing}`);
            const key = `${mxid};${roomId}`;
            if (typing) {
                this.typingUsers.add(key);
            }
            else {
                if (!this.typingUsers.has(key)) {
                    // we weren't typing anyways
                    return;
                }
                this.typingUsers.delete(key);
            }
            try {
                const intent = this.bridge.AS.getIntentForUserId(mxid);
                yield intent.ensureRegistered();
                const mxidEnc = encodeURIComponent(mxid);
                const roomIdEnc = encodeURIComponent(roomId);
                const url = `/_matrix/client/r0/rooms/${roomIdEnc}/typing/${mxidEnc}`;
                yield intent.underlyingClient.doRequest("PUT", url, null, {
                    typing,
                    timeout: this.timeout,
                });
            }
            catch (err) {
                log.warn("Failed to update typing:", err.error || err.body || err);
            }
        });
    }
    handled(mxid) {
        return this.bridge.AS.isNamespacedUser(mxid) && mxid !== this.bridge.botIntent.userId;
    }
}
exports.TypingHandler = TypingHandler;
//# sourceMappingURL=typinghandler.js.map