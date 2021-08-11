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
const messagededuplicator_1 = require("./structures/messagededuplicator");
const log = new log_1.Log("ReactionHandler");
class ReactionHandler {
    constructor(bridge) {
        this.bridge = bridge;
        this.deduplicator = new messagededuplicator_1.MessageDeduplicator();
        this.reactionStore = this.bridge.reactionStore;
    }
    addRemote(params, eventId, key, client, mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Received reaction from ${params.user.userId} to send to ${params.room.roomId}, message ${eventId}`);
            const origEvent = (yield this.bridge.eventSync.getMatrix(params.room, eventId))[0];
            if (!origEvent) {
                log.warn("No original event found, ignoring...");
                return; // nothing to do
            }
            // okay, let's create a dummy entry and check if the reaction exists already
            const entry = {
                puppetId: params.room.puppetId,
                roomId: params.room.roomId,
                userId: params.user.userId,
                eventId,
                reactionMxid: "",
                key,
            };
            if (yield this.reactionStore.exists(entry)) {
                log.warn("Reaction already exists, ignoring...");
                return;
            }
            // this type needs to be any-type, as the interfaces don't do reactions yet
            const send = {
                "source": this.bridge.protocol.id,
                "m.relates_to": {
                    rel_type: "m.annotation",
                    event_id: origEvent.split(";")[0],
                    key,
                },
            }; // tslint:disable-line no-any
            if (params.externalUrl) {
                send.external_url = params.externalUrl;
            }
            if (key.startsWith("mxc://")) {
                send.url = key;
            }
            const matrixEventId = yield client.sendEvent(mxid, "m.reaction", send);
            if (matrixEventId && params.eventId) {
                yield this.bridge.eventSync.insert(params.room, matrixEventId, params.eventId);
            }
            // and finally save the reaction to our reaction store
            entry.reactionMxid = matrixEventId;
            yield this.reactionStore.insert(entry);
        });
    }
    removeRemote(params, eventId, key, client, mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Removing reaction from ${params.user.userId} in ${params.room.roomId}, message ${eventId}`);
            const origEvent = (yield this.bridge.eventSync.getMatrix(params.room, eventId))[0];
            if (!origEvent) {
                log.warn("No original event found, ignoring...");
                return; // nothing to do
            }
            // okay, let's fetch the reaction from the DB
            const entry = {
                puppetId: params.room.puppetId,
                roomId: params.room.roomId,
                userId: params.user.userId,
                eventId,
                reactionMxid: "",
                key,
            };
            const reaction = yield this.reactionStore.getFromKey(entry);
            if (!reaction) {
                log.warn("Reaction not found, ignoring...");
                return;
            }
            // alright, we found our reaction we need to redact!
            yield this.bridge.redactEvent(client, mxid, reaction.reactionMxid);
            // don't forget to delete it off of the DB!
            yield this.reactionStore.delete(reaction.reactionMxid);
        });
    }
    removeRemoteAllOnMessage(params, eventId, client, mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Removing all reactions from message ${eventId} in ${params.room.roomId}`);
            const origEvent = (yield this.bridge.eventSync.getMatrix(params.room, eventId))[0];
            if (!origEvent) {
                log.warn("No original event found, ignoring...");
                return; // nothing to do
            }
            const reactions = yield this.reactionStore.getForEvent(params.room.puppetId, eventId);
            for (const reaction of reactions) {
                yield this.bridge.redactEvent(client, mxid, reaction.reactionMxid);
            }
            yield this.reactionStore.deleteForEvent(params.room.puppetId, eventId);
        });
    }
    addMatrix(room, eventId, reactionMxid, key, asUser) {
        return __awaiter(this, void 0, void 0, function* () {
            const puppet = yield this.bridge.provisioner.get(room.puppetId);
            const userId = (asUser && asUser.user && asUser.user.userId) || (!asUser && puppet && puppet.userId) || null;
            if (!userId) {
                return;
            }
            log.info(`Got reaction from matrix in room ${room.roomId} to add...`);
            const entry = {
                puppetId: room.puppetId,
                roomId: room.roomId,
                userId,
                eventId,
                reactionMxid,
                key,
            };
            this.deduplicator.lock(`${room.puppetId};${room.roomId};${eventId};add`, userId, key);
            yield this.reactionStore.insert(entry);
        });
    }
    handleRedactEvent(room, event, asUser) {
        return __awaiter(this, void 0, void 0, function* () {
            const puppet = yield this.bridge.provisioner.get(room.puppetId);
            const userId = (asUser && asUser.user && asUser.user.userId) || (!asUser && puppet && puppet.userId) || "";
            for (const redacts of event.redactsEventIds) {
                const reaction = yield this.reactionStore.getFromReactionMxid(redacts);
                if (!reaction) {
                    continue;
                }
                log.info("Got redaction of reaction to processs...");
                if (reaction.roomId !== room.roomId || reaction.puppetId !== room.puppetId) {
                    log.warn("Redacted reaction isn't from our room, this is odd");
                    continue;
                }
                this.deduplicator.lock(`${room.puppetId};${room.roomId};${reaction.eventId};remove`, userId, reaction.key);
                log.debug("Emitting removeReaction event...");
                this.bridge.emit("removeReaction", room, reaction.eventId, reaction.key, asUser, event);
                // and finally delete it off of the DB
                yield this.reactionStore.delete(reaction.reactionMxid);
            }
        });
    }
}
exports.ReactionHandler = ReactionHandler;
//# sourceMappingURL=reactionhandler.js.map