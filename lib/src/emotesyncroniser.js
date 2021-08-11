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
const util_1 = require("./util");
const log_1 = require("./log");
const lock_1 = require("./structures/lock");
const log = new log_1.Log("EmoteSync");
// tslint:disable-next-line:no-magic-numbers
const EMOTE_SET_LOCK_TIMEOUT = 1000 * 60;
class EmoteSyncroniser {
    constructor(bridge) {
        this.bridge = bridge;
        this.emoteStore = this.bridge.store.emoteStore;
        this.emoteSetLock = new lock_1.Lock(EMOTE_SET_LOCK_TIMEOUT);
    }
    set(data, updateRoom = true) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Setting new emote ${data.emoteId} in ${data.roomId}...`);
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(data.puppetId);
            const lockKey = `${dbPuppetId};${data.roomId};${data.emoteId}`;
            this.emoteSetLock.set(lockKey);
            try {
                let emote = yield this.emoteStore.get(dbPuppetId, data.roomId || null, data.emoteId);
                if (!emote) {
                    // okay, we need to create a new one
                    emote = this.emoteStore.newData(dbPuppetId, data.roomId || null, data.emoteId);
                }
                const updateProfile = yield util_1.Util.ProcessProfileUpdate(emote, data, this.bridge.protocol.namePatterns.emote, (buffer, mimetype, filename) => __awaiter(this, void 0, void 0, function* () {
                    return yield this.bridge.uploadContent(null, buffer, mimetype, filename);
                }));
                emote = Object.assign(emote, updateProfile);
                if (data.data) {
                    emote.data = data.data;
                }
                const doUpdate = updateProfile.hasOwnProperty("name") || updateProfile.hasOwnProperty("avatarMxc");
                if (doUpdate) {
                    yield this.emoteStore.set(emote);
                }
                if (updateRoom && doUpdate && data.roomId) {
                    yield this.updateRoom(data);
                }
                this.emoteSetLock.release(lockKey);
                return {
                    emote,
                    update: doUpdate,
                };
            }
            catch (err) {
                log.error("Error updating emote:", err.error || err.body || err);
                this.emoteSetLock.release(lockKey);
                throw err;
            }
        });
    }
    get(search) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(search.puppetId);
            let emote = yield this.emoteStore.get(dbPuppetId, search.roomId || null, search.emoteId);
            if (emote) {
                return emote;
            }
            if (search.roomId) {
                emote = yield this.emoteStore.get(dbPuppetId, null, search.emoteId);
                return emote;
            }
            return null;
        });
    }
    getByMxc(roomOrPuppet, mxc) {
        return __awaiter(this, void 0, void 0, function* () {
            let puppetId;
            let roomId = null;
            if (typeof roomOrPuppet === "number") {
                puppetId = roomOrPuppet;
            }
            else {
                puppetId = roomOrPuppet.puppetId;
                roomId = roomOrPuppet.roomId;
            }
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(puppetId);
            let emote = yield this.emoteStore.getByMxc(dbPuppetId, roomId, mxc);
            if (emote) {
                return emote;
            }
            if (roomId) {
                emote = yield this.emoteStore.getByMxc(dbPuppetId, null, mxc);
                return emote;
            }
            return null;
        });
    }
    setMultiple(emotes) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateRooms = new Map();
            for (const emote of emotes) {
                const { update } = yield this.set(emote, false);
                if (update && emote.roomId) {
                    updateRooms.set(`${emote.puppetId};${emote.roomId}`, emote);
                }
            }
            for (const [, room] of updateRooms) {
                yield this.updateRoom(room);
            }
        });
    }
    updateRoom(room) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Updating emote state event in ${room.roomId}...`);
            const roomId = yield this.bridge.roomSync.maybeGetMxid(room);
            if (!roomId) {
                log.warn("No room ID found, this is odd");
                return;
            }
            const client = yield this.bridge.roomSync.getRoomOp(roomId);
            if (!client) {
                log.warn("No OP client found, this is odd");
                return;
            }
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(room.puppetId);
            const emotes = yield this.emoteStore.getForRoom(dbPuppetId, room.roomId);
            const stateEventContent = {
                images: {},
                pack: {
                    usage: ["emoticon"],
                },
            };
            for (const e of emotes) {
                if (e.name && e.avatarMxc) {
                    const name = e.name[0] === ":" && e.name[e.name.length - 1] === ":"
                        ? e.name.substring(1, e.name.length - 1)
                        : e.name;
                    stateEventContent.images[name] = { url: e.avatarMxc };
                }
            }
            yield client.sendStateEvent(roomId, "im.ponies.room_emotes", "", stateEventContent);
        });
    }
}
exports.EmoteSyncroniser = EmoteSyncroniser;
//# sourceMappingURL=emotesyncroniser.js.map