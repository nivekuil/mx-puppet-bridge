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
const log_1 = require("./log");
const log = new log_1.Log("EventSyncroniser");
class EventSyncroniser {
    constructor(bridge) {
        this.bridge = bridge;
        this.eventStore = this.bridge.eventStore;
    }
    insert(room, matrixId, remoteId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (remoteId) {
                const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(room.puppetId);
                yield this.eventStore.insert(dbPuppetId, room.roomId, matrixId, remoteId);
            }
            // we have registered this event, so we might as well mark it as read
            try {
                const roomId = yield this.bridge.roomSync.maybeGetMxid(room);
                if (roomId) {
                    yield this.bridge.botIntent.underlyingClient.sendReadReceipt(roomId, matrixId);
                }
            }
            catch (err) {
                log.silly("Failed to send read reciept", err);
            }
        });
    }
    remove(room, remoteId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(room.puppetId);
            yield this.eventStore.remove(dbPuppetId, room.roomId, remoteId);
        });
    }
    getMatrix(room, remoteId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(room.puppetId);
            return yield this.eventStore.getMatrix(dbPuppetId, room.roomId, remoteId);
        });
    }
    getRemote(room, matrixId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(room.puppetId);
            return yield this.eventStore.getRemote(dbPuppetId, room.roomId, matrixId);
        });
    }
}
exports.EventSyncroniser = EventSyncroniser;
//# sourceMappingURL=eventsyncroniser.js.map