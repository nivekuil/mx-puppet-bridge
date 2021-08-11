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
const matrix_bot_sdk_1 = require("@sorunome/matrix-bot-sdk");
const escapeHtml = require("escape-html");
const prometheus = require("prom-client");
const log = new log_1.Log("MatrixEventHandler");
// tslint:disable no-magic-numbers
const GHOST_PUPPET_LEAVE_TIMEOUT = 1000 * 60 * 60;
const AVATAR_SIZE = 800;
// tslint:enable no-magic-numbers
class MatrixEventHandler {
    constructor(bridge) {
        this.bridge = bridge;
        this.typingCache = new Map();
        this.memberInfoCache = {};
        this.bridge.metrics.matrixEvent = new prometheus.Counter({
            name: "bridge_matrix_events_total",
            help: "Total matrix events bridged to the remote network, by protocol and type",
            labelNames: ["protocol", "type"],
        });
        this.bridge.metrics.matrixEventBucket = new prometheus.Histogram({
            name: "bridge_matrix_event_seconds",
            help: "Time spent processing matrix events in seconds, by protocol",
            labelNames: ["protocol", "type"],
            // tslint:disable-next-line no-magic-numbers
            buckets: [0.002, 0.005, 0.01, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 7, 10],
        });
        this.bridge.metrics.matrixEventError = new prometheus.Counter({
            name: "bridge_matrix_event_errors_total",
            help: "Errors encountered during matrix event processing",
            labelNames: ["protocol"],
        });
    }
    registerAppserviceEvents() {
        // tslint:disable-next-line no-any
        this.bridge.AS.on("room.event", (roomId, rawEvent) => __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.bridge.metrics.matrixEventBucket.startTimer({
                protocol: this.bridge.protocol.id,
                type: "room.event",
            });
            try {
                yield this.handleRoomEvent(roomId, new matrix_bot_sdk_1.RoomEvent(rawEvent));
            }
            catch (err) {
                log.error("Error handling appservice room.event", err.error || err.body || err);
                this.bridge.metrics.matrixEventError.inc({ protocol: this.bridge.protocol.id });
            }
            finally {
                stopTimer();
            }
        }));
        // tslint:disable-next-line no-any
        this.bridge.AS.on("room.invite", (roomId, rawEvent) => __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.bridge.metrics.matrixEventBucket.startTimer({
                protocol: this.bridge.protocol.id,
                type: "room.invite",
            });
            try {
                yield this.handleInviteEvent(roomId, new matrix_bot_sdk_1.MembershipEvent(rawEvent));
            }
            catch (err) {
                log.error("Error handling appservice room.invite", err.error || err.body || err);
                this.bridge.metrics.matrixEventError.inc({ protocol: this.bridge.protocol.id });
            }
            finally {
                stopTimer();
            }
        }));
        // tslint:disable-next-line no-any
        this.bridge.AS.on("query.room", (alias, createRoom) => __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.bridge.metrics.matrixEventBucket.startTimer({
                protocol: this.bridge.protocol.id,
                type: "query.room",
            });
            try {
                yield this.handleRoomQuery(alias, createRoom);
            }
            catch (err) {
                this.bridge.metrics.matrixEventError.inc({ protocol: this.bridge.protocol.id });
                log.error("Error handling appservice query.room", err.error || err.body || err);
            }
            finally {
                stopTimer();
            }
        }));
        // tslint:disable-next-line no-any
        this.bridge.AS.on("ephemeral.event", (rawEvent) => __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.bridge.metrics.matrixEventBucket.startTimer({
                protocol: this.bridge.protocol.id,
                type: "ephemeral.event",
            });
            try {
                switch (rawEvent.type) {
                    case "m.presence":
                        yield this.handlePresence(rawEvent);
                        break;
                    case "m.typing":
                        yield this.handleTyping(rawEvent.room_id, rawEvent);
                        break;
                    case "m.receipt":
                        yield this.handleReceipt(rawEvent.room_id, rawEvent);
                        break;
                }
            }
            catch (err) {
                log.error("Error handling appservice ephemeral.event", err.error || err.body || err);
            }
            stopTimer();
        }));
    }
    getEventInfo(roomId, eventId, client, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!client) {
                    client = yield this.bridge.roomSync.getRoomOp(roomId);
                }
                if (!client) {
                    log.error(`Failed fetching event in room ${roomId}: no client`);
                    return null;
                }
                const rawEvent = yield client.getEvent(roomId, eventId);
                if (!rawEvent) {
                    return null;
                }
                const evt = new matrix_bot_sdk_1.MessageEvent(rawEvent);
                const info = {
                    user: (yield this.getSendingUser(true, roomId, evt.sender, sender)),
                    event: evt,
                };
                if (["m.file", "m.image", "m.audio", "m.sticker", "m.video"].includes(this.getMessageType(evt))) {
                    // file event
                    const replyEvent = new matrix_bot_sdk_1.MessageEvent(evt.raw);
                    info.event = replyEvent;
                    info.file = this.getFileEventData(replyEvent);
                }
                else {
                    // message event
                    const replyEvent = new matrix_bot_sdk_1.MessageEvent(evt.raw);
                    info.event = replyEvent;
                    info.message = this.getMessageEventData(replyEvent);
                }
                return info;
            }
            catch (err) {
                log.error(`Event ${eventId} in room ${roomId} not found`, err.error || err.body || err);
                return null;
            }
        });
    }
    handleRoomEvent(roomId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event.type === "m.room.member") {
                const membershipEvent = new matrix_bot_sdk_1.MembershipEvent(event.raw);
                this.bridge.metrics.matrixEvent.inc({
                    protocol: this.bridge.protocol.id,
                    type: `${event.type}.${membershipEvent.membership}`,
                });
                switch (membershipEvent.membership) {
                    case "join":
                        yield this.handleJoinEvent(roomId, membershipEvent);
                        return;
                    case "ban":
                    case "leave":
                        yield this.handleLeaveEvent(roomId, membershipEvent);
                        return;
                }
                return;
            }
            if (event.type === "m.room.redaction") {
                const evt = new matrix_bot_sdk_1.RedactionEvent(event.raw);
                yield this.handleRedactEvent(roomId, evt);
                this.bridge.metrics.matrixEvent.inc({
                    protocol: this.bridge.protocol.id,
                    type: event.type,
                });
                return;
            }
            // we handle stickers and reactions as message events
            if (["m.reaction", "m.sticker", "m.room.message"].includes(event.type)) {
                const evt = new matrix_bot_sdk_1.MessageEvent(event.raw);
                yield this.handleMessageEvent(roomId, evt);
                return;
            }
        });
    }
    handleJoinEvent(roomId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = event.membershipFor;
            if (this.bridge.AS.isNamespacedUser(userId)) {
                yield this.handleGhostJoinEvent(roomId, event);
            }
            else {
                yield this.handleUserJoinEvent(roomId, event);
            }
        });
    }
    handleGhostJoinEvent(roomId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            // if we were already membership "join" we just changed avatar / displayname
            if ((event.raw.prev_content || event.unsigned.prev_content || {}).membership === "join") {
                return;
            }
            const ghostId = event.membershipFor;
            log.info(`Got new ghost join event from ${ghostId} in ${roomId}...`);
            // we CAN'T check for if the room exists here, as if we create a new room
            // the m.room.member event triggers before the room is incerted into the store
            log.verbose("Adding ghost to room cache");
            yield this.bridge.puppetStore.joinGhostToRoom(ghostId, roomId);
            this.bridge.presenceHandler.setStatusInRoom(ghostId, roomId);
            // apply room-specific overrides, if present
            // as we use these parts only for setting the room overrides, which translate back to -1 anyways
            // we do not need to go via the namespace handler
            const ghostParts = this.bridge.userSync.getPartsFromMxid(ghostId);
            const roomParts = yield this.bridge.roomSync.getPartsFromMxid(roomId);
            log.verbose("Ghost parts:", ghostParts);
            log.verbose("Room parts:", roomParts);
            if (ghostParts && roomParts && roomParts.puppetId === ghostParts.puppetId) {
                log.verbose("Maybe applying room overrides");
                yield this.bridge.userSync.setRoomOverride(ghostParts, roomParts.roomId);
            }
            // maybe remove the bot user, if it is present and we are in a direct message room
            if (roomParts) {
                const room = yield this.bridge.roomSync.maybeGet(roomParts);
                if (room && room.isDirect) {
                    yield this.bridge.roomSync.maybeLeaveGhost(roomId, this.bridge.AS.botIntent.userId);
                }
            }
        });
    }
    handleUserJoinEvent(roomId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = event.membershipFor;
            log.info(`Got new user join event from ${userId} in ${roomId}...`);
            try {
                yield this.bridge.provisioner.adjustMute(userId, roomId);
            }
            catch (err) {
                log.error("Error checking mute status", err.error || err.body || err);
            }
            const room = yield this.getRoomParts(roomId, event.sender);
            if (!room) {
                log.verbose("Room not found, ignoring...");
                return; // this isn't a room we handle, just ignore it
            }
            // okay, let's update the member info cache
            this.updateCachedRoomMemberInfo(roomId, userId, event.content);
            const puppetMxid = yield this.bridge.provisioner.getMxid(room.puppetId);
            if (userId !== puppetMxid) {
                log.verbose("Room membership change wasn't the puppet, ignoring...");
                return; // it wasn't us
            }
            log.verbose(`Received profile change for ${puppetMxid}`);
            const puppet = yield this.bridge.puppetStore.getOrCreateMxidInfo(puppetMxid);
            const newName = event.content.displayname || "";
            const newAvatarMxc = event.content.avatar_url || "";
            let update = false;
            if (newName !== puppet.name) {
                const puppets = yield this.bridge.provisioner.getForMxid(puppetMxid);
                for (const p of puppets) {
                    log.verbose("Emitting puppetName event...");
                    this.bridge.emit("puppetName", p.puppetId, newName);
                }
                puppet.name = newName;
                update = true;
            }
            if (newAvatarMxc !== puppet.avatarMxc) {
                const url = this.bridge.getUrlFromMxc(newAvatarMxc, AVATAR_SIZE, AVATAR_SIZE, "scale");
                const puppets = yield this.bridge.provisioner.getForMxid(puppetMxid);
                for (const p of puppets) {
                    log.verbose("Emitting puppetAvatar event...");
                    this.bridge.emit("puppetAvatar", p.puppetId, url, newAvatarMxc);
                }
                puppet.avatarMxc = newAvatarMxc;
                update = true;
            }
            if (update) {
                yield this.bridge.puppetStore.setMxidInfo(puppet);
            }
        });
    }
    handleLeaveEvent(roomId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = event.membershipFor;
            log.info(`Got leave event from ${userId} in ${roomId}`);
            if (this.bridge.AS.isNamespacedUser(userId)) {
                log.verbose("Is a ghost, removing from room cache...");
                yield this.bridge.puppetStore.leaveGhostFromRoom(userId, roomId);
                return;
            }
        });
    }
    handleRedactEvent(roomId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Got new redact from ${event.sender} in ${roomId}...`);
            if (this.bridge.AS.isNamespacedUser(event.sender)) {
                log.verbose("It was our own redact, ignoring...");
                return; // we don't handle things from our own namespace
            }
            const room = yield this.getRoomParts(roomId, event.sender);
            if (!room) {
                log.verbose("Room not found, ignoring...");
                return;
            }
            const puppetData = yield this.bridge.provisioner.get(room.puppetId);
            if (!puppetData) {
                log.error("Puppet not found. Something is REALLY wrong!!!!");
                return;
            }
            const puppetMxid = puppetData.puppetMxid;
            if (puppetData.type === "relay") {
                if (!this.bridge.provisioner.canRelay(event.sender)) {
                    log.verbose("Redact wasn't from a relay-able person, ignoring...");
                    return;
                }
            }
            else if (event.sender !== puppetMxid) {
                log.verbose("Redact wasn't by the pupperted user, ignoring...");
                return; // this isn't our puppeted user, so let's not do anything
            }
            // tslint:disable-next-line no-any
            if (event.content.source === this.bridge.protocol.id) {
                log.verbose("Dropping event due to de-duping...");
                return;
            }
            const asUser = yield this.getSendingUser(puppetData, roomId, event.sender);
            // handle reation redactions
            if (puppetData.type !== "relay" || this.bridge.protocol.features.advancedRelay) {
                yield this.bridge.reactionHandler.handleRedactEvent(room, event, asUser);
            }
            for (const redacts of event.redactsEventIds) {
                const eventIds = yield this.bridge.eventSync.getRemote(room, redacts);
                for (const eventId of eventIds) {
                    log.verbose("Emitting redact event...");
                    this.bridge.emit("redact", room, eventId, asUser, event);
                }
            }
        });
    }
    handleMessageEvent(roomId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.bridge.AS.isNamespacedUser(event.sender)) {
                return; // we don't handle things from our own namespace
            }
            const room = yield this.getRoomParts(roomId, event.sender);
            if (!room) {
                // this isn't a room we handle....so let's do provisioning!
                yield this.bridge.botProvisioner.processEvent(roomId, event);
                return;
            }
            log.info(`Got new message in ${roomId} from ${event.sender}!`);
            const puppetData = yield this.bridge.provisioner.get(room.puppetId);
            if (!puppetData) {
                log.error("Puppet not found. Something is REALLY wrong!!!!");
                return;
            }
            const puppetMxid = puppetData.puppetMxid;
            // check if we should bridge this room and/or if to apply relay formatting
            if (puppetData.type === "relay") {
                if (!this.bridge.provisioner.canRelay(event.sender)) {
                    log.verbose("Message wasn't sent from a relay-able person, dropping...");
                    return;
                }
                if (!this.bridge.protocol.features.advancedRelay) {
                    yield this.applyRelayFormatting(roomId, event.sender, event.content);
                }
            }
            else if (event.sender !== puppetMxid) {
                log.verbose("Message wasn't sent from the correct puppet, dropping...");
                return;
            }
            // maybe trigger a leave for our ghost puppet in the room
            const ghostMxid = yield this.bridge.getMxidForUser({
                userId: puppetData ? puppetData.userId || "" : "",
                puppetId: room.puppetId,
            }, false);
            const delayedKey = `${ghostMxid}_${roomId}`;
            this.bridge.delayedFunction.set(delayedKey, () => __awaiter(this, void 0, void 0, function* () {
                yield this.bridge.roomSync.maybeLeaveGhost(roomId, ghostMxid);
            }), GHOST_PUPPET_LEAVE_TIMEOUT, false);
            // we use a custom property "source" on the content
            // tslint:disable-next-line no-any
            if (event.content.source === this.bridge.protocol.id) {
                log.verbose("Dropping event due to de-duping...");
                return;
            }
            const msgtype = this.getMessageType(event);
            if (msgtype === "m.text" && event.textBody.startsWith(`!${this.bridge.protocol.id} `)) {
                yield this.bridge.botProvisioner.processRoomEvent(roomId, event);
                return;
            }
            // alright, let's register, that this channel is used!
            // while, in theory, we would also need to do this for redactions or thelike
            // it seems to be sufficient to do it here.
            // we an do this in the background, so no need to await here
            // tslint:disable-next-line no-floating-promises
            this.bridge.roomSync.markAsUsed(room);
            if (["m.file", "m.image", "m.audio", "m.sticker", "m.video"].includes(msgtype)) {
                yield this.handleFileEvent(roomId, room, puppetData, new matrix_bot_sdk_1.MessageEvent(event.raw));
            }
            else {
                yield this.handleTextEvent(roomId, room, puppetData, new matrix_bot_sdk_1.MessageEvent(event.raw));
            }
            this.bridge.metrics.matrixEvent.inc({
                protocol: this.bridge.protocol.id,
                type: msgtype,
            });
        });
    }
    getFileEventData(event) {
        const msgtype = this.getMessageType(event);
        const content = event.content;
        const url = this.bridge.getUrlFromMxc(content.url);
        const data = {
            filename: content.body || "",
            mxc: content.url,
            url,
            eventId: event.eventId,
            type: "file",
        };
        if (content.info) {
            data.info = content.info;
        }
        data.type = {
            "m.image": "image",
            "m.audio": "audio",
            "m.video": "video",
            "m.sticker": "sticker",
        }[msgtype];
        if (!data.type) {
            data.type = "file";
        }
        return data;
    }
    handleFileEvent(roomId, room, puppetData, event) {
        return __awaiter(this, void 0, void 0, function* () {
            const msgtype = this.getMessageType(event);
            log.info(`Handling file event with msgtype ${msgtype}...`);
            const data = this.getFileEventData(event);
            const emitEvent = data.type;
            const asUser = yield this.getSendingUser(puppetData, roomId, event.sender);
            // alright, now determine fallbacks etc.
            if (this.bridge.protocol.features[emitEvent]) {
                log.debug(`Emitting as ${emitEvent}...`);
                this.bridge.emit(emitEvent, room, data, asUser, event);
                return;
            }
            // send stickers as images
            if (emitEvent === "sticker" && this.bridge.protocol.features.image) {
                log.debug("Emitting as image...");
                this.bridge.emit("image", room, data, asUser, event);
                return;
            }
            // and finally send anything as file
            if (this.bridge.protocol.features.file) {
                log.debug("Emitting as file...");
                this.bridge.emit("file", room, data, asUser, event);
                return;
            }
            // okay, we need a fallback to sending text
            log.debug("Emitting as text fallback...");
            const textData = {
                body: `New ${emitEvent}: ${data.url}`,
                emote: false,
                eventId: event.eventId,
            };
            this.bridge.emit("message", room, textData, asUser, event);
        });
    }
    getMessageEventData(event) {
        const msgtype = this.getMessageType(event);
        const content = event.content;
        const msgData = {
            body: content.body || "",
            emote: msgtype === "m.emote",
            notice: msgtype === "m.notice",
            eventId: event.eventId,
        };
        if (content.format) {
            msgData.formattedBody = content.formatted_body;
        }
        return msgData;
    }
    handleTextEvent(roomId, room, puppetData, event) {
        return __awaiter(this, void 0, void 0, function* () {
            const msgtype = this.getMessageType(event);
            log.info(`Handling text event with msgtype ${msgtype}...`);
            const msgData = this.getMessageEventData(event);
            const relate = event.content["m.relates_to"]; // there is no relates_to interface yet :[
            const asUser = yield this.getSendingUser(puppetData, roomId, event.sender);
            if (relate) {
                // it only makes sense to process with relation if it is associated with a remote id
                const eventId = relate.event_id || relate["m.in_reply_to"].event_id;
                const relEvent = (yield this.bridge.eventSync.getRemote(room, eventId))[0];
                if (relEvent) {
                    if (this.bridge.protocol.features.edit && relate.rel_type === "m.replace") {
                        const newContent = event.content["m.new_content"];
                        const relData = {
                            body: newContent.body,
                            emote: newContent.msgtype === "m.emote",
                            notice: newContent.msgtype === "m.notice",
                            eventId: event.eventId,
                        };
                        if (newContent.format) {
                            relData.formattedBody = newContent.formatted_body;
                        }
                        log.debug("Emitting edit event...");
                        this.bridge.emit("edit", room, relEvent, relData, asUser, event);
                        return;
                    }
                    if (this.bridge.protocol.features.reply && (relate.rel_type === "m.in_reply_to" || relate["m.in_reply_to"])) {
                        // okay, let's try to fetch the original event
                        const info = yield this.getEventInfo(roomId, eventId, null, event.sender);
                        if (info) {
                            const replyData = Object.assign(msgData, {
                                reply: info,
                            });
                            log.debug("Emitting reply event...");
                            this.bridge.emit("reply", room, relEvent, replyData, asUser, event);
                            return;
                        }
                    }
                    if (relate.rel_type === "m.annotation") {
                        // no feature setting as reactions are hidden if they aren't supported
                        if (puppetData.type !== "relay" || this.bridge.protocol.features.advancedRelay) {
                            yield this.bridge.reactionHandler.addMatrix(room, relEvent, event.eventId, relate.key, asUser);
                            log.debug("Emitting reaction event...");
                            this.bridge.emit("reaction", room, relEvent, relate.key, asUser, event);
                        }
                        return;
                    }
                }
            }
            if (msgtype === "m.reaction") {
                return; // short-circuit these out, even if they were invalid
            }
            log.debug("Emitting message event...");
            this.bridge.emit("message", room, msgData, asUser, event);
        });
    }
    handleInviteEvent(roomId, invite) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const userId = invite.membershipFor;
            const inviteId = invite.sender;
            log.info(`Got invite event in ${roomId} (${inviteId} --> ${userId})`);
            if (userId === this.bridge.AS.botIntent.userId) {
                log.verbose("Bridge bot got invited, joining....");
                yield this.bridge.AS.botIntent.joinRoom(roomId);
                return;
            }
            if (!this.bridge.AS.isNamespacedUser(userId)) {
                log.verbose("Our ghost didn't get invited, ignoring...");
                return; // we are only handling ghost invites
            }
            if (this.bridge.AS.isNamespacedUser(inviteId)) {
                log.verbose("Our bridge itself did the invite, ignoring...");
                return; // our bridge did the invite, ignore additional handling
            }
            // as we only check for existance, no need to go via the namespaceHandler --> a bit quicker
            const roomPartsExist = yield this.bridge.roomSync.getPartsFromMxid(roomId);
            if (roomPartsExist) {
                log.verbose("Room already exists, so double-puppet user probably auto-invited, ignoring...");
                return; // we are an existing room, meaning a double-puppeted user probably auto-invited. Do nothing
            }
            // alright, this is a valid invite. Let's process it and maybe make a new DM!
            log.info(`Processing invite for ${userId} by ${inviteId}`);
            const intent = this.bridge.AS.getIntentForUserId(userId);
            if (!this.bridge.hooks.getDmRoomId || !this.bridge.hooks.createRoom) {
                log.verbose("Necessary hooks unset, rejecting invite...");
                yield intent.leaveRoom(roomId);
                return;
            }
            // check if the mxid validates
            const parts = yield this.getUserParts(userId, inviteId);
            if (!parts) {
                log.verbose("invalid mxid, rejecting invite...");
                yield intent.leaveRoom(roomId);
                return;
            }
            // check if we actually own that puppet
            const puppet = yield this.bridge.provisioner.get(parts.puppetId);
            if (!puppet || puppet.puppetMxid !== inviteId) {
                log.verbose("We don't own that puppet, rejecting invite...");
                yield intent.leaveRoom(roomId);
                return;
            }
            // fetch new room id
            const newRoomId = yield this.bridge.hooks.getDmRoomId(parts);
            if (!newRoomId) {
                log.verbose("No DM room for this user found, rejecting invite...");
                yield intent.leaveRoom(roomId);
                return;
            }
            // check if it already exists
            const roomExists = yield this.bridge.roomSync.maybeGet({
                puppetId: parts.puppetId,
                roomId: newRoomId,
            });
            if (roomExists) {
                log.verbose("DM room with this user already exists, rejecting invite...");
                yield intent.leaveRoom(roomId);
                return;
            }
            // check if it is a direct room
            const roomData = yield this.bridge.hooks.createRoom({
                puppetId: parts.puppetId,
                roomId: newRoomId,
            });
            if (!roomData || roomData.puppetId !== parts.puppetId || roomData.roomId !== newRoomId || !roomData.isDirect) {
                log.verbose("Invalid room creation data, rejecting invite...");
                yield intent.leaveRoom(roomId);
                return;
            }
            // FINALLY join back and accept the invite
            log.verbose("All seems fine, creating DM and joining invite!");
            yield this.bridge.roomSync.insert(roomId, roomData);
            yield this.bridge.roomSync.markAsDirect(roomData);
            yield intent.joinRoom(roomId);
            yield this.bridge.userSync.getClient(parts); // create user, if it doesn't exist
            (_a = this.bridge.metrics.room) === null || _a === void 0 ? void 0 : _a.inc({ type: roomData.isDirect ? "dm" : "group", protocol: this.bridge.protocol.id });
        });
    }
    // tslint:disable-next-line no-any
    handleRoomQuery(alias, createRoom) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Got room query for alias ${alias}`);
            // we deny room creation and then create it later on ourself
            yield createRoom(false);
            // get room ID and check if it is valid
            // TODO: figure this out
            const parts = yield this.bridge.roomSync.getPartsFromMxid(alias);
            if (!parts) {
                return;
            }
            yield this.bridge.bridgeRoom(parts);
        });
    }
    // tslint:disable-next-line no-any
    handlePresence(rawEvent) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.bridge.AS.isNamespacedUser(rawEvent.sender)) {
                return; // we don't handle our own namespace
            }
            log.info(`Got presence event for mxid ${rawEvent.sender}`);
            const puppetDatas = yield this.bridge.provisioner.getForMxid(rawEvent.sender);
            let puppetData = null;
            for (const p of puppetDatas) {
                if (p.type === "puppet") {
                    puppetData = p;
                    break;
                }
            }
            if (!puppetData) {
                const allPuppets = yield this.bridge.provisioner.getAll();
                const allRelays = allPuppets.filter((p) => p.type === "relay" && p.isGlobalNamespace);
                if (allRelays.length > 0) {
                    puppetData = allRelays[0];
                }
            }
            if (!puppetData) {
                log.error("Puppet not found. Something is REALLY wrong!!!!");
                return;
            }
            if (puppetData.type === "relay") {
                if (!this.bridge.protocol.features.advancedRelay) {
                    log.verbose("Simple relays can't have foreign presences, dropping...");
                    return;
                }
                if (!this.bridge.provisioner.canRelay(rawEvent.sender)) {
                    log.verbose("Presence wasn't sent from a relay-able person, dropping...");
                    return;
                }
            }
            else if (rawEvent.sender !== puppetData.puppetMxid) {
                log.verbose("Presence wasn't sent from the correct puppet, dropping...");
                return;
            }
            const asUser = yield this.getSendingUser(puppetData, "", rawEvent.sender);
            const presence = {
                currentlyActive: rawEvent.content.currently_active,
                lastActiveAgo: rawEvent.content.last_active_ago,
                presence: rawEvent.content.presence,
                statusMsg: rawEvent.content.status_msg,
            };
            log.verbose("Emitting presence event...");
            this.bridge.emit("presence", puppetData.puppetId, presence, asUser, rawEvent);
        });
    }
    // tslint:disable-next-line no-any
    handleTyping(roomId, rawEvent) {
        return __awaiter(this, void 0, void 0, function* () {
            let first = true;
            const pastTypingSet = this.typingCache.get(roomId) || new Set();
            const newTypingSet = new Set(rawEvent.content.user_ids);
            const changeUserIds = new Map();
            // first determine all the typing stops
            for (const pastUserId of pastTypingSet) {
                if (!newTypingSet.has(pastUserId)) {
                    changeUserIds.set(pastUserId, false);
                }
            }
            // now determine all typing starts
            for (const newUserId of newTypingSet) {
                if (!pastTypingSet.has(newUserId)) {
                    changeUserIds.set(newUserId, true);
                }
            }
            this.typingCache.set(roomId, newTypingSet);
            for (const [userId, typing] of changeUserIds) {
                if (this.bridge.AS.isNamespacedUser(userId)) {
                    continue; // we don't handle our own namespace
                }
                if (first) {
                    log.info(`Got typing event in room ${roomId}`);
                    first = false;
                }
                const room = yield this.getRoomParts(roomId, userId);
                if (!room) {
                    log.verbose("Room not found, ignoring...");
                    continue;
                }
                const puppetData = yield this.bridge.provisioner.get(room.puppetId);
                if (!puppetData) {
                    log.error("Puppet not found. Something is REALLY wrong!!!");
                    continue;
                }
                if (puppetData.type === "relay") {
                    if (!this.bridge.protocol.features.advancedRelay) {
                        log.verbose("Simple relays can't have foreign typing, dropping...");
                        continue;
                    }
                    if (!this.bridge.provisioner.canRelay(userId)) {
                        log.verbose("Typing wasn't sent from a relay-able person, dropping...");
                        continue;
                    }
                }
                else if (userId !== puppetData.puppetMxid) {
                    log.verbose("Typing wasn't sent from the correct puppet, dropping...");
                    continue;
                }
                const asUser = yield this.getSendingUser(puppetData, roomId, userId);
                log.verbose("Emitting typing event...");
                const dedupeUserId = (asUser && asUser.user && asUser.user.userId)
                    || (!asUser && puppetData && puppetData.userId) || null;
                if (dedupeUserId) {
                    this.bridge.typingHandler.deduplicator.lock(`${room.puppetId};${room.roomId}`, dedupeUserId, typing.toString());
                }
                this.bridge.emit("typing", room, typing, asUser, rawEvent);
            }
        });
    }
    // tslint:disable-next-line no-any
    handleReceipt(roomId, rawEvent) {
        return __awaiter(this, void 0, void 0, function* () {
            let first = true;
            // tslint:disable-next-line no-any
            for (const [eventId, allContents] of Object.entries(rawEvent.content)) {
                if (allContents["m.read"]) {
                    // we have read receipts
                    // tslint:disable-next-line no-any
                    for (const [userId, content] of Object.entries(allContents["m.read"])) {
                        if (this.bridge.AS.isNamespacedUser(userId)) {
                            continue; // we don't handle our own namespace
                        }
                        if (first) {
                            log.info(`Got receipt event in room ${roomId}`);
                            first = false;
                        }
                        const room = yield this.getRoomParts(roomId, userId);
                        if (!room) {
                            log.verbose("Room not found, dropping...");
                            continue;
                        }
                        const event = (yield this.bridge.eventSync.getRemote(room, eventId))[0];
                        if (!event) {
                            log.verbose("Event not found, dropping...");
                            continue;
                        }
                        const puppetData = yield this.bridge.provisioner.get(room.puppetId);
                        if (!puppetData) {
                            log.error("Puppet not found. Something is REALLY wrong!!!!");
                            continue;
                        }
                        if (puppetData.type === "relay") {
                            if (!this.bridge.protocol.features.advancedRelay) {
                                log.verbose("Simple relays can't have foreign receipts, dropping...");
                                continue;
                            }
                            if (!this.bridge.provisioner.canRelay(userId)) {
                                log.verbose("Receipt wasn't sent from a relay-able person, dropping...");
                                continue;
                            }
                        }
                        else if (userId !== puppetData.puppetMxid) {
                            log.verbose("Receipt wasn't sent from the correct puppet, dropping...");
                            continue;
                        }
                        const asUser = yield this.getSendingUser(puppetData, roomId, userId);
                        log.debug("Emitting read event...");
                        this.bridge.emit("read", room, event, content, asUser, rawEvent);
                    }
                }
            }
        });
    }
    getRoomDisplaynameCache(roomId) {
        if (!(roomId in this.memberInfoCache)) {
            this.memberInfoCache[roomId] = {};
        }
        return this.memberInfoCache[roomId];
    }
    updateCachedRoomMemberInfo(roomId, userId, memberInfo) {
        // we need to clone this object as to not modify the original
        const setInfo = Object.assign({}, memberInfo);
        if (!setInfo.displayname) {
            // Set localpart as displayname if no displayname is set
            setInfo.displayname = userId.substr(1).split(":")[0];
        }
        this.getRoomDisplaynameCache(roomId)[userId] = setInfo;
    }
    getRoomMemberInfo(roomId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const roomDisplaynameCache = this.getRoomDisplaynameCache(roomId);
            if (userId in roomDisplaynameCache) {
                return roomDisplaynameCache[userId];
            }
            const client = (yield this.bridge.roomSync.getRoomOp(roomId)) || this.bridge.AS.botClient;
            const memberInfo = (yield client.getRoomStateEvent(roomId, "m.room.member", userId));
            this.updateCachedRoomMemberInfo(roomId, userId, memberInfo);
            return memberInfo;
        });
    }
    // we need the content to be any-type here, as the textual event content doesn't do m.new_content yet
    // tslint:disable-next-line no-any
    applyRelayFormatting(roomId, sender, content) {
        return __awaiter(this, void 0, void 0, function* () {
            if (content["m.new_content"]) {
                yield this.applyRelayFormatting(roomId, sender, content["m.new_content"]);
            }
            const member = yield this.getRoomMemberInfo(roomId, sender);
            const displaynameEscaped = escapeHtml(member.displayname);
            if (content.msgtype === "m.text" || content.msgtype === "m.notice") {
                const formattedBody = content.formatted_body || escapeHtml(content.body).replace("\n", "<br>");
                content.formatted_body = `<strong>${displaynameEscaped}</strong>: ${formattedBody}`;
                content.format = "org.matrix.custom.html";
                content.body = `${member.displayname}: ${content.body}`;
            }
            else if (content.msgtype === "m.emote") {
                const formattedBody = content.formatted_body || escapeHtml(content.body).replace("\n", "<br>");
                content.msgtype = "m.text";
                content.formatted_body = `*<strong>${displaynameEscaped}</strong> ${formattedBody}`;
                content.format = "org.matrix.custom.html";
                content.body = `*${member.displayname} ${content.body}`;
            }
            else {
                const typeMap = {
                    "m.image": "an image",
                    "m.file": "a file",
                    "m.video": "a video",
                    "m.sticker": "a sticker",
                    "m.audio": "an audio file",
                };
                const url = this.bridge.getUrlFromMxc(content.url);
                delete content.url;
                const msg = typeMap[content.msgtype];
                const escapeUrl = escapeHtml(url);
                const filename = content.body;
                content.body = `${member.displayname} sent ${msg} ${filename}: ${url}`;
                content.msgtype = "m.text";
                content.format = "org.matrix.custom.html";
                content.formatted_body = `<strong>${displaynameEscaped}</strong> sent ${msg} <em>${escapeHtml(filename)}</em>: `
                    + `<a href="${escapeUrl}">${escapeUrl}</a>`;
            }
        });
    }
    getMessageType(event) {
        let msgtype = "";
        try {
            msgtype = event.messageType;
        }
        catch (e) { }
        if (event.type !== "m.room.message") {
            msgtype = event.type;
        }
        return msgtype;
    }
    getSendingUser(puppetData, roomId, userId, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!puppetData || (typeof puppetData !== "boolean" && puppetData.type !== "relay")) {
                return null;
            }
            const membership = roomId ? yield this.getRoomMemberInfo(roomId, userId) : null;
            let user = null;
            try {
                user = yield this.getUserParts(userId, sender || userId);
            }
            catch (_a) { } // ignore error
            if (!membership) {
                return {
                    displayname: userId.substr(1).split(":")[0],
                    mxid: userId,
                    avatarMxc: null,
                    avatarUrl: null,
                    user,
                };
            }
            let avatarMxc = null;
            let avatarUrl = null;
            if (typeof membership.avatar_url === "string") {
                avatarMxc = membership.avatar_url;
                avatarUrl = this.bridge.getUrlFromMxc(avatarMxc, AVATAR_SIZE, AVATAR_SIZE, "scale");
            }
            return {
                displayname: membership.displayname,
                mxid: userId,
                avatarMxc,
                avatarUrl,
                user,
            };
        });
    }
    getUserParts(mxid, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.bridge.namespaceHandler.getRemoteUser(this.bridge.userSync.getPartsFromMxid(mxid), sender);
        });
    }
    getRoomParts(mxid, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.bridge.namespaceHandler.getRemoteRoom(yield this.bridge.roomSync.getPartsFromMxid(mxid), sender);
        });
    }
}
exports.MatrixEventHandler = MatrixEventHandler;
//# sourceMappingURL=matrixeventhandler.js.map