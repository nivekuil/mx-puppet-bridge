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
const reactionhandler_1 = require("../src/reactionhandler");
const matrix_bot_sdk_1 = require("@sorunome/matrix-bot-sdk");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
let CLIENT_SEND_EVENT = {};
let CLIENT_SEND_EVENT_TYPE = "";
function getClient() {
    CLIENT_SEND_EVENT = {};
    CLIENT_SEND_EVENT_TYPE = "";
    return {
        sendEvent: (roomId, type, msg) => __awaiter(this, void 0, void 0, function* () {
            CLIENT_SEND_EVENT_TYPE = type;
            CLIENT_SEND_EVENT = msg;
            return "$newevent";
        }),
    };
}
let EVENT_STORE_INSERT = "";
let REACTION_STORE_INSERT = {};
let REACTION_STORE_DELETE = "";
let REACTION_STORE_DELETE_FOR_EVENT = "";
let BRIDGE_REDACT_EVENT = "";
let BRIDGE_EVENTS_EMITTED = [];
function getHandler() {
    EVENT_STORE_INSERT = "";
    REACTION_STORE_INSERT = {};
    REACTION_STORE_DELETE = "";
    REACTION_STORE_DELETE_FOR_EVENT = "";
    BRIDGE_REDACT_EVENT = "";
    BRIDGE_EVENTS_EMITTED = [];
    const bridge = {
        protocol: {
            id: "remote",
        },
        emit: (type) => {
            BRIDGE_EVENTS_EMITTED.push(type);
        },
        redactEvent: (client, roomId, eventId) => __awaiter(this, void 0, void 0, function* () {
            BRIDGE_REDACT_EVENT = `${roomId};${eventId}`;
        }),
        reactionStore: {
            exists: (entry) => __awaiter(this, void 0, void 0, function* () {
                return entry.roomId === "foxhole" && entry.userId === "fox"
                    && entry.key === "fox" && entry.eventId === "foxparty";
            }),
            getFromKey: (entry) => __awaiter(this, void 0, void 0, function* () {
                if (entry.roomId === "foxhole" && entry.userId === "fox" && entry.key === "fox" && entry.eventId === "foxparty") {
                    return {
                        puppetId: 1,
                        roomId: "foxhole",
                        userId: "fox",
                        key: "fox",
                        eventId: "foxparty",
                        reactionMxid: "$oldreaction",
                    };
                }
                return null;
            }),
            getForEvent: (puppetId, eventId) => __awaiter(this, void 0, void 0, function* () {
                if (eventId === "foxparty") {
                    return [{
                            puppetId: 1,
                            roomId: "foxhole",
                            userId: "fox",
                            key: "fox",
                            eventId: "foxparty",
                            reactionMxid: "$oldreaction",
                        }];
                }
                return [];
            }),
            insert: (entry) => __awaiter(this, void 0, void 0, function* () {
                REACTION_STORE_INSERT = entry;
            }),
            delete: (reactionMxid) => __awaiter(this, void 0, void 0, function* () {
                REACTION_STORE_DELETE = reactionMxid;
            }),
            deleteForEvent: (puppetId, eventId) => __awaiter(this, void 0, void 0, function* () {
                REACTION_STORE_DELETE_FOR_EVENT = `${puppetId};${eventId}`;
            }),
            getFromReactionMxid: (reactionMxid) => __awaiter(this, void 0, void 0, function* () {
                if (reactionMxid === "$oldreaction") {
                    return {
                        puppetId: 1,
                        roomId: "foxhole",
                        userId: "fox",
                        key: "fox",
                        eventId: "foxparty",
                        reactionMxid: "$oldreaction",
                    };
                }
                return null;
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
                EVENT_STORE_INSERT = `${room.puppetId};${room.roomId};${matrixId};${remoteId}`;
            }),
        },
        provisioner: {
            get: (puppetId) => __awaiter(this, void 0, void 0, function* () {
                if (puppetId === 1) {
                    return {
                        userId: "puppet",
                    };
                }
                return null;
            }),
        },
    };
    return new reactionhandler_1.ReactionHandler(bridge);
}
describe("ReactionHandler", () => {
    describe("addRemote", () => {
        it("should ignore if no event is found", () => __awaiter(void 0, void 0, void 0, function* () {
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
            const eventId = "nonexistant";
            const key = "newfox";
            const client = getClient();
            const mxid = "!someroom:example.org";
            yield handler.addRemote(params, eventId, key, client, mxid);
            chai_1.expect(CLIENT_SEND_EVENT).eql({});
        }));
        it("should ignore if the reaction already exists", () => __awaiter(void 0, void 0, void 0, function* () {
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
            const eventId = "foxparty";
            const key = "fox";
            const client = getClient();
            const mxid = "!someroom:example.org";
            yield handler.addRemote(params, eventId, key, client, mxid);
            chai_1.expect(CLIENT_SEND_EVENT).eql({});
        }));
        it("shoud send, should all check out", () => __awaiter(void 0, void 0, void 0, function* () {
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
            const eventId = "foxparty";
            const key = "newfox";
            const client = getClient();
            const mxid = "!someroom:example.org";
            yield handler.addRemote(params, eventId, key, client, mxid);
            chai_1.expect(CLIENT_SEND_EVENT_TYPE).to.equal("m.reaction");
            chai_1.expect(CLIENT_SEND_EVENT).eql({
                "source": "remote",
                "m.relates_to": {
                    rel_type: "m.annotation",
                    event_id: "$foxparty",
                    key: "newfox",
                },
            });
            chai_1.expect(REACTION_STORE_INSERT).eql({
                puppetId: 1,
                roomId: "foxhole",
                userId: "fox",
                eventId: "foxparty",
                reactionMxid: "$newevent",
                key: "newfox",
            });
        }));
        it("should associate a remote event id, if present", () => __awaiter(void 0, void 0, void 0, function* () {
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
                eventId: "reactevent",
            };
            const eventId = "foxparty";
            const key = "newfox";
            const client = getClient();
            const mxid = "!someroom:example.org";
            yield handler.addRemote(params, eventId, key, client, mxid);
            chai_1.expect(EVENT_STORE_INSERT).to.equal("1;foxhole;$newevent;reactevent");
        }));
        it("should set an external url, if present", () => __awaiter(void 0, void 0, void 0, function* () {
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
                externalUrl: "https://example.org",
            };
            const eventId = "foxparty";
            const key = "newfox";
            const client = getClient();
            const mxid = "!someroom:example.org";
            yield handler.addRemote(params, eventId, key, client, mxid);
            chai_1.expect(CLIENT_SEND_EVENT_TYPE).to.equal("m.reaction");
            chai_1.expect(CLIENT_SEND_EVENT).eql({
                "source": "remote",
                "m.relates_to": {
                    rel_type: "m.annotation",
                    event_id: "$foxparty",
                    key: "newfox",
                },
                "external_url": "https://example.org",
            });
        }));
    });
    describe("removeRemote", () => {
        it("should ignore if event is not found", () => __awaiter(void 0, void 0, void 0, function* () {
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
            const eventId = "nonexistant";
            const key = "fox";
            const client = getClient();
            const mxid = "!someroom:example.org";
            yield handler.removeRemote(params, eventId, key, client, mxid);
            chai_1.expect(BRIDGE_REDACT_EVENT).to.equal("");
        }));
        it("should ignore, if the key doesn't exist", () => __awaiter(void 0, void 0, void 0, function* () {
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
            const eventId = "foxparty";
            const key = "newfox";
            const client = getClient();
            const mxid = "!someroom:example.org";
            yield handler.removeRemote(params, eventId, key, client, mxid);
            chai_1.expect(BRIDGE_REDACT_EVENT).to.equal("");
        }));
        it("should redact, should all check out", () => __awaiter(void 0, void 0, void 0, function* () {
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
            const eventId = "foxparty";
            const key = "fox";
            const client = getClient();
            const mxid = "!someroom:example.org";
            yield handler.removeRemote(params, eventId, key, client, mxid);
            chai_1.expect(BRIDGE_REDACT_EVENT).to.equal("!someroom:example.org;$oldreaction");
            chai_1.expect(REACTION_STORE_DELETE).to.equal("$oldreaction");
        }));
    });
    describe("removeRemoteAllOnMessage", () => {
        it("should ignore if event is not found", () => __awaiter(void 0, void 0, void 0, function* () {
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
            const eventId = "nonexistant";
            const client = getClient();
            const mxid = "!someroom:example.org";
            yield handler.removeRemoteAllOnMessage(params, eventId, client, mxid);
            chai_1.expect(BRIDGE_REDACT_EVENT).to.equal("");
        }));
        it("should redact, should everything check out", () => __awaiter(void 0, void 0, void 0, function* () {
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
            const eventId = "foxparty";
            const client = getClient();
            const mxid = "!someroom:example.org";
            yield handler.removeRemoteAllOnMessage(params, eventId, client, mxid);
            chai_1.expect(BRIDGE_REDACT_EVENT).to.equal("!someroom:example.org;$oldreaction");
            chai_1.expect(REACTION_STORE_DELETE_FOR_EVENT).to.equal("1;foxparty");
        }));
    });
    describe("addMatrix", () => {
        it("should ignore if the remote puppet doesn't have a user id", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const room = {
                roomId: "foxhole",
                puppetId: 42,
            };
            const eventId = "foxparty";
            const reactionMxid = "$newreaction";
            const key = "fox";
            yield handler.addMatrix(room, eventId, reactionMxid, key, null);
            chai_1.expect(REACTION_STORE_INSERT).eql({});
            handler.deduplicator.dispose();
        }));
        it("should insert the event to the store, should all be fine", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const room = {
                roomId: "foxhole",
                puppetId: 1,
            };
            const eventId = "foxparty";
            const reactionMxid = "$newreaction";
            const key = "fox";
            yield handler.addMatrix(room, eventId, reactionMxid, key, null);
            chai_1.expect(REACTION_STORE_INSERT).eql({
                puppetId: 1,
                roomId: "foxhole",
                userId: "puppet",
                eventId,
                reactionMxid,
                key,
            });
            chai_1.expect(handler.deduplicator["data"].has("1;foxhole;foxparty;add;puppet;m:fox")).to.be.true;
            handler.deduplicator.dispose();
        }));
    });
    describe("handleRedactEvent", () => {
        it("should do nothing, if the event isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const room = {
                roomId: "foxhole",
                puppetId: 1,
            };
            const event = new matrix_bot_sdk_1.RedactionEvent({
                redacts: "$nonexisting",
            });
            yield handler.handleRedactEvent(room, event, null);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).eql([]);
            chai_1.expect(REACTION_STORE_DELETE).to.equal("");
            handler.deduplicator.dispose();
        }));
        it("should do nothing, if the room doesn't match", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const room = {
                roomId: "foxmeadow",
                puppetId: 1,
            };
            const event = new matrix_bot_sdk_1.RedactionEvent({
                redacts: "$oldreaction",
            });
            yield handler.handleRedactEvent(room, event, null);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).eql([]);
            chai_1.expect(REACTION_STORE_DELETE).to.equal("");
            handler.deduplicator.dispose();
        }));
        it("should redact the event, is all fine", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const room = {
                roomId: "foxhole",
                puppetId: 1,
            };
            const event = new matrix_bot_sdk_1.RedactionEvent({
                redacts: "$oldreaction",
            });
            yield handler.handleRedactEvent(room, event, null);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).eql(["removeReaction"]);
            chai_1.expect(REACTION_STORE_DELETE).to.equal("$oldreaction");
            chai_1.expect(handler.deduplicator["data"].has("1;foxhole;foxparty;remove;puppet;m:fox")).to.be.true;
            handler.deduplicator.dispose();
        }));
    });
});
//# sourceMappingURL=test_reactionhandler.js.map