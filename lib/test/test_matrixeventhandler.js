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
const chai_1 = require("chai");
const matrixeventhandler_1 = require("../src/matrixeventhandler");
const matrix_bot_sdk_1 = require("@sorunome/matrix-bot-sdk");
const prometheus = require("prom-client");
const messagededuplicator_1 = require("../src/structures/messagededuplicator");
const DEDUPLICATOR_TIMEOUT = 100;
let PUPPETSTORE_JOINED_GHOST_TO_ROOM = "";
let PUPPETSTORE_LEAVE_GHOST_FROM_ROOM = "";
let PUPPETSTORE_SET_MXID_INFO = false;
let USERSYNC_SET_ROOM_OVERRIDE = false;
let ROOMSYNC_MAYBE_LEAVE_GHOST = "";
let ROOMSYNC_MARK_AS_DIRECT = "";
let BRIDGE_EVENTS_EMITTED = [];
let BRIDGE_ROOM_MXID_UNBRIDGED = "";
let BRIDGE_ROOM_ID_UNBRIDGED = "";
let BRIDGE_ROOM_ID_BRIDGED = "";
let PROVISIONER_GET_MXID_CALLED = false;
let ROOM_SYNC_GET_PARTS_FROM_MXID_CALLED = false;
let BOT_PROVISIONER_EVENT_PROCESSED = false;
let BOT_PROVISIONER_ROOM_EVENT_PROCESSED = false;
let DELAYED_FUNCTION_SET = () => __awaiter(void 0, void 0, void 0, function* () { });
let BOT_INTENT_JOIN_ROOM = "";
let GHOST_INTENT_LEAVE_ROOM = "";
let GHOST_INTENT_JOIN_ROOM = "";
let ROOM_SYNC_INSERTED_ENTRY = false;
let REACTION_HANDLER_ADDED_MATRIX = false;
let REACTION_HANDLER_HANDLED_REDACT = false;
let PRESENCE_HANDLER_SET_STATUS_IN_ROOM = "";
function getHandler(opts) {
    if (!opts) {
        opts = {};
    }
    PUPPETSTORE_JOINED_GHOST_TO_ROOM = "";
    PUPPETSTORE_SET_MXID_INFO = false;
    USERSYNC_SET_ROOM_OVERRIDE = false;
    ROOMSYNC_MAYBE_LEAVE_GHOST = "";
    ROOMSYNC_MARK_AS_DIRECT = "";
    BRIDGE_EVENTS_EMITTED = [];
    BRIDGE_ROOM_MXID_UNBRIDGED = "";
    BRIDGE_ROOM_ID_UNBRIDGED = "";
    BRIDGE_ROOM_ID_BRIDGED = "";
    PROVISIONER_GET_MXID_CALLED = false;
    ROOM_SYNC_GET_PARTS_FROM_MXID_CALLED = false;
    BOT_PROVISIONER_EVENT_PROCESSED = false;
    BOT_PROVISIONER_ROOM_EVENT_PROCESSED = false;
    DELAYED_FUNCTION_SET = () => __awaiter(this, void 0, void 0, function* () { });
    BOT_INTENT_JOIN_ROOM = "";
    GHOST_INTENT_LEAVE_ROOM = "";
    GHOST_INTENT_JOIN_ROOM = "";
    ROOM_SYNC_INSERTED_ENTRY = false;
    REACTION_HANDLER_ADDED_MATRIX = false;
    REACTION_HANDLER_HANDLED_REDACT = false;
    PRESENCE_HANDLER_SET_STATUS_IN_ROOM = "";
    const bridge = {
        hooks: opts.createDmHook ? {
            getDmRoomId: opts.getDmRoomIdHook || true,
            createRoom: opts.createRoomHook || true,
        } : {},
        protocol: {
            id: "remote",
            features: {
                image: opts.featureImage || false,
                audio: opts.featureAudio || false,
                video: opts.featureVideo || false,
                sticker: opts.featureSticker || false,
                file: opts.featureFile || false,
                edit: opts.featureEdit || false,
                reply: opts.featureReply || false,
            },
        },
        emit: (type) => {
            BRIDGE_EVENTS_EMITTED.push(type);
        },
        getUrlFromMxc: (mxc) => "https://" + mxc,
        unbridgeRoomByMxid: (roomId) => __awaiter(this, void 0, void 0, function* () {
            BRIDGE_ROOM_MXID_UNBRIDGED = roomId;
        }),
        unbridgeRoom: (room) => __awaiter(this, void 0, void 0, function* () {
            BRIDGE_ROOM_ID_UNBRIDGED = room.roomId;
        }),
        bridgeRoom: (room) => __awaiter(this, void 0, void 0, function* () {
            BRIDGE_ROOM_ID_BRIDGED = room.roomId;
        }),
        namespaceHandler: {
            getRemoteUser: (user, sender) => __awaiter(this, void 0, void 0, function* () {
                return user;
            }),
            getRemoteRoom: (room, sender) => __awaiter(this, void 0, void 0, function* () {
                return room;
            }),
        },
        getMxidForUser: (user, override) => __awaiter(this, void 0, void 0, function* () { return `@_puppet_${user.puppetId}_${user.userId}:example.org`; }),
        AS: {
            isNamespacedUser: (userId) => userId.startsWith("@_puppet"),
            botIntent: {
                userId: "@_puppetbot:example.org",
                joinRoom: (roomId) => __awaiter(this, void 0, void 0, function* () {
                    BOT_INTENT_JOIN_ROOM = roomId;
                }),
            },
            getIntentForUserId: (userId) => {
                return {
                    leaveRoom: (roomId) => __awaiter(this, void 0, void 0, function* () {
                        GHOST_INTENT_LEAVE_ROOM = roomId;
                    }),
                    joinRoom: (roomId) => __awaiter(this, void 0, void 0, function* () {
                        GHOST_INTENT_JOIN_ROOM = roomId;
                    }),
                };
            },
        },
        delayedFunction: {
            set: (key, fn, timeout, opt) => {
                DELAYED_FUNCTION_SET = fn;
            },
        },
        botProvisioner: {
            processEvent: (roomId, event) => __awaiter(this, void 0, void 0, function* () {
                BOT_PROVISIONER_EVENT_PROCESSED = true;
            }),
            processRoomEvent: (roomId, event) => __awaiter(this, void 0, void 0, function* () {
                BOT_PROVISIONER_ROOM_EVENT_PROCESSED = true;
            }),
        },
        puppetStore: {
            joinGhostToRoom: (ghostId, roomId) => __awaiter(this, void 0, void 0, function* () {
                PUPPETSTORE_JOINED_GHOST_TO_ROOM = `${ghostId};${roomId}`;
            }),
            leaveGhostFromRoom: (ghostId, roomId) => __awaiter(this, void 0, void 0, function* () {
                PUPPETSTORE_LEAVE_GHOST_FROM_ROOM = `${ghostId};${roomId}`;
            }),
            getOrCreateMxidInfo: (puppetMxid) => __awaiter(this, void 0, void 0, function* () {
                const ret = {
                    avatarMxc: "",
                    name: "",
                };
                if (opts.puppetHasAvatar) {
                    ret.avatarMxc = "mxc://avatar/example.com";
                }
                if (opts.puppetHasName) {
                    ret.name = "User";
                }
                return ret;
            }),
            setMxidInfo: (puppet) => __awaiter(this, void 0, void 0, function* () {
                PUPPETSTORE_SET_MXID_INFO = true;
            }),
        },
        userSync: {
            getPartsFromMxid: (ghostId) => {
                if (ghostId.startsWith("@_puppet_1_fox:")) {
                    return {
                        userId: "fox",
                        puppetId: 1,
                    };
                }
                if (ghostId.startsWith("@_puppet_1_newfox:")) {
                    return {
                        userId: "newfox",
                        puppetId: 1,
                    };
                }
                if (ghostId.startsWith("@_puppet_999_otherfox:")) {
                    return {
                        userId: "otherfox",
                        puppetId: 999,
                    };
                }
                return null;
            },
            setRoomOverride: (userParts, roomId) => __awaiter(this, void 0, void 0, function* () {
                USERSYNC_SET_ROOM_OVERRIDE = true;
            }),
            getClient: (parts) => __awaiter(this, void 0, void 0, function* () { }),
        },
        roomSync: {
            getPartsFromMxid: (roomId) => __awaiter(this, void 0, void 0, function* () {
                ROOM_SYNC_GET_PARTS_FROM_MXID_CALLED = true;
                if (roomId.startsWith("!foxdm:")) {
                    return {
                        roomId: "foxdm",
                        puppetId: 1,
                    };
                }
                if (roomId.startsWith("#_puppet_1_foxroom:")) {
                    return {
                        roomId: "foxroom",
                        puppetId: 1,
                    };
                }
                if (roomId.startsWith("!room:")) {
                    return {
                        roomId: "room",
                        puppetId: 1,
                    };
                }
                return null;
            }),
            maybeLeaveGhost: (roomId, userId) => __awaiter(this, void 0, void 0, function* () {
                ROOMSYNC_MAYBE_LEAVE_GHOST = `${userId};${roomId}`;
            }),
            maybeGet: (room) => __awaiter(this, void 0, void 0, function* () {
                if (room.roomId === "fox" && room.puppetId === 1) {
                    return room;
                }
                if (room.roomId === "foxdm" && room.puppetId === 1) {
                    return {
                        roomdId: "foxdm",
                        puppetId: 1,
                        isDirect: true,
                    };
                }
                return null;
            }),
            insert: (roomId, roomData) => __awaiter(this, void 0, void 0, function* () {
                ROOM_SYNC_INSERTED_ENTRY = true;
            }),
            getRoomOp: (opRoomId) => __awaiter(this, void 0, void 0, function* () {
                return {
                    getRoomStateEvent: (_, state, key) => __awaiter(this, void 0, void 0, function* () {
                        if (state === "m.room.member" && key === "user") {
                            return {
                                membership: "join",
                                displayname: "User",
                                avatar_url: "blah",
                            };
                        }
                    }),
                    getEvent: (roomId, eventId) => __awaiter(this, void 0, void 0, function* () {
                        if (eventId === "$event:example.org") {
                            return {
                                type: "m.room.message",
                                content: {
                                    msgtype: "m.text",
                                    body: "original message",
                                },
                                sender: "user",
                            };
                        }
                    }),
                };
            }),
            markAsDirect: (room) => {
                ROOMSYNC_MARK_AS_DIRECT = `${room.puppetId};${room.roomId}`;
            },
            markAsUsed: (room) => { },
        },
        provisioner: {
            get: (puppetId) => __awaiter(this, void 0, void 0, function* () {
                if (puppetId === 1) {
                    return {
                        puppetMxid: "@user:example.org",
                        userId: "puppetGhost",
                        type: opts.relayEnabled ? "relay" : "puppet",
                        autoinvite: true,
                        isPrivate: true,
                    };
                }
                return null;
            }),
            getMxid: (puppetId) => __awaiter(this, void 0, void 0, function* () {
                PROVISIONER_GET_MXID_CALLED = true;
                if (puppetId === 1) {
                    return "@user:example.org";
                }
                return "";
            }),
            getForMxid: (puppetMxid) => __awaiter(this, void 0, void 0, function* () {
                if (puppetMxid === "@user:example.org") {
                    return [
                        {
                            puppetId: 1,
                            type: "puppet",
                            puppetMxid,
                        },
                        {
                            puppetId: 2,
                            type: "puppet",
                            puppetMxid,
                        },
                    ];
                }
                return [];
            }),
            canRelay: (mxid) => !mxid.startsWith("@bad"),
            adjustMute: (userId, room) => __awaiter(this, void 0, void 0, function* () { }),
        },
        eventSync: {
            getRemote: (room, mxid) => {
                if (mxid.split(";")[0] === "$bad:example.org") {
                    return ["bad"];
                }
                if (mxid.split(";")[0] === "$event:example.org") {
                    return ["event"];
                }
                return [];
            },
        },
        reactionHandler: {
            addMatrix: (room, relEvent, eventId, key) => __awaiter(this, void 0, void 0, function* () {
                REACTION_HANDLER_ADDED_MATRIX = true;
            }),
            handleRedactEvent: (roomEvent) => __awaiter(this, void 0, void 0, function* () {
                REACTION_HANDLER_HANDLED_REDACT = true;
            }),
        },
        presenceHandler: {
            setStatusInRoom: (userId, roomId) => __awaiter(this, void 0, void 0, function* () {
                PRESENCE_HANDLER_SET_STATUS_IN_ROOM = `${userId};${roomId}`;
            }),
        },
        typingHandler: {
            deduplicator: new messagededuplicator_1.MessageDeduplicator(DEDUPLICATOR_TIMEOUT, DEDUPLICATOR_TIMEOUT + DEDUPLICATOR_TIMEOUT),
        },
        metrics: {},
    };
    prometheus.register.clear();
    return new matrixeventhandler_1.MatrixEventHandler(bridge);
}
describe("MatrixEventHandler", () => {
    describe("handleRoomEvent", () => {
        it("should route joins to the join handler", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let joinHandled = false;
            handler["handleJoinEvent"] = (roomId, evt) => __awaiter(void 0, void 0, void 0, function* () {
                joinHandled = true;
            });
            const event = new matrix_bot_sdk_1.RoomEvent({
                type: "m.room.member",
                content: {
                    membership: "join",
                },
            });
            yield handler["handleRoomEvent"]("!blah:example.org", event);
            chai_1.expect(joinHandled).to.be.true;
        }));
        it("should route bans to the leave handler", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let leaveHandled = false;
            handler["handleLeaveEvent"] = (roomId, evt) => __awaiter(void 0, void 0, void 0, function* () {
                leaveHandled = true;
            });
            const event = new matrix_bot_sdk_1.RoomEvent({
                type: "m.room.member",
                content: {
                    membership: "ban",
                },
            });
            yield handler["handleRoomEvent"]("!blah:example.org", event);
            chai_1.expect(leaveHandled).to.be.true;
        }));
        it("should route leaves to the leave handler", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let leaveHandled = false;
            handler["handleLeaveEvent"] = (roomId, evt) => __awaiter(void 0, void 0, void 0, function* () {
                leaveHandled = true;
            });
            const event = new matrix_bot_sdk_1.RoomEvent({
                type: "m.room.member",
                content: {
                    membership: "leave",
                },
            });
            yield handler["handleRoomEvent"]("!blah:example.org", event);
            chai_1.expect(leaveHandled).to.be.true;
        }));
        it("should route redactions to the redaction handler", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let redactionHandled = false;
            handler["handleRedactEvent"] = (roomId, evt) => __awaiter(void 0, void 0, void 0, function* () {
                redactionHandled = true;
            });
            const event = new matrix_bot_sdk_1.RoomEvent({
                type: "m.room.redaction",
            });
            yield handler["handleRoomEvent"]("!blah:example.org", event);
            chai_1.expect(redactionHandled).to.be.true;
        }));
        it("should route stickers to the message handler", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let messageHandled = false;
            handler["handleMessageEvent"] = (roomId, evt) => __awaiter(void 0, void 0, void 0, function* () {
                messageHandled = true;
            });
            const event = new matrix_bot_sdk_1.RoomEvent({
                type: "m.sticker",
            });
            yield handler["handleRoomEvent"]("!blah:example.org", event);
            chai_1.expect(messageHandled).to.be.true;
        }));
        it("should route messages to the message handler", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let messageHandled = false;
            handler["handleMessageEvent"] = (roomId, evt) => __awaiter(void 0, void 0, void 0, function* () {
                messageHandled = true;
            });
            const event = new matrix_bot_sdk_1.RoomEvent({
                type: "m.room.message",
            });
            yield handler["handleRoomEvent"]("!blah:example.org", event);
            chai_1.expect(messageHandled).to.be.true;
        }));
    });
    describe("handleJoinEvent", () => {
        it("should route ghosts to the ghost join handler", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let ghostJoinHandled = false;
            handler["handleGhostJoinEvent"] = (roomId, evt) => __awaiter(void 0, void 0, void 0, function* () {
                ghostJoinHandled = true;
            });
            const event = new matrix_bot_sdk_1.MembershipEvent({
                type: "m.room.member",
                state_key: "@_puppet_1_blah:example.org",
                content: {
                    membership: "join",
                },
            });
            yield handler["handleRoomEvent"]("!blah:example.org", event);
            chai_1.expect(ghostJoinHandled).to.be.true;
        }));
        it("should route users to the user join handler", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let userJoinHandled = false;
            handler["handleUserJoinEvent"] = (roomId, evt) => __awaiter(void 0, void 0, void 0, function* () {
                userJoinHandled = true;
            });
            const event = new matrix_bot_sdk_1.MembershipEvent({
                type: "m.room.member",
                state_key: "@user:example.org",
                content: {
                    membership: "join",
                },
            });
            yield handler["handleRoomEvent"]("!blah:example.org", event);
            chai_1.expect(userJoinHandled).to.be.true;
        }));
    });
    describe("handleGhostJoinEvent", () => {
        it("should add the ghost to the room cache and update status", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const ghostId = "@_puppet_1_blah:example.org";
            const event = new matrix_bot_sdk_1.MembershipEvent({
                type: "m.room.member",
                state_key: ghostId,
                content: {
                    membership: "join",
                },
            });
            const roomId = "!blah:example.org";
            yield handler["handleGhostJoinEvent"](roomId, event);
            chai_1.expect(PUPPETSTORE_JOINED_GHOST_TO_ROOM).to.equal(`${ghostId};${roomId}`);
            chai_1.expect(PRESENCE_HANDLER_SET_STATUS_IN_ROOM).to.equal(`${ghostId};${roomId}`);
        }));
        it("should set a room override, are all conditions met", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const ghostId = "@_puppet_1_fox:example.org";
            const event = new matrix_bot_sdk_1.MembershipEvent({
                type: "m.room.member",
                state_key: ghostId,
                content: {
                    membership: "join",
                },
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleGhostJoinEvent"](roomId, event);
            chai_1.expect(USERSYNC_SET_ROOM_OVERRIDE).to.be.true;
        }));
        it("should not attempt leave the appservice bot, if not a dm", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const ghostId = "@_puppet_1_blah:example.org";
            const event = new matrix_bot_sdk_1.MembershipEvent({
                type: "m.room.member",
                state_key: ghostId,
                content: {
                    membership: "join",
                },
            });
            const roomId = "!blah:example.org";
            yield handler["handleGhostJoinEvent"](roomId, event);
            chai_1.expect(ROOMSYNC_MAYBE_LEAVE_GHOST).to.equal("");
        }));
        it("should attempt to leave the appservice bot, if a dm", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const ghostId = "@_puppet_1_blah:example.org";
            const event = new matrix_bot_sdk_1.MembershipEvent({
                type: "m.room.member",
                state_key: ghostId,
                content: {
                    membership: "join",
                },
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleGhostJoinEvent"](roomId, event);
            chai_1.expect(ROOMSYNC_MAYBE_LEAVE_GHOST).to.equal(`@_puppetbot:example.org;${roomId}`);
        }));
    });
    describe("handleUserJoinEvent", () => {
        it("should do nothing, if no room is found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let updatedCache = false;
            handler["updateCachedRoomMemberInfo"] = (rid, uid, content) => __awaiter(void 0, void 0, void 0, function* () {
                updatedCache = true;
            });
            const userId = "@user:example.org";
            const event = new matrix_bot_sdk_1.MembershipEvent({
                type: "m.room.member",
                state_key: userId,
                content: {
                    membership: "join",
                },
            });
            const roomId = "!nonexistant:example.org";
            yield handler["handleUserJoinEvent"](roomId, event);
            chai_1.expect(updatedCache).to.be.false;
        }));
        it("should update the member info cache, should the room be found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let updatedCache = false;
            handler["updateCachedRoomMemberInfo"] = (rid, uid, content) => __awaiter(void 0, void 0, void 0, function* () {
                updatedCache = true;
            });
            const userId = "@user:example.org";
            const event = new matrix_bot_sdk_1.MembershipEvent({
                type: "m.room.member",
                state_key: userId,
                content: {
                    membership: "join",
                },
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleUserJoinEvent"](roomId, event);
            chai_1.expect(updatedCache).to.be.true;
        }));
        it("should update the puppets name, if a new one is present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const userId = "@user:example.org";
            const event = new matrix_bot_sdk_1.MembershipEvent({
                type: "m.room.member",
                state_key: userId,
                content: {
                    displayname: "Fox Lover",
                    membership: "join",
                },
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleUserJoinEvent"](roomId, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED.length).to.equal(2);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["puppetName", "puppetName"]);
            chai_1.expect(PUPPETSTORE_SET_MXID_INFO).to.be.true;
        }));
        it("should update the puppets avatar, if a new one is present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const userId = "@user:example.org";
            const event = new matrix_bot_sdk_1.MembershipEvent({
                type: "m.room.member",
                state_key: userId,
                content: {
                    avatar_url: "mxc://fox/example.org",
                    membership: "join",
                },
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleUserJoinEvent"](roomId, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED.length).to.equal(2);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["puppetAvatar", "puppetAvatar"]);
            chai_1.expect(PUPPETSTORE_SET_MXID_INFO).to.be.true;
        }));
    });
    describe("handleLeaveEvent", () => {
        it("should leave the ghost of the room, if it was a ghost", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const userId = "@user:example.org";
            const ghostId = "@_puppet_1_fox:example.org";
            const event = new matrix_bot_sdk_1.MembershipEvent({
                type: "m.room.member",
                state_key: ghostId,
                sender: ghostId,
                content: {
                    membership: "leave",
                },
            });
            const roomId = "!blah:example.org";
            yield handler["handleLeaveEvent"](roomId, event);
            chai_1.expect(PUPPETSTORE_LEAVE_GHOST_FROM_ROOM).to.equal(`${ghostId};${roomId}`);
            chai_1.expect(BRIDGE_ROOM_MXID_UNBRIDGED).to.equal("");
        }));
    });
    describe("handleRedactEvent", () => {
        it("should ignore redactions from ghosts", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.RedactionEvent({
                type: "m.room.redaction",
                sender: "@_puppet_1_fox:example.org",
                redacts: "$bad:example.org",
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleRedactEvent"](roomId, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED.length).to.equal(0);
        }));
        it("should ignore redactions from unknown rooms", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.RedactionEvent({
                type: "m.room.redaction",
                sender: "@user:example.org",
                redacts: "$bad:example.org",
            });
            const roomId = "!invalid:example.org";
            yield handler["handleRedactEvent"](roomId, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED.length).to.equal(0);
        }));
        it("should ignore redacts, if not from the puppet user", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.RedactionEvent({
                type: "m.room.redaction",
                sender: "@wronguser:example.org",
                redacts: "$bad:example.org",
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleRedactEvent"](roomId, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED.length).to.equal(0);
        }));
        it("should not redact if the dedupe flag is set", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.RedactionEvent({
                type: "m.room.redaction",
                sender: "@user:example.org",
                redacts: "$bad:example.org",
                content: { source: "remote" },
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleRedactEvent"](roomId, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED.length).to.equal(0);
        }));
        it("should redact events, should all check out", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.RedactionEvent({
                type: "m.room.redaction",
                sender: "@user:example.org",
                redacts: "$bad:example.org",
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleRedactEvent"](roomId, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED.length).to.equal(1);
            chai_1.expect(BRIDGE_EVENTS_EMITTED[0]).to.equal("redact");
            chai_1.expect(REACTION_HANDLER_HANDLED_REDACT).to.be.true;
        }));
    });
    describe("handleMessageEvent", () => {
        it("should drop messages from ghosts", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.MessageEvent({
                type: "m.room.message",
                sender: "@_puppet_1_fox:example.org",
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleMessageEvent"](roomId, event);
            chai_1.expect(ROOM_SYNC_GET_PARTS_FROM_MXID_CALLED).to.be.false;
        }));
        it("should forward messages to the bot provisioner, if no associated room is found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.MessageEvent({
                type: "m.room.message",
                sender: "@user:example.org",
            });
            const roomId = "!invalid:example.org";
            yield handler["handleMessageEvent"](roomId, event);
            chai_1.expect(ROOM_SYNC_GET_PARTS_FROM_MXID_CALLED).to.be.true;
            chai_1.expect(BOT_PROVISIONER_EVENT_PROCESSED).to.be.true;
        }));
        it("should drop the message, if it wasn't sent by us", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let messageHandled = false;
            handler["handleFileEvent"] = (rid, room, puppet, evt) => __awaiter(void 0, void 0, void 0, function* () {
                messageHandled = true;
            });
            handler["handleTextEvent"] = (rid, room, puppet, evt) => __awaiter(void 0, void 0, void 0, function* () {
                messageHandled = true;
            });
            const event = new matrix_bot_sdk_1.MessageEvent({
                type: "m.room.message",
                sender: "@wronguser:example.org",
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleMessageEvent"](roomId, event);
            chai_1.expect(messageHandled).to.be.false;
        }));
        it("should drop the message if relay is enabled but sender is blacklisted", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                relayEnabled: true,
            });
            let messageHandled = false;
            handler["handleFileEvent"] = (rid, room, puppet, evt) => __awaiter(void 0, void 0, void 0, function* () {
                messageHandled = true;
            });
            handler["handleTextEvent"] = (rid, room, puppet, evt) => __awaiter(void 0, void 0, void 0, function* () {
                messageHandled = true;
            });
            const event = new matrix_bot_sdk_1.MessageEvent({
                type: "m.room.message",
                sender: "@baduser:example.org",
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleMessageEvent"](roomId, event);
            chai_1.expect(messageHandled).to.be.false;
        }));
        it("should apply relay formatting, if relay is enabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                relayEnabled: true,
            });
            let relayFormattingApplied = false;
            handler["applyRelayFormatting"] = (rid, room, evt) => __awaiter(void 0, void 0, void 0, function* () {
                relayFormattingApplied = true;
            });
            const event = new matrix_bot_sdk_1.MessageEvent({
                type: "m.room.message",
                sender: "@gooduser:example.org",
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleMessageEvent"](roomId, event);
            chai_1.expect(relayFormattingApplied).to.true;
        }));
        it("should delay-leave the ghost of the puppet", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.MessageEvent({
                type: "m.room.message",
                sender: "@user:example.org",
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleMessageEvent"](roomId, event);
            yield DELAYED_FUNCTION_SET();
            chai_1.expect(ROOMSYNC_MAYBE_LEAVE_GHOST).to.equal("@_puppet_1_puppetGhost:example.org;!foxdm:example.org");
        }));
        it("should de-duplicate messages, if the remote flag is set", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let messageHandled = false;
            handler["handleFileEvent"] = (rid, room, puppet, evt) => __awaiter(void 0, void 0, void 0, function* () {
                messageHandled = true;
            });
            handler["handleTextEvent"] = (rid, room, puppet, evt) => __awaiter(void 0, void 0, void 0, function* () {
                messageHandled = true;
            });
            const event = new matrix_bot_sdk_1.MessageEvent({
                type: "m.room.message",
                sender: "@user:example.org",
                content: { source: "remote" },
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleMessageEvent"](roomId, event);
            chai_1.expect(messageHandled).to.be.false;
        }));
        it("should pass the message on to file handler, if it is a file msgtype", () => __awaiter(void 0, void 0, void 0, function* () {
            for (const msgtype of ["m.file", "m.image", "m.audio", "m.sticker", "m.video"]) {
                const handler = getHandler();
                let fileMessageHandled = false;
                handler["handleFileEvent"] = (rid, room, puppet, evt) => __awaiter(void 0, void 0, void 0, function* () {
                    fileMessageHandled = true;
                });
                const event = new matrix_bot_sdk_1.MessageEvent({
                    type: "m.room.message",
                    sender: "@user:example.org",
                    content: {
                        msgtype,
                        body: "",
                    },
                });
                const roomId = "!foxdm:example.org";
                yield handler["handleMessageEvent"](roomId, event);
                chai_1.expect(fileMessageHandled).to.be.true;
            }
        }));
        it("should pass the message on to the text handler, if it is a text msgtype", () => __awaiter(void 0, void 0, void 0, function* () {
            for (const msgtype of ["m.text", "m.notice", "m.emote", "m.reaction"]) {
                const handler = getHandler();
                let textMessageHandled = false;
                handler["handleTextEvent"] = (rid, room, puppet, evt) => __awaiter(void 0, void 0, void 0, function* () {
                    textMessageHandled = true;
                });
                const event = new matrix_bot_sdk_1.MessageEvent({
                    type: "m.room.message",
                    sender: "@user:example.org",
                    content: {
                        msgtype,
                        body: "",
                    },
                });
                const roomId = "!foxdm:example.org";
                yield handler["handleMessageEvent"](roomId, event);
                chai_1.expect(textMessageHandled).to.be.true;
            }
        }));
        it("should pass the message on to the bot provisioner, if it starts with the correct prefix", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let textMessageHandled = false;
            handler["handleTextEvent"] = (rid, room, puppet, evt) => __awaiter(void 0, void 0, void 0, function* () {
                textMessageHandled = true;
            });
            const event = new matrix_bot_sdk_1.MessageEvent({
                type: "m.room.message",
                sender: "@user:example.org",
                content: {
                    msgtype: "m.text",
                    body: "!remote fox",
                },
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleMessageEvent"](roomId, event);
            chai_1.expect(textMessageHandled).to.be.false;
            chai_1.expect(BOT_PROVISIONER_ROOM_EVENT_PROCESSED).to.be.true;
        }));
    });
    describe("handleFileEvent", () => {
        it("should fall back to text messages, if no features are enabled", () => __awaiter(void 0, void 0, void 0, function* () {
            for (const msgtype of ["m.image", "m.audio", "m.video", "m.sticker", "m.file"]) {
                const handler = getHandler();
                const event = new matrix_bot_sdk_1.MessageEvent({
                    type: "m.room.message",
                    content: {
                        msgtype,
                        url: "https://example.org/fox.file",
                    },
                });
                const roomId = "!foxdm:example.org";
                const room = {};
                const puppet = {};
                yield handler["handleFileEvent"](roomId, room, puppet, event);
                chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["message"]);
            }
        }));
        it("should send files as their type, if the features are enabled", () => __awaiter(void 0, void 0, void 0, function* () {
            for (const msgtype of ["m.image", "m.audio", "m.video", "m.sticker", "m.file"]) {
                const handler = getHandler({
                    featureImage: true,
                    featureAudio: true,
                    featureVideo: true,
                    featureSticker: true,
                    featureFile: true,
                });
                const event = new matrix_bot_sdk_1.MessageEvent({
                    type: "m.room.message",
                    content: {
                        msgtype,
                        url: "https://example.org/fox.file",
                    },
                });
                const roomId = "!foxdm:example.org";
                const room = {};
                const puppet = {};
                yield handler["handleFileEvent"](roomId, room, puppet, event);
                chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql([msgtype.substring(2)]);
            }
        }));
        it("should fall everything back to file, if that is enabled", () => __awaiter(void 0, void 0, void 0, function* () {
            for (const msgtype of ["m.image", "m.audio", "m.video", "m.sticker", "m.file"]) {
                const handler = getHandler({
                    featureFile: true,
                });
                const event = new matrix_bot_sdk_1.MessageEvent({
                    type: "m.room.message",
                    content: {
                        msgtype,
                        url: "https://example.org/fox.file",
                    },
                });
                const roomId = "!foxdm:example.org";
                const room = {};
                const puppet = {};
                yield handler["handleFileEvent"](roomId, room, puppet, event);
                chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["file"]);
            }
        }));
        it("should fall stickers back to images, if they are enabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                featureImage: true,
            });
            const event = new matrix_bot_sdk_1.MessageEvent({
                type: "m.room.message",
                content: {
                    msgtype: "m.sticker",
                    url: "https://example.org/fox.file",
                },
            });
            const roomId = "!foxdm:example.org";
            const room = {};
            const puppet = {};
            yield handler["handleFileEvent"](roomId, room, puppet, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["image"]);
        }));
    });
    describe("handleTextEvent", () => {
        it("should detect and send edits, if the feature is enabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                featureEdit: true,
            });
            const event = new matrix_bot_sdk_1.MessageEvent({
                content: {
                    "msgtype": "m.text",
                    "body": "* blah",
                    "m.relates_to": {
                        event_id: "$event:example.org",
                        rel_type: "m.replace",
                    },
                    "m.new_content": {
                        msgtype: "m.text",
                        body: "blah",
                    },
                },
            });
            const roomId = "!foxdm:example.org";
            const room = {};
            const puppet = {};
            yield handler["handleTextEvent"](roomId, room, puppet, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["edit"]);
        }));
        it("should fall edits back to messages, if the remote id isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                featureEdit: true,
            });
            const event = new matrix_bot_sdk_1.MessageEvent({
                content: {
                    "msgtype": "m.text",
                    "body": "* blah",
                    "m.relates_to": {
                        event_id: "$notfound:example.org",
                        rel_type: "m.replace",
                    },
                    "m.new_content": {
                        msgtype: "m.text",
                        body: "blah",
                    },
                },
            });
            const roomId = "!foxdm:example.org";
            const room = {};
            const puppet = {};
            yield handler["handleTextEvent"](roomId, room, puppet, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["message"]);
        }));
        it("should fall edits back to messages, if the feature is disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.MessageEvent({
                content: {
                    "msgtype": "m.text",
                    "body": "* blah",
                    "m.relates_to": {
                        event_id: "$event:example.org",
                        rel_type: "m.replace",
                    },
                    "m.new_content": {
                        msgtype: "m.text",
                        body: "blah",
                    },
                },
            });
            const roomId = "!foxdm:example.org";
            const room = {};
            const puppet = {};
            yield handler["handleTextEvent"](roomId, room, puppet, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["message"]);
        }));
        it("should detect and send replies, if they are enabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                featureReply: true,
            });
            const event = new matrix_bot_sdk_1.MessageEvent({
                content: {
                    "msgtype": "m.text",
                    "body": "blah",
                    "m.relates_to": {
                        "m.in_reply_to": {
                            event_id: "$event:example.org",
                        },
                    },
                },
            });
            const roomId = "!foxdm:example.org";
            const room = {};
            const puppet = {};
            yield handler["handleTextEvent"](roomId, room, puppet, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["reply"]);
        }));
        it("should fall replies back to messages, if the remote isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                featureReply: true,
            });
            const event = new matrix_bot_sdk_1.MessageEvent({
                content: {
                    "msgtype": "m.text",
                    "body": "blah",
                    "m.relates_to": {
                        "m.in_reply_to": {
                            event_id: "$notfound:example.org",
                        },
                    },
                },
            });
            const roomId = "!foxdm:example.org";
            const room = {};
            const puppet = {};
            yield handler["handleTextEvent"](roomId, room, puppet, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["message"]);
        }));
        it("should fall replies back to messages, if the feature is disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.MessageEvent({
                content: {
                    "msgtype": "m.text",
                    "body": "blah",
                    "m.relates_to": {
                        "m.in_reply_to": {
                            event_id: "$event:example.org",
                        },
                    },
                },
            });
            const roomId = "!foxdm:example.org";
            const room = {};
            const puppet = {};
            yield handler["handleTextEvent"](roomId, room, puppet, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["message"]);
        }));
        it("should detect reactions", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.MessageEvent({
                content: {
                    "m.relates_to": {
                        event_id: "$event:example.org",
                        rel_type: "m.annotation",
                        key: "fox",
                    },
                },
            });
            const roomId = "!foxdm:example.org";
            const room = {};
            const puppet = {};
            yield handler["handleTextEvent"](roomId, room, puppet, event);
            chai_1.expect(REACTION_HANDLER_ADDED_MATRIX).to.be.true;
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["reaction"]);
        }));
        it("should send normal messages", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.MessageEvent({
                content: {
                    msgtype: "m.text",
                    body: "FOXIES!!!",
                },
            });
            const roomId = "!foxdm:example.org";
            const room = {};
            const puppet = {};
            yield handler["handleTextEvent"](roomId, room, puppet, event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["message"]);
        }));
    });
    describe("handleInviteEvent", () => {
        it("should short-circuit bot user invites", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.MembershipEvent({
                state_key: "@_puppetbot:example.org",
                sender: "@user:example.org",
            });
            const roomId = "!blah:example.org";
            yield handler["handleInviteEvent"](roomId, event);
            chai_1.expect(BOT_INTENT_JOIN_ROOM).to.equal(roomId);
        }));
        it("should ignore invites if no ghost got invited", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.MembershipEvent({
                state_key: "@blubb:example.org",
                sender: "@user:example.org",
            });
            const roomId = "!blah:example.org";
            yield handler["handleInviteEvent"](roomId, event);
            chai_1.expect(GHOST_INTENT_LEAVE_ROOM).to.equal("");
            chai_1.expect(GHOST_INTENT_JOIN_ROOM).to.equal("");
        }));
        it("should ignore invites, if a ghost invited", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.MembershipEvent({
                state_key: "@_puppet_1_newfox:example.org",
                sender: "@_puppet_1_newfox:example.org",
            });
            const roomId = "!blah:example.org";
            yield handler["handleInviteEvent"](roomId, event);
            chai_1.expect(GHOST_INTENT_LEAVE_ROOM).to.equal("");
            chai_1.expect(GHOST_INTENT_JOIN_ROOM).to.equal("");
        }));
        it("should ignore invites, if the corresponding room already exists", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.MembershipEvent({
                state_key: "@_puppet_1_newfox:example.org",
                sender: "@user:example.org",
            });
            const roomId = "!foxdm:example.org";
            yield handler["handleInviteEvent"](roomId, event);
            chai_1.expect(GHOST_INTENT_LEAVE_ROOM).to.equal("");
            chai_1.expect(GHOST_INTENT_JOIN_ROOM).to.equal("");
        }));
        it("should reject invites, if the protocol didn't set up the necessary hooks", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = new matrix_bot_sdk_1.MembershipEvent({
                state_key: "@_puppet_1_newfox:example.org",
                sender: "@user:example.org",
            });
            const roomId = "!blah:example.org";
            yield handler["handleInviteEvent"](roomId, event);
            chai_1.expect(GHOST_INTENT_LEAVE_ROOM).to.equal(roomId);
            chai_1.expect(GHOST_INTENT_JOIN_ROOM).to.equal("");
        }));
        it("should reject invites, if the invited mxid is un-parsable", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                createDmHook: true,
            });
            const event = new matrix_bot_sdk_1.MembershipEvent({
                state_key: "@_puppet_invalid:example.org",
                sender: "@user:example.org",
            });
            const roomId = "!blah:example.org";
            yield handler["handleInviteEvent"](roomId, event);
            chai_1.expect(GHOST_INTENT_LEAVE_ROOM).to.equal(roomId);
            chai_1.expect(GHOST_INTENT_JOIN_ROOM).to.equal("");
        }));
        it("should reject invites, if we try to invite someone elses puppet", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                createDmHook: true,
            });
            const event = new matrix_bot_sdk_1.MembershipEvent({
                state_key: "@_puppet_999_otherfox:example.org",
                sender: "@user:example.org",
            });
            const roomId = "!blah:example.org";
            yield handler["handleInviteEvent"](roomId, event);
            chai_1.expect(GHOST_INTENT_LEAVE_ROOM).to.equal(roomId);
            chai_1.expect(GHOST_INTENT_JOIN_ROOM).to.equal("");
        }));
        it("should reject invites, if no DM room ID is found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                createDmHook: true,
                getDmRoomIdHook: (parts) => __awaiter(void 0, void 0, void 0, function* () { return null; }),
            });
            const event = new matrix_bot_sdk_1.MembershipEvent({
                state_key: "@_puppet_1_newfox:example.org",
                sender: "@user:example.org",
            });
            const roomId = "!blah:example.org";
            yield handler["handleInviteEvent"](roomId, event);
            chai_1.expect(GHOST_INTENT_LEAVE_ROOM).to.equal(roomId);
            chai_1.expect(GHOST_INTENT_JOIN_ROOM).to.equal("");
        }));
        it("should reject invites, if the room already exists", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                createDmHook: true,
                getDmRoomIdHook: (parts) => __awaiter(void 0, void 0, void 0, function* () { return "fox"; }),
            });
            const event = new matrix_bot_sdk_1.MembershipEvent({
                state_key: "@_puppet_1_fox:example.org",
                sender: "@user:example.org",
            });
            const roomId = "!blah:example.org";
            yield handler["handleInviteEvent"](roomId, event);
            chai_1.expect(GHOST_INTENT_LEAVE_ROOM).to.equal(roomId);
            chai_1.expect(GHOST_INTENT_JOIN_ROOM).to.equal("");
        }));
        it("should reject invites, if the create room data doesn't match up", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                createDmHook: true,
                getDmRoomIdHook: (parts) => __awaiter(void 0, void 0, void 0, function* () { return "newfox"; }),
                createRoomHook: (parts) => __awaiter(void 0, void 0, void 0, function* () {
                    return {
                        puppetId: 42,
                        roomId: "bruhuu",
                    };
                }),
            });
            const event = new matrix_bot_sdk_1.MembershipEvent({
                state_key: "@_puppet_1_newfox:example.org",
                sender: "@user:example.org",
            });
            const roomId = "!blah:example.org";
            yield handler["handleInviteEvent"](roomId, event);
            chai_1.expect(GHOST_INTENT_LEAVE_ROOM).to.equal(roomId);
            chai_1.expect(GHOST_INTENT_JOIN_ROOM).to.equal("");
        }));
        it("should create and insert the new DM into the db, if all is ok", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                createDmHook: true,
                getDmRoomIdHook: (parts) => __awaiter(void 0, void 0, void 0, function* () { return "newfox"; }),
                createRoomHook: (parts) => __awaiter(void 0, void 0, void 0, function* () {
                    return {
                        puppetId: 1,
                        roomId: "newfox",
                        isDirect: true,
                    };
                }),
            });
            const event = new matrix_bot_sdk_1.MembershipEvent({
                state_key: "@_puppet_1_newfox:example.org",
                sender: "@user:example.org",
            });
            const roomId = "!blah:example.org";
            yield handler["handleInviteEvent"](roomId, event);
            chai_1.expect(GHOST_INTENT_LEAVE_ROOM).to.equal("");
            chai_1.expect(GHOST_INTENT_JOIN_ROOM).to.equal(roomId);
            chai_1.expect(ROOM_SYNC_INSERTED_ENTRY).to.be.true;
            chai_1.expect(ROOMSYNC_MARK_AS_DIRECT).to.equal("1;newfox");
        }));
    });
    describe("handleRoomQuery", () => {
        it("should immidiately reject the creation of a new room", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const alias = "#_puppet_1_foxroom:example.org";
            let rejected = false;
            yield handler["handleRoomQuery"](alias, (type) => __awaiter(void 0, void 0, void 0, function* () {
                rejected = !type;
            }));
            chai_1.expect(rejected).to.be.true;
        }));
        it("should ignore if the room is invalid", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const alias = "#_puppet_invalid:example.org";
            yield handler["handleRoomQuery"](alias, (type) => __awaiter(void 0, void 0, void 0, function* () { }));
            chai_1.expect(BRIDGE_ROOM_ID_BRIDGED).to.equal("");
        }));
        it("should bridge a room, if it is valid", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const alias = "#_puppet_1_foxroom:example.org";
            yield handler["handleRoomQuery"](alias, (type) => __awaiter(void 0, void 0, void 0, function* () { }));
            chai_1.expect(BRIDGE_ROOM_ID_BRIDGED).to.equal("foxroom");
        }));
    });
    describe("handlePresence", () => {
        it("should do nothing on own presence", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = {
                type: "m.presence",
                sender: "@_puppet_1_fox:example.org",
                content: {
                    presence: "online",
                },
            };
            yield handler["handlePresence"](event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql([]);
        }));
        it("should emit user presence", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const event = {
                type: "m.presence",
                sender: "@user:example.org",
                content: {
                    presence: "online",
                },
            };
            yield handler["handlePresence"](event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["presence"]);
        }));
    });
    describe("handleTyping", () => {
        it("should do typing", () => __awaiter(void 0, void 0, void 0, function* () {
            const handle = getHandler();
            let event = {
                type: "m.typing",
                content: {
                    user_ids: ["@user:example.org"],
                },
                room_id: "!room:example.org",
            };
            yield handle["handleTyping"]("!room:example.org", event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["typing"]);
            chai_1.expect(yield handle["bridge"].typingHandler.deduplicator.dedupe("1;room", "puppetGhost", undefined, "true"))
                .to.be.true;
            yield handle["handleTyping"]("!room:example.org", event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["typing"]);
            event = {
                type: "m.typing",
                content: {
                    user_ids: [],
                },
                room_id: "!room:example.org",
            };
            yield handle["handleTyping"]("!room:example.org", event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["typing", "typing"]);
            chai_1.expect(yield handle["bridge"].typingHandler.deduplicator.dedupe("1;room", "puppetGhost", undefined, "false"))
                .to.be.true;
        }));
    });
    describe("handleReceipt", () => {
        it("should do read receipts", () => __awaiter(void 0, void 0, void 0, function* () {
            const handle = getHandler();
            const event = {
                type: "m.receipt",
                room_id: "!room:example.org",
                content: {
                    "$event:example.org": {
                        "m.read": {
                            "@user:example.org": {
                                ts: 1234,
                            },
                        },
                    },
                },
            };
            yield handle["handleReceipt"]("!room:example.org", event);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).to.eql(["read"]);
        }));
    });
    describe("getRoomDisplaynameCache", () => {
        it("should return a blank object on new rooms", () => {
            const handler = getHandler();
            const ret = handler["getRoomDisplaynameCache"]("room");
            chai_1.expect(ret).eql({});
        });
        it("should return an existing entry, should it exist", () => {
            const handler = getHandler();
            handler["updateCachedRoomMemberInfo"]("room", "user", {
                displayname: "blah",
                avatar_url: "blubb",
                membership: "join",
            });
            const ret = handler["getRoomDisplaynameCache"]("room");
            chai_1.expect(ret).eql({ user: {
                    displayname: "blah",
                    avatar_url: "blubb",
                    membership: "join",
                } });
        });
    });
    describe("updateCachedRoomMemberInfo", () => {
        it("should update an entry", () => {
            const handler = getHandler();
            handler["updateCachedRoomMemberInfo"]("room", "user", {
                displayname: "blah",
                avatar_url: "blubb",
                membership: "join",
            });
            const ret = handler["getRoomDisplaynameCache"]("room");
            chai_1.expect(ret).eql({ user: {
                    displayname: "blah",
                    avatar_url: "blubb",
                    membership: "join",
                } });
        });
    });
    describe("getRoomMemberInfo", () => {
        it("should fetch members from the cache, if present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["updateCachedRoomMemberInfo"]("room", "user", {
                displayname: "blah",
                avatar_url: "blubb",
                membership: "join",
            });
            const ret = yield handler["getRoomMemberInfo"]("room", "user");
            chai_1.expect(ret).eql({
                displayname: "blah",
                avatar_url: "blubb",
                membership: "join",
            });
        }));
        it("should try to fetch from the state, if not present in cache", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const ret = yield handler["getRoomMemberInfo"]("room", "user");
            chai_1.expect(ret).eql({
                membership: "join",
                displayname: "User",
                avatar_url: "blah",
            });
        }));
    });
    describe("applyRelayFormatting", () => {
        it("should apply simple formatting", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const roomId = "room";
            const userId = "user";
            const content = {
                msgtype: "m.text",
                body: "hello world",
            };
            yield handler["applyRelayFormatting"](roomId, userId, content);
            chai_1.expect(content).eql({
                msgtype: "m.text",
                body: "User: hello world",
                formatted_body: "<strong>User</strong>: hello world",
                format: "org.matrix.custom.html",
            });
        }));
        it("should apply emote formatting", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const roomId = "room";
            const userId = "user";
            const content = {
                msgtype: "m.emote",
                body: "hello world",
            };
            yield handler["applyRelayFormatting"](roomId, userId, content);
            chai_1.expect(content).eql({
                msgtype: "m.text",
                body: "*User hello world",
                formatted_body: "*<strong>User</strong> hello world",
                format: "org.matrix.custom.html",
            });
        }));
        it("should create a fallback for files", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const roomId = "room";
            const userId = "user";
            const content = {
                msgtype: "m.file",
                body: "hello world",
                url: "mxc://somefile",
            };
            yield handler["applyRelayFormatting"](roomId, userId, content);
            chai_1.expect(content).eql({
                msgtype: "m.text",
                body: "User sent a file hello world: https://mxc://somefile",
                format: "org.matrix.custom.html",
                formatted_body: "<strong>User</strong> sent a file <em>hello world</em>: <a href=\"https://mxc://somefile\">" +
                    "https://mxc://somefile</a>",
            });
        }));
        it("should proceed into edits appropriately", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const roomId = "room";
            const userId = "user";
            const content = {
                "msgtype": "m.text",
                "body": "hello world",
                "m.new_content": {
                    msgtype: "m.text",
                    body: "hello world",
                },
            };
            yield handler["applyRelayFormatting"](roomId, userId, content);
            chai_1.expect(content).eql({
                "msgtype": "m.text",
                "body": "User: hello world",
                "format": "org.matrix.custom.html",
                "formatted_body": "<strong>User</strong>: hello world",
                "m.new_content": {
                    msgtype: "m.text",
                    body: "User: hello world",
                    formatted_body: "<strong>User</strong>: hello world",
                    format: "org.matrix.custom.html",
                },
            });
        }));
    });
});
//# sourceMappingURL=test_matrixeventhandler.js.map