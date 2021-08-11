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
const proxyquire = require("proxyquire");
const prometheus = require("prom-client");
const messagededuplicator_1 = require("../src/structures/messagededuplicator");
const DEDUPLICATOR_TIMEOUT = 100;
let CLIENT_SEND_READ_RECEIPT = "";
let CLIENT_SEND_MESSAGE = {};
let CLIENT_INVITE_USER = "";
let CLIENT_JOIN_ROOM = "";
function getClient(mxid) {
    CLIENT_SEND_READ_RECEIPT = "";
    CLIENT_SEND_MESSAGE = {};
    CLIENT_INVITE_USER = "";
    CLIENT_JOIN_ROOM = "";
    return {
        getUserId: () => __awaiter(this, void 0, void 0, function* () { return mxid; }),
        sendReadReceipt: (roomId, eventId) => __awaiter(this, void 0, void 0, function* () {
            CLIENT_SEND_READ_RECEIPT = `${roomId};${eventId}`;
        }),
        sendMessage: (roomId, msg) => __awaiter(this, void 0, void 0, function* () {
            CLIENT_SEND_MESSAGE = msg;
            return "$newevent";
        }),
        inviteUser: (userId, roomId) => __awaiter(this, void 0, void 0, function* () {
            CLIENT_INVITE_USER = `${userId};${roomId}`;
        }),
        joinRoom: (roomId) => __awaiter(this, void 0, void 0, function* () {
            CLIENT_JOIN_ROOM = roomId;
        }),
    };
}
let INTENT_REGISTERED_AND_JOINED = "";
let INTENT_LEAVE_ROOM = "";
function getIntent(userId) {
    INTENT_REGISTERED_AND_JOINED = "";
    INTENT_LEAVE_ROOM = "";
    return {
        ensureRegisteredAndJoined: (mxid) => __awaiter(this, void 0, void 0, function* () {
            INTENT_REGISTERED_AND_JOINED = mxid;
        }),
        underlyingClient: getClient(userId),
        leaveRoom: (mxid) => __awaiter(this, void 0, void 0, function* () {
            INTENT_LEAVE_ROOM = mxid;
        }),
    };
}
let PRESENCE_HANDLER_SET = "";
let PRESENCE_HANDLER_SET_STATUS = "";
let TYPING_HANDLER_SET = "";
let EVENT_STORE_INSERT = "";
let BRIDGE_REDACT_EVENT = "";
let REACTION_HANDLER_ADD_REMOTE = false;
let REACTION_HANDLER_REMOVE_REMOTE = false;
let REACTION_HANDLER_REMOVE_REMOTE_ALL = false;
let USER_SYNC_SET_ROOM_OVERRIDE = "";
let ROOMSYNC_MAYBE_LEAVE_GHOST = "";
let DELAYED_FUNCTION_SET = () => __awaiter(void 0, void 0, void 0, function* () { });
function getHandler(opts) {
    if (!opts) {
        opts = {};
    }
    PRESENCE_HANDLER_SET = "";
    PRESENCE_HANDLER_SET_STATUS = "";
    TYPING_HANDLER_SET = "";
    EVENT_STORE_INSERT = "";
    BRIDGE_REDACT_EVENT = "";
    REACTION_HANDLER_ADD_REMOTE = false;
    REACTION_HANDLER_REMOVE_REMOTE = false;
    REACTION_HANDLER_REMOVE_REMOTE_ALL = false;
    USER_SYNC_SET_ROOM_OVERRIDE = "";
    ROOMSYNC_MAYBE_LEAVE_GHOST = "";
    DELAYED_FUNCTION_SET = () => __awaiter(this, void 0, void 0, function* () { });
    const bridge = {
        protocol: {
            id: "remote",
            features: {
                presence: opts.enablePresence,
            },
        },
        config: {
            bridge: {
                stripHomeservers: ["badserver.org"],
            },
            presence: {
                enabled: opts.enablePresence,
            },
        },
        hooks: {},
        namespaceHandler: {
            isMessageBlocked: (params) => __awaiter(this, void 0, void 0, function* () {
                return Boolean(opts.blockMessage);
            }),
            getRoomPuppetUserIds: (room) => __awaiter(this, void 0, void 0, function* () {
                return new Set(["puppet"]);
            }),
        },
        redactEvent: (client, roomId, eventId) => __awaiter(this, void 0, void 0, function* () {
            BRIDGE_REDACT_EVENT = `${roomId};${eventId}`;
        }),
        uploadContent: (client, buffer, mimetype, name) => __awaiter(this, void 0, void 0, function* () { return "mxc://newfile/example.org"; }),
        botIntent: getIntent("@_puppet_bot:example.org"),
        AS: {
            isNamespacedUser: (userId) => userId.startsWith("@_puppet"),
            getIntentForUserId: (userId) => getIntent(userId),
        },
        userSync: {
            getPuppetClient: (puppetId) => __awaiter(this, void 0, void 0, function* () {
                if (!opts.doublePuppeting) {
                    return null;
                }
                return getClient("@user:example.org");
            }),
            maybeGetClient: (user) => __awaiter(this, void 0, void 0, function* () {
                if (user.puppetId === 1 && user.userId === "fox") {
                    return getClient("@_puppet_1_fox:example.org");
                }
                return null;
            }),
            getClient: (user) => __awaiter(this, void 0, void 0, function* () {
                if (user.userId === "puppet" && opts.doublePuppeting) {
                    return getClient("@user:example.org");
                }
                return getClient(`@_puppet_${user.puppetId}_${user.userId}:example.org`);
            }),
            setRoomOverride: (user, roomId) => __awaiter(this, void 0, void 0, function* () {
                USER_SYNC_SET_ROOM_OVERRIDE = `${user.userId};${roomId}`;
            }),
        },
        roomSync: {
            maybeGetMxid: (room) => __awaiter(this, void 0, void 0, function* () {
                if (room.puppetId === 1 && room.roomId === "foxhole") {
                    return "!someroom:example.org";
                }
                return null;
            }),
            getMxid: (room, client, doCreate = true) => __awaiter(this, void 0, void 0, function* () {
                if (!doCreate) {
                    if (room.puppetId === 1 && room.roomId === "foxhole") {
                        return {
                            mxid: "!someroom:example.org",
                            created: false,
                        };
                    }
                    return {
                        mxid: "",
                        created: false,
                    };
                }
                return {
                    mxid: "!someroom:example.org",
                    created: room.roomId === "newfoxhole" || opts.roomCreated,
                };
            }),
            getRoomOp: (roomId) => __awaiter(this, void 0, void 0, function* () { return getClient("@_puppet_1_op:example.org"); }),
            maybeLeaveGhost: (roomId, userId) => __awaiter(this, void 0, void 0, function* () {
                ROOMSYNC_MAYBE_LEAVE_GHOST = `${userId};${roomId}`;
            }),
        },
        presenceHandler: {
            set: (userId, presence) => __awaiter(this, void 0, void 0, function* () {
                PRESENCE_HANDLER_SET = `${userId};${presence}`;
            }),
            setStatus: (userId, status) => __awaiter(this, void 0, void 0, function* () {
                PRESENCE_HANDLER_SET_STATUS = `${userId};${status}`;
            }),
        },
        typingHandler: {
            deduplicator: new messagededuplicator_1.MessageDeduplicator(DEDUPLICATOR_TIMEOUT, DEDUPLICATOR_TIMEOUT + DEDUPLICATOR_TIMEOUT),
            set: (userId, mxid, typing) => __awaiter(this, void 0, void 0, function* () {
                TYPING_HANDLER_SET = `${userId};${mxid};${typing}`;
            }),
        },
        eventSync: {
            getMatrix: (room, eventId) => __awaiter(this, void 0, void 0, function* () {
                if (eventId === "foxparty") {
                    return ["$foxparty"];
                }
                return [];
            }),
            insert: (room, matrixId, remoteId) => __awaiter(this, void 0, void 0, function* () {
                EVENT_STORE_INSERT = `${room.puppetId}|${room.roomId}|${matrixId}|${remoteId}`;
            }),
        },
        reactionHandler: {
            deduplicator: new messagededuplicator_1.MessageDeduplicator(DEDUPLICATOR_TIMEOUT, DEDUPLICATOR_TIMEOUT + DEDUPLICATOR_TIMEOUT),
            addRemote: (params, eventId, key, client, mxid) => __awaiter(this, void 0, void 0, function* () {
                REACTION_HANDLER_ADD_REMOTE = true;
            }),
            removeRemote: (params, eventId, key, client, mxid) => __awaiter(this, void 0, void 0, function* () {
                REACTION_HANDLER_REMOVE_REMOTE = true;
            }),
            removeRemoteAllOnMessage: (params, eventId, client, mxid) => __awaiter(this, void 0, void 0, function* () {
                REACTION_HANDLER_REMOVE_REMOTE_ALL = true;
            }),
        },
        provisioner: {
            get: (puppetId) => __awaiter(this, void 0, void 0, function* () {
                if (puppetId === 1) {
                    return {
                        puppetMxid: "@user:example.org",
                        userId: "puppet",
                        autoinvite: !opts.noautoinvite,
                    };
                }
                return null;
            }),
        },
        delayedFunction: {
            set: (key, fn, timeout, opt) => {
                DELAYED_FUNCTION_SET = fn;
            },
        },
        getEventInfo: (roomId, eventId, client) => __awaiter(this, void 0, void 0, function* () {
            if (eventId !== "$foxparty") {
                return null;
            }
            return {
                message: {
                    body: "Foxing around",
                },
                user: {
                    mxid: "@fox:example.org",
                },
            };
        }),
        metrics: {},
    };
    const RemoteEventHandler = proxyquire.load("../src/remoteeventhandler", {
        "./util": { Util: {
                DownloadFile: (url) => __awaiter(this, void 0, void 0, function* () { return Buffer.from(url); }),
                GetMimeType: (buffer) => buffer.toString(),
            } },
    }).RemoteEventHandler;
    prometheus.register.clear();
    return new RemoteEventHandler(bridge);
}
describe("RemoteEventHandler", () => {
    describe("setUserPresence", () => {
        it("should do nothing, if the feature is disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const user = {
                userId: "fox",
                puppetId: 1,
            };
            yield handler.setUserPresence(user, "online");
            chai_1.expect(PRESENCE_HANDLER_SET).to.equal("");
        }));
        it("should do nothing, if the user is not found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({ enablePresence: true });
            const user = {
                userId: "nofox",
                puppetId: 1,
            };
            yield handler.setUserPresence(user, "online");
            chai_1.expect(PRESENCE_HANDLER_SET).to.equal("");
        }));
        it("should set presence, if all checks out", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({ enablePresence: true });
            const user = {
                userId: "fox",
                puppetId: 1,
            };
            yield handler.setUserPresence(user, "online");
            chai_1.expect(PRESENCE_HANDLER_SET).to.equal("@_puppet_1_fox:example.org;online");
        }));
    });
    describe("setUserStatus", () => {
        it("should do nothing, if the feature is disabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const user = {
                userId: "fox",
                puppetId: 1,
            };
            yield handler.setUserStatus(user, "online");
            chai_1.expect(PRESENCE_HANDLER_SET_STATUS).to.equal("");
        }));
        it("should do nothing, if the user is not found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({ enablePresence: true });
            const user = {
                userId: "nofox",
                puppetId: 1,
            };
            yield handler.setUserStatus(user, "online");
            chai_1.expect(PRESENCE_HANDLER_SET_STATUS).to.equal("");
        }));
        it("should set the status, if all checks out", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({ enablePresence: true });
            const user = {
                userId: "fox",
                puppetId: 1,
            };
            yield handler.setUserStatus(user, "online");
            chai_1.expect(PRESENCE_HANDLER_SET_STATUS).to.equal("@_puppet_1_fox:example.org;online");
        }));
    });
    describe("SetUserTyping", () => {
        it("should do nothing, if the thing is blocked", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                blockMessage: true,
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            handler["maybePrepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            yield handler.setUserTyping(params, true);
            chai_1.expect(TYPING_HANDLER_SET).to.equal("");
        }));
        it("should do nothing, if the user/room isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["maybePrepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () { return null; });
            const params = {
                user: {
                    userId: "nofox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            yield handler.setUserTyping(params, true);
            chai_1.expect(TYPING_HANDLER_SET).to.equal("");
        }));
        it("should do nothing, if it is deduped", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["maybePrepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            handler["bridge"].typingHandler.deduplicator.lock("1;foxhole", "fox", "true");
            yield handler.setUserTyping(params, true);
            chai_1.expect(TYPING_HANDLER_SET).to.equal("");
        }));
        it("should set typing, if all checks out", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["maybePrepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            yield handler.setUserTyping(params, true);
            chai_1.expect(TYPING_HANDLER_SET).to.equal("@_puppet_1_fox:example.org;!someroom:example.org;true");
        }));
    });
    describe("sendReadReceipt", () => {
        it("should do nothing, if the thing is blocked", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                blockMessage: true,
            });
            handler["maybePrepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
                eventId: "foxparty",
            };
            yield handler.sendReadReceipt(params);
            chai_1.expect(CLIENT_SEND_READ_RECEIPT).to.equal("");
        }));
        it("should do nothing, if the user/room isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["maybePrepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () { return null; });
            const params = {
                user: {
                    userId: "nofox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
                eventId: "foxparty",
            };
            yield handler.sendReadReceipt(params);
            chai_1.expect(CLIENT_SEND_READ_RECEIPT).to.equal("");
        }));
        it("should do nothing, if no event ID is set", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["maybePrepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            yield handler.sendReadReceipt(params);
            chai_1.expect(CLIENT_SEND_READ_RECEIPT).to.equal("");
        }));
        it("should do nothing, if the set event ID isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["maybePrepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
                eventId: "nonexistant",
            };
            yield handler.sendReadReceipt(params);
            chai_1.expect(CLIENT_SEND_READ_RECEIPT).to.equal("");
        }));
        it("should send the read reciept, should all check out", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["maybePrepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
                eventId: "foxparty",
            };
            yield handler.sendReadReceipt(params);
            chai_1.expect(CLIENT_SEND_READ_RECEIPT).to.equal("!someroom:example.org;$foxparty");
        }));
    });
    describe("addUser", () => {
        it("should do nothing, if the room isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "nofoxhole",
                    puppetId: 1,
                },
            };
            yield handler.addUser(params);
            chai_1.expect(INTENT_REGISTERED_AND_JOINED).to.equal("");
        }));
        it("should do nothing, if the user is the puppet", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const params = {
                user: {
                    userId: "puppet",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            yield handler.addUser(params);
            chai_1.expect(INTENT_REGISTERED_AND_JOINED).to.equal("");
        }));
        it("should add the user, should all check out", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            yield handler.addUser(params);
            chai_1.expect(INTENT_REGISTERED_AND_JOINED).to.equal("!someroom:example.org");
        }));
    });
    describe("removeUser", () => {
        it("should do nothing, if the stuff isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            handler["maybePrepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () { return null; });
            yield handler.removeUser(params);
            chai_1.expect(INTENT_LEAVE_ROOM).to.equal("");
        }));
        it("should remove the user, should all check out", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            handler["maybePrepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            yield handler.removeUser(params);
            chai_1.expect(ROOMSYNC_MAYBE_LEAVE_GHOST).to.equal("@_puppet_1_fox:example.org;!someroom:example.org");
        }));
    });
    describe("sendMessage", () => {
        it("should do nothing, if the thing is blocked", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                blockMessage: true,
            });
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendMessage(params, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({});
        }));
        it("should send a plain message", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendMessage(params, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                msgtype: "m.text",
                body: "Hey there!",
                source: "remote",
            });
        }));
        it("should send notice and emote messages", () => __awaiter(void 0, void 0, void 0, function* () {
            for (const type of ["notice", "emote"]) {
                const handler = getHandler();
                handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                    return {
                        client: getClient("@_puppet_1_fox:example.org"),
                        mxid: "!someroom:example.org",
                    };
                });
                const params = {
                    user: {
                        userId: "fox",
                        puppetId: 1,
                    },
                    room: {
                        roomId: "foxhole",
                        puppetId: 1,
                    },
                };
                const msg = {
                    body: "Hey there!",
                };
                msg[type] = true;
                yield handler.sendMessage(params, msg);
                chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                    msgtype: "m." + type,
                    body: "Hey there!",
                    source: "remote",
                });
            }
        }));
        it("should send a formatted body, if present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const msg = {
                body: "Hey there!",
                formattedBody: "<strong>Hey there!</strong>",
            };
            yield handler.sendMessage(params, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                msgtype: "m.text",
                body: "Hey there!",
                source: "remote",
                format: "org.matrix.custom.html",
                formatted_body: "<strong>Hey there!</strong>",
            });
        }));
        it("should set an external URL, if present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
                externalUrl: "https://example.org",
            };
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendMessage(params, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                msgtype: "m.text",
                body: "Hey there!",
                source: "remote",
                external_url: "https://example.org",
            });
        }));
        it("should associate the new event ID, if present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
                eventId: "newevent",
            };
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendMessage(params, msg);
            chai_1.expect(EVENT_STORE_INSERT).to.equal("1|foxhole|$newevent|newevent");
        }));
        it("should stop the typing indicator", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendMessage(params, msg);
            chai_1.expect(TYPING_HANDLER_SET).to.equal("@_puppet_1_fox:example.org;!someroom:example.org;false");
        }));
    });
    describe("sendEdit", () => {
        it("should do nothing, if the thing is blocked", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                blockMessage: true,
            });
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendEdit(params, eventId, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({});
        }));
        it("should send a plain edit", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendEdit(params, eventId, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                "msgtype": "m.text",
                "body": "* Hey there!",
                "source": "remote",
                "m.new_content": {
                    msgtype: "m.text",
                    body: "Hey there!",
                },
                "m.relates_to": {
                    event_id: "$foxparty",
                    rel_type: "m.replace",
                },
            });
        }));
        it("should send notice and emote edits", () => __awaiter(void 0, void 0, void 0, function* () {
            for (const type of ["notice", "emote"]) {
                const handler = getHandler();
                handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                    return {
                        client: getClient("@_puppet_1_fox:example.org"),
                        mxid: "!someroom:example.org",
                    };
                });
                const params = {
                    user: {
                        userId: "fox",
                        puppetId: 1,
                    },
                    room: {
                        roomId: "foxhole",
                        puppetId: 1,
                    },
                };
                const eventId = "foxparty";
                const msg = {
                    body: "Hey there!",
                };
                msg[type] = true;
                yield handler.sendEdit(params, eventId, msg);
                chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                    "msgtype": "m." + type,
                    "body": "* Hey there!",
                    "source": "remote",
                    "m.new_content": {
                        msgtype: "m." + type,
                        body: "Hey there!",
                    },
                    "m.relates_to": {
                        event_id: "$foxparty",
                        rel_type: "m.replace",
                    },
                });
            }
        }));
        it("should send a formatted body, if present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const msg = {
                body: "Hey there!",
                formattedBody: "<strong>Hey there!</strong>",
            };
            yield handler.sendEdit(params, eventId, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                "msgtype": "m.text",
                "source": "remote",
                "body": "* Hey there!",
                "format": "org.matrix.custom.html",
                "formatted_body": "* <strong>Hey there!</strong>",
                "m.new_content": {
                    msgtype: "m.text",
                    body: "Hey there!",
                    format: "org.matrix.custom.html",
                    formatted_body: "<strong>Hey there!</strong>",
                },
                "m.relates_to": {
                    event_id: "$foxparty",
                    rel_type: "m.replace",
                },
            });
        }));
        it("should set an external URL, if present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
                externalUrl: "https://example.org",
            };
            const eventId = "foxparty";
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendEdit(params, eventId, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                "msgtype": "m.text",
                "source": "remote",
                "body": "* Hey there!",
                "external_url": "https://example.org",
                "m.new_content": {
                    msgtype: "m.text",
                    body: "Hey there!",
                    external_url: "https://example.org",
                },
                "m.relates_to": {
                    event_id: "$foxparty",
                    rel_type: "m.replace",
                },
            });
        }));
        it("should associate the new event ID, if present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
                eventId: "newevent",
            };
            const eventId = "foxparty";
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendEdit(params, eventId, msg);
            chai_1.expect(EVENT_STORE_INSERT).to.equal("1|foxhole|$newevent|newevent");
        }));
        it("should fall back to normal messages, if the remote event isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "nonexistant";
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendEdit(params, eventId, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                "msgtype": "m.text",
                "body": "* Hey there!",
                "source": "remote",
                "m.new_content": {
                    msgtype: "m.text",
                    body: "Hey there!",
                },
            });
        }));
        it("should stop the typing indicator", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendEdit(params, eventId, msg);
            chai_1.expect(TYPING_HANDLER_SET).to.equal("@_puppet_1_fox:example.org;!someroom:example.org;false");
        }));
    });
    describe("sendRedact", () => {
        it("should do nothing, if the thing is blocked", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                blockMessage: true,
            });
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            yield handler.sendRedact(params, eventId);
            chai_1.expect(BRIDGE_REDACT_EVENT).to.equal("");
        }));
        it("should do nothing, if no remote events are found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "nonexistant";
            yield handler.sendRedact(params, eventId);
            chai_1.expect(BRIDGE_REDACT_EVENT).to.equal("");
        }));
        it("should redact an associated event", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            yield handler.sendRedact(params, eventId);
            chai_1.expect(BRIDGE_REDACT_EVENT).to.equal("!someroom:example.org;$foxparty");
        }));
    });
    describe("sendReply", () => {
        it("should do nothing, if the thing is blocked", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                blockMessage: true,
            });
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendReply(params, eventId, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({});
        }));
        it("should send a plain reply", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendReply(params, eventId, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                "msgtype": "m.text",
                "source": "remote",
                "body": "> <@fox:example.org> Foxing around\n\nHey there!",
                "format": "org.matrix.custom.html",
                "formatted_body": `<mx-reply><blockquote>
	<a href=\"https://matrix.to/#/!someroom:example.org/$foxparty\">In reply to</a>
	<a href=\"https://matrix.to/#/@fox:example.org\">@fox:example.org</a>
	<br>Foxing around
</blockquote></mx-reply>Hey there!`,
                "m.relates_to": {
                    "m.in_reply_to": {
                        event_id: "$foxparty",
                    },
                },
            });
        }));
        it("should send notice and emote replies", () => __awaiter(void 0, void 0, void 0, function* () {
            for (const type of ["notice", "emote"]) {
                const handler = getHandler();
                handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                    return {
                        client: getClient("@_puppet_1_fox:example.org"),
                        mxid: "!someroom:example.org",
                    };
                });
                const params = {
                    user: {
                        userId: "fox",
                        puppetId: 1,
                    },
                    room: {
                        roomId: "foxhole",
                        puppetId: 1,
                    },
                };
                const eventId = "foxparty";
                const msg = {
                    body: "Hey there!",
                };
                msg[type] = true;
                yield handler.sendReply(params, eventId, msg);
                chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                    "msgtype": "m." + type,
                    "source": "remote",
                    "body": "> <@fox:example.org> Foxing around\n\nHey there!",
                    "format": "org.matrix.custom.html",
                    "formatted_body": `<mx-reply><blockquote>
	<a href=\"https://matrix.to/#/!someroom:example.org/$foxparty\">In reply to</a>
	<a href=\"https://matrix.to/#/@fox:example.org\">@fox:example.org</a>
	<br>Foxing around
</blockquote></mx-reply>Hey there!`,
                    "m.relates_to": {
                        "m.in_reply_to": {
                            event_id: "$foxparty",
                        },
                    },
                });
            }
        }));
        it("should send a formatted body, if present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const msg = {
                body: "Hey there!",
                formattedBody: "<strong>Hey there!</strong>",
            };
            yield handler.sendReply(params, eventId, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                "msgtype": "m.text",
                "source": "remote",
                "body": "> <@fox:example.org> Foxing around\n\nHey there!",
                "format": "org.matrix.custom.html",
                "formatted_body": `<mx-reply><blockquote>
	<a href=\"https://matrix.to/#/!someroom:example.org/$foxparty\">In reply to</a>
	<a href=\"https://matrix.to/#/@fox:example.org\">@fox:example.org</a>
	<br>Foxing around
</blockquote></mx-reply><strong>Hey there!</strong>`,
                "m.relates_to": {
                    "m.in_reply_to": {
                        event_id: "$foxparty",
                    },
                },
            });
        }));
        it("should set an external URL, if present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
                externalUrl: "https://example.org",
            };
            const eventId = "foxparty";
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendReply(params, eventId, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                "msgtype": "m.text",
                "source": "remote",
                "body": "> <@fox:example.org> Foxing around\n\nHey there!",
                "format": "org.matrix.custom.html",
                "formatted_body": `<mx-reply><blockquote>
	<a href=\"https://matrix.to/#/!someroom:example.org/$foxparty\">In reply to</a>
	<a href=\"https://matrix.to/#/@fox:example.org\">@fox:example.org</a>
	<br>Foxing around
</blockquote></mx-reply>Hey there!`,
                "external_url": "https://example.org",
                "m.relates_to": {
                    "m.in_reply_to": {
                        event_id: "$foxparty",
                    },
                },
            });
        }));
        it("should associate the new event ID, if present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
                eventId: "newevent",
            };
            const eventId = "foxparty";
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendReply(params, eventId, msg);
            chai_1.expect(EVENT_STORE_INSERT).to.equal("1|foxhole|$newevent|newevent");
        }));
        it("should fall back to normal messages, if the remote event isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "nonexistant";
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendReply(params, eventId, msg);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                msgtype: "m.text",
                body: "Hey there!",
                format: "org.matrix.custom.html",
                formatted_body: "Hey there!",
                source: "remote",
            });
        }));
        it("should stop the typing indicator", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const msg = {
                body: "Hey there!",
            };
            yield handler.sendReply(params, eventId, msg);
            chai_1.expect(TYPING_HANDLER_SET).to.equal("@_puppet_1_fox:example.org;!someroom:example.org;false");
        }));
    });
    describe("sendReaction", () => {
        it("should do nothing, if the thing is blocked", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                blockMessage: true,
            });
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const key = "fox";
            yield handler.sendReaction(params, eventId, key);
            chai_1.expect(REACTION_HANDLER_ADD_REMOTE).to.be.false;
        }));
        it("should do nothing, if the thing is deduplicated", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const key = "fox";
            handler["bridge"].reactionHandler.deduplicator.lock("1;foxhole;foxparty;add", "fox", "fox");
            yield handler.sendReaction(params, eventId, key);
            chai_1.expect(REACTION_HANDLER_ADD_REMOTE).to.be.false;
        }));
        it("should pass the request on to the reaction handler", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const key = "fox";
            yield handler.sendReaction(params, eventId, key);
            chai_1.expect(REACTION_HANDLER_ADD_REMOTE).to.be.true;
        }));
    });
    describe("removeReaction", () => {
        it("should do nothing, if the thing is blocked", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                blockMessage: true,
            });
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const key = "fox";
            yield handler.removeReaction(params, eventId, key);
            chai_1.expect(REACTION_HANDLER_REMOVE_REMOTE).to.be.false;
        }));
        it("should do nothing, if the thing is deduplicated", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const key = "fox";
            handler["bridge"].reactionHandler.deduplicator.lock("1;foxhole;foxparty;remove", "fox", "fox");
            yield handler.removeReaction(params, eventId, key);
            chai_1.expect(REACTION_HANDLER_REMOVE_REMOTE).to.be.false;
        }));
        it("should pass the request on to the reaction handler", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            const key = "fox";
            yield handler.removeReaction(params, eventId, key);
            chai_1.expect(REACTION_HANDLER_REMOVE_REMOTE).to.be.true;
        }));
    });
    describe("removeAllReactions", () => {
        it("should do nothing, if the thing is blocked", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                blockMessage: true,
            });
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            yield handler.removeAllReactions(params, eventId);
            chai_1.expect(REACTION_HANDLER_REMOVE_REMOTE_ALL).to.be.false;
        }));
        it("should pass the request on to the reaction handler", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const eventId = "foxparty";
            yield handler.removeAllReactions(params, eventId);
            chai_1.expect(REACTION_HANDLER_REMOVE_REMOTE_ALL).to.be.true;
        }));
    });
    describe("sendFileByType", () => {
        it("should do nothing, if the thing is blocked", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                blockMessage: true,
            });
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const thing = Buffer.from("myfile");
            yield handler.sendFileByType("m.file", params, thing);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({});
        }));
        it("should send a file by msgtype", () => __awaiter(void 0, void 0, void 0, function* () {
            for (const msgtype of ["m.file", "m.image", "m.audio", "m.video"]) {
                const handler = getHandler();
                handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                    return {
                        client: getClient("@_puppet_1_fox:example.org"),
                        mxid: "!someroom:example.org",
                    };
                });
                const params = {
                    user: {
                        userId: "fox",
                        puppetId: 1,
                    },
                    room: {
                        roomId: "foxhole",
                        puppetId: 1,
                    },
                };
                const thing = Buffer.from("myfile");
                yield handler.sendFileByType(msgtype, params, thing);
                chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                    msgtype,
                    source: "remote",
                    body: "remote_file",
                    url: "mxc://newfile/example.org",
                    info: {
                        mimetype: "myfile",
                        size: 6,
                    },
                });
            }
        }));
        it("should autodetect the type, if specified", () => __awaiter(void 0, void 0, void 0, function* () {
            for (const type of ["file", "audio", "image", "video"]) {
                const handler = getHandler();
                handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                    return {
                        client: getClient("@_puppet_1_fox:example.org"),
                        mxid: "!someroom:example.org",
                    };
                });
                const params = {
                    user: {
                        userId: "fox",
                        puppetId: 1,
                    },
                    room: {
                        roomId: "foxhole",
                        puppetId: 1,
                    },
                };
                const thing = Buffer.from(type + "/blah");
                yield handler.sendFileByType("detect", params, thing);
                chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                    msgtype: "m." + type,
                    source: "remote",
                    body: "remote_file",
                    url: "mxc://newfile/example.org",
                    info: {
                        mimetype: type + "/blah",
                        size: type.length + 5,
                    },
                });
            }
        }));
        it("should download a remote URL and set external_url, if set", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const thing = "image/jpeg";
            yield handler.sendFileByType("detect", params, thing);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                msgtype: "m.image",
                source: "remote",
                body: "remote_file",
                external_url: "image/jpeg",
                url: "mxc://newfile/example.org",
                info: {
                    mimetype: "image/jpeg",
                    size: 10,
                },
            });
        }));
        it("should set a custom external URL, if set", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
                externalUrl: "https://example.org",
            };
            const thing = "image/jpeg";
            yield handler.sendFileByType("detect", params, thing);
            chai_1.expect(CLIENT_SEND_MESSAGE).eql({
                msgtype: "m.image",
                source: "remote",
                body: "remote_file",
                external_url: "https://example.org",
                url: "mxc://newfile/example.org",
                info: {
                    mimetype: "image/jpeg",
                    size: 10,
                },
            });
        }));
        it("should associate an event ID, if present", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
                eventId: "newevent",
            };
            const thing = "image/jpeg";
            yield handler.sendFileByType("detect", params, thing);
            chai_1.expect(EVENT_STORE_INSERT).to.equal("1|foxhole|$newevent|newevent");
        }));
        it("should stop the typing indicator", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["prepareSend"] = (_) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    client: getClient("@_puppet_1_fox:example.org"),
                    mxid: "!someroom:example.org",
                };
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const thing = Buffer.from("myfile");
            yield handler.sendFileByType("m.file", params, thing);
            chai_1.expect(TYPING_HANDLER_SET).to.equal("@_puppet_1_fox:example.org;!someroom:example.org;false");
        }));
    });
    describe("maybePrepareSend", () => {
        it("should return null if the room isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "nonexistant",
                    puppetId: 1,
                },
            };
            const ret = yield handler["maybePrepareSend"](params);
            chai_1.expect(ret).to.be.null;
        }));
        it("should return null if the user isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const params = {
                user: {
                    userId: "nonexistant",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const ret = yield handler["maybePrepareSend"](params);
            chai_1.expect(ret).to.be.null;
        }));
        it("should return client and mxid, if both are found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const ret = yield handler["maybePrepareSend"](params);
            chai_1.expect(ret.mxid).to.equal("!someroom:example.org");
            chai_1.expect(yield ret.client.getUserId()).to.equal("@_puppet_1_fox:example.org");
        }));
    });
    describe("prepareSend", () => {
        it("should return the mxid and the client", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            const ret = yield handler["prepareSend"](params);
            chai_1.expect(ret.mxid).to.equal("!someroom:example.org");
            chai_1.expect(yield ret.client.getUserId()).to.equal("@_puppet_1_fox:example.org");
        }));
        it("should join the ghost to rooms", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            yield handler["prepareSend"](params);
            chai_1.expect(INTENT_REGISTERED_AND_JOINED).to.equal("!someroom:example.org");
        }));
        it("should apply room overrides for the ghost, if the room just got created", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                roomCreated: true,
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "newfoxhole",
                    puppetId: 1,
                },
            };
            yield handler["prepareSend"](params);
            chai_1.expect(USER_SYNC_SET_ROOM_OVERRIDE).to.equal("fox;newfoxhole");
        }));
        it("should delay-leave the ghost of the puppet", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const params = {
                user: {
                    userId: "puppet",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            yield handler["prepareSend"](params);
            yield DELAYED_FUNCTION_SET();
            chai_1.expect(ROOMSYNC_MAYBE_LEAVE_GHOST).to.equal("@_puppet_1_puppet:example.org;!someroom:example.org");
        }));
        it("should invite the puppet", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            yield handler["prepareSend"](params);
            chai_1.expect(CLIENT_INVITE_USER).to.equal("@user:example.org;!someroom:example.org");
        }));
        it("should auto-join the room, if double-puppeting is enabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                doublePuppeting: true,
            });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            yield handler["prepareSend"](params);
            chai_1.expect(CLIENT_JOIN_ROOM).to.equal("!someroom:example.org");
        }));
        it("should not invite the puppet, if set", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({ noautoinvite: true });
            const params = {
                user: {
                    userId: "fox",
                    puppetId: 1,
                },
                room: {
                    roomId: "foxhole",
                    puppetId: 1,
                },
            };
            yield handler["prepareSend"](params);
            chai_1.expect(CLIENT_INVITE_USER).to.equal("");
        }));
    });
    describe("preprocessMessageEvent", () => {
        it("should strip bad homeserver URLs from mxids", () => {
            const handler = getHandler();
            const opts = {
                body: "hmm @user:badserver.org, how are you today?",
            };
            handler.preprocessMessageEvent(opts);
            chai_1.expect(opts.body).to.equal("hmm @user, how are you today?");
        });
        it("should not strip other homeserver URLs from mxids", () => {
            const handler = getHandler();
            const opts = {
                body: "hmm @user:goodserver.org, how are you today?",
            };
            handler.preprocessMessageEvent(opts);
            chai_1.expect(opts.body).to.equal("hmm @user:goodserver.org, how are you today?");
        });
    });
});
//# sourceMappingURL=test_remoteeventhandler.js.map