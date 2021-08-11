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
const log = new log_1.Log("joinStrategy");
class PuppetBridgeJoinRoomStrategy {
    constructor(underlyingStrategy, bridge) {
        this.underlyingStrategy = underlyingStrategy;
        this.bridge = bridge;
    }
    joinRoom(roomIdOrAlias, userId, apiCall) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield apiCall(roomIdOrAlias);
            }
            catch (err) {
                log.info("Attempting join strategy...");
                let haveBotClient = false;
                let client = null;
                try {
                    client = yield this.bridge.roomSync.getRoomOp(roomIdOrAlias);
                }
                catch (err) {
                    // as we might use this in migrations, we can't rely on roomSync already existing
                    // what we can rely on, however, is the store itself already existing.
                    // so we'll use that
                    const clientMxid = yield this.bridge.store.roomStore.getRoomOp(roomIdOrAlias);
                    if (clientMxid && this.bridge.AS.isNamespacedUser(clientMxid)) {
                        client = this.bridge.AS.getIntentForUserId(clientMxid).underlyingClient;
                    }
                }
                if (!client) {
                    haveBotClient = true;
                    client = this.bridge.botIntent.underlyingClient;
                }
                const roomId = yield client.resolveRoom(roomIdOrAlias);
                if (haveBotClient) {
                    client = yield this.bridge.roomSync.getRoomOp(roomId);
                    if (!client) {
                        client = this.bridge.botIntent.underlyingClient;
                    }
                }
                yield client.inviteUser(userId, roomId);
                if (this.underlyingStrategy) {
                    return this.underlyingStrategy.joinRoom(roomId, userId, apiCall);
                }
                else {
                    return apiCall(roomId);
                }
            }
        });
    }
}
exports.PuppetBridgeJoinRoomStrategy = PuppetBridgeJoinRoomStrategy;
//# sourceMappingURL=joinstrategy.js.map