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
const presencehandler_1 = require("../src/presencehandler");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
let CLIENT_REQUEST_METHOD = "";
let CLIENT_REQUEST_URL = "";
let CLIENT_REQUEST_DATA = {};
let CLIENT_STATE_EVENT_TYPE = "";
let CLIENT_STATE_EVENT_KEY = "";
let CLIENT_STATE_EVENT_DATA = {};
function getClient(userId) {
    CLIENT_REQUEST_METHOD = "";
    CLIENT_REQUEST_URL = "";
    CLIENT_REQUEST_DATA = {};
    CLIENT_STATE_EVENT_TYPE = "";
    CLIENT_STATE_EVENT_KEY = "";
    CLIENT_STATE_EVENT_DATA = {};
    return {
        getUserId: () => __awaiter(this, void 0, void 0, function* () { return userId; }),
        doRequest: (method, url, qs, data) => __awaiter(this, void 0, void 0, function* () {
            CLIENT_REQUEST_METHOD = method;
            CLIENT_REQUEST_URL = url;
            CLIENT_REQUEST_DATA = data;
        }),
        sendStateEvent: (roomId, type, key, data) => __awaiter(this, void 0, void 0, function* () {
            CLIENT_STATE_EVENT_TYPE = type;
            CLIENT_STATE_EVENT_KEY = key;
            CLIENT_STATE_EVENT_DATA = data;
        }),
    };
}
let INTENT_ENSURE_REGISTERED = false;
function getIntent(userId) {
    INTENT_ENSURE_REGISTERED = false;
    return {
        ensureRegistered: () => __awaiter(this, void 0, void 0, function* () {
            INTENT_ENSURE_REGISTERED = true;
        }),
        underlyingClient: getClient(userId),
    };
}
function getHandler(config = {}) {
    CLIENT_STATE_EVENT_TYPE = "";
    CLIENT_STATE_EVENT_KEY = "";
    CLIENT_STATE_EVENT_DATA = {};
    config = Object.assign({
        enabled: true,
        interval: 500,
        enableStatusState: false,
        statusStateBlacklist: [],
    }, config);
    const bridge = {
        AS: {
            isNamespacedUser: (userId) => userId.startsWith("@_puppet"),
            getIntentForUserId: (userId) => getIntent(userId),
        },
        botIntent: { userId: "@_puppet_bot:example.org" },
        puppetStore: {
            getRoomsOfGhost: (mxid) => __awaiter(this, void 0, void 0, function* () {
                if (mxid === "@_puppet_1_fox:example.org") {
                    return ["!room1:example.org", "!room2:example.org"];
                }
                return [];
            }),
        },
        userSync: {
            getPartsFromMxid: (mxid) => {
                return {
                    puppetId: 1,
                    userId: mxid.split("_")[3].split(":")[0],
                };
            },
        },
    };
    return new presencehandler_1.PresenceHandler(bridge, config);
}
let originalDateNow;
const MOCK_DATE = 100 * 1000;
describe("PresenceHandler", () => {
    beforeEach(() => {
        originalDateNow = Date.now;
        Date.now = () => {
            return MOCK_DATE;
        };
    });
    afterEach(() => {
        Date.now = originalDateNow;
    });
    describe("set", () => {
        it("should ignore users not handled", () => {
            const handler = getHandler();
            let presenceSet = false;
            handler["setMatrixPresence"] = ((info) => {
                presenceSet = true;
            });
            handler.set("@user:example.org", "online");
            chai_1.expect(presenceSet).to.be.false;
        });
        it("should set presence and push to the presence queue", () => {
            const handler = getHandler();
            let presenceSet = false;
            handler["setMatrixPresence"] = ((info) => {
                presenceSet = true;
            });
            handler.set("@_puppet_1_fox:example.org", "online");
            chai_1.expect(presenceSet).to.be.true;
            chai_1.expect(handler["presenceQueue"].length).to.equal(1);
            chai_1.expect(handler["presenceQueue"][0]).eql({
                mxid: "@_puppet_1_fox:example.org",
                presence: "online",
                last_sent: MOCK_DATE,
            });
        });
        it("should update presence, should it already exist", () => {
            const handler = getHandler();
            let presenceSet = false;
            handler["setMatrixPresence"] = ((info) => {
                presenceSet = true;
            });
            handler.set("@_puppet_1_fox:example.org", "online");
            handler.set("@_puppet_1_fox:example.org", "unavailable");
            chai_1.expect(presenceSet).to.be.true;
            chai_1.expect(handler["presenceQueue"].length).to.equal(1);
            chai_1.expect(handler["presenceQueue"][0]).eql({
                mxid: "@_puppet_1_fox:example.org",
                presence: "unavailable",
                last_sent: MOCK_DATE,
            });
        });
    });
    describe("setStatus", () => {
        it("should ignore users not handled", () => {
            const handler = getHandler();
            let presenceSet = false;
            handler["setMatrixPresence"] = ((info) => {
                presenceSet = true;
            });
            let statusSet = false;
            handler["setMatrixStatus"] = ((info) => {
                statusSet = true;
            });
            handler.setStatus("@user:example.org", "fox");
            chai_1.expect(presenceSet).to.be.false;
            chai_1.expect(statusSet).to.be.false;
        });
        it("should set status and push to the presence queue", () => {
            const handler = getHandler();
            let presenceSet = false;
            handler["setMatrixPresence"] = ((info) => {
                presenceSet = true;
            });
            let statusSet = false;
            handler["setMatrixStatus"] = ((info) => {
                statusSet = true;
            });
            handler.setStatus("@_puppet_1_fox:example.org", "fox");
            chai_1.expect(presenceSet).to.be.true;
            chai_1.expect(statusSet).to.be.true;
            chai_1.expect(handler["presenceQueue"].length).to.equal(1);
            chai_1.expect(handler["presenceQueue"][0]).eql({
                mxid: "@_puppet_1_fox:example.org",
                status: "fox",
                last_sent: MOCK_DATE,
            });
        });
        it("should update an status, should it already exist", () => {
            const handler = getHandler();
            let presenceSet = false;
            handler["setMatrixPresence"] = ((info) => {
                presenceSet = true;
            });
            let statusSet = false;
            handler["setMatrixStatus"] = ((info) => {
                statusSet = true;
            });
            handler.setStatus("@_puppet_1_fox:example.org", "fox");
            handler.setStatus("@_puppet_1_fox:example.org", "raccoon");
            chai_1.expect(presenceSet).to.be.true;
            chai_1.expect(statusSet).to.be.true;
            chai_1.expect(handler["presenceQueue"].length).to.equal(1);
            chai_1.expect(handler["presenceQueue"][0]).eql({
                mxid: "@_puppet_1_fox:example.org",
                status: "raccoon",
                last_sent: Date.now(),
            });
        });
    });
    describe("setStatusInRoom", () => {
        it("should ignore users not handled", () => {
            const handler = getHandler();
            let statusSet = false;
            handler["setMatrixStatusInRoom"] = ((info) => {
                statusSet = true;
            });
            handler.setStatusInRoom("@user:example.org", "!someroom:example.org");
            chai_1.expect(statusSet).to.be.false;
        });
        it("should ignore users not already found in the queue", () => {
            const handler = getHandler();
            let statusSet = false;
            handler["setMatrixStatusInRoom"] = ((info) => {
                statusSet = true;
            });
            handler.setStatusInRoom("@_puppet_1_fox:example.org", "!someroom:example.org");
            chai_1.expect(statusSet).to.be.false;
        });
        it("should pass on the status, if all is OK", () => {
            const handler = getHandler();
            let statusSet = false;
            handler["setMatrixStatusInRoom"] = ((info) => {
                statusSet = true;
            });
            handler["presenceQueue"].push({
                mxid: "@_puppet_1_fox:example.org",
                status: "blah",
                last_sent: 0,
            });
            handler.setStatusInRoom("@_puppet_1_fox:example.org", "!someroom:example.org");
            chai_1.expect(statusSet).to.be.true;
        });
    });
    describe("remove", () => {
        it("should set the mxid as offline", () => {
            const handler = getHandler();
            let setPresence = "";
            handler.set = (mxid, presence) => {
                setPresence = presence;
            };
            handler.remove("@_puppet_1_fox:example.org");
            chai_1.expect(setPresence).to.equal("offline");
        });
    });
    describe("handled", () => {
        it("should ignore non-ghost users", () => {
            const handler = getHandler();
            const ret = handler["handled"]("@user:example.org");
            chai_1.expect(ret).to.be.false;
        });
        it("should handle ghost users", () => {
            const handler = getHandler();
            const ret = handler["handled"]("@_puppet_1_fox:example.org");
            chai_1.expect(ret).to.be.true;
        });
    });
    describe("processIntervalThread", () => {
        it("should pop and re-push non-offline users", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["presenceQueue"].push({
                mxid: "@_puppet_1_fox:example.org",
                presence: "online",
                last_sent: 0,
            });
            let setPresence = false;
            handler["setMatrixPresence"] = (info) => __awaiter(void 0, void 0, void 0, function* () {
                setPresence = true;
            });
            yield handler["processIntervalThread"]();
            chai_1.expect(handler["presenceQueue"].length).to.equal(1);
            chai_1.expect(handler["presenceQueue"][0]).eql({
                mxid: "@_puppet_1_fox:example.org",
                presence: "online",
                last_sent: MOCK_DATE,
            });
            chai_1.expect(setPresence).to.be.true;
        }));
        it("should pop offline users from the queue", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["presenceQueue"].push({
                mxid: "@_puppet_1_fox:example.org",
                presence: "offline",
                last_sent: 0,
            });
            let setPresence = false;
            handler["setMatrixPresence"] = (info) => __awaiter(void 0, void 0, void 0, function* () {
                setPresence = true;
            });
            yield handler["processIntervalThread"]();
            chai_1.expect(handler["presenceQueue"].length).to.equal(0);
            chai_1.expect(setPresence).to.be.true;
        }));
        it("should ignore invalid entries", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["presenceQueue"].push(null);
            let setPresence = false;
            handler["setMatrixPresence"] = (info) => __awaiter(void 0, void 0, void 0, function* () {
                setPresence = true;
            });
            yield handler["processIntervalThread"]();
            chai_1.expect(handler["presenceQueue"].length).to.equal(0);
            chai_1.expect(setPresence).to.be.false;
        }));
        it("should not send fresh presence", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            handler["presenceQueue"].push({
                mxid: "@_puppet_1_fox:example.org",
                presence: "online",
                last_sent: Date.now() - 1,
            });
            let setPresence = false;
            handler["setMatrixPresence"] = (info) => __awaiter(void 0, void 0, void 0, function* () {
                setPresence = true;
            });
            yield handler["processIntervalThread"]();
            chai_1.expect(handler["presenceQueue"].length).to.equal(1);
            chai_1.expect(setPresence).to.be.false;
        }));
    });
    describe("setMatrixPresence", () => {
        it("should set present and status", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const info = {
                mxid: "@_puppet_1_fox:example.org",
                presence: "online",
                status: "fox!",
            };
            yield handler["setMatrixPresence"](info);
            chai_1.expect(INTENT_ENSURE_REGISTERED).to.be.true;
            chai_1.expect(CLIENT_REQUEST_METHOD).to.equal("PUT");
            chai_1.expect(CLIENT_REQUEST_URL).to.equal("/_matrix/client/r0/presence/%40_puppet_1_fox%3Aexample.org/status");
            chai_1.expect(CLIENT_REQUEST_DATA).eql({
                presence: "online",
                status_msg: "fox!",
            });
        }));
    });
    describe("setMatrixStatus", () => {
        it("should fetch all rooms and pass responisbility on", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            let roomCount = 0;
            handler["setMatrixStatusInRoom"] = (_, roomId) => __awaiter(void 0, void 0, void 0, function* () {
                roomCount++;
            });
            const info = {
                mxid: "@_puppet_1_fox:example.org",
                status: "Foxies!",
                last_sent: 0,
            };
            yield handler["setMatrixStatus"](info);
            chai_1.expect(roomCount).to.equal(2);
        }));
    });
    describe("setMatrixStatusInRoom", () => {
        it("should ignore offline blank presence changes", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                enableStatusState: true,
            });
            const info = {
                mxid: "@_puppet_1_fox:example.org",
                status: "",
                presence: "offline",
            };
            const roomId = "!room:example.org";
            yield handler["setMatrixStatusInRoom"](info, roomId);
            chai_1.expect(CLIENT_STATE_EVENT_TYPE).to.equal("");
            chai_1.expect(CLIENT_STATE_EVENT_KEY).to.equal("");
            chai_1.expect(CLIENT_STATE_EVENT_DATA).eql({});
        }));
        it("should set status state if setting is enabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                enableStatusState: true,
            });
            const info = {
                mxid: "@_puppet_1_fox:example.org",
                status: "Foxies!",
                presence: "online",
            };
            const roomId = "!room:example.org";
            yield handler["setMatrixStatusInRoom"](info, roomId);
            chai_1.expect(CLIENT_STATE_EVENT_TYPE).to.equal("im.vector.user_status");
            chai_1.expect(CLIENT_STATE_EVENT_KEY).to.equal("@_puppet_1_fox:example.org");
            chai_1.expect(CLIENT_STATE_EVENT_DATA).eql({
                status: "Foxies!",
            });
        }));
        it("should not set status state if setting is not enabled", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                enableStatusState: false,
            });
            const info = {
                mxid: "@_puppet_1_fox:example.org",
                status: "Foxies!",
                presence: "online",
            };
            const roomId = "!room:example.org";
            yield handler["setMatrixStatusInRoom"](info, roomId);
            chai_1.expect(CLIENT_STATE_EVENT_TYPE).to.equal("");
            chai_1.expect(CLIENT_STATE_EVENT_KEY).to.equal("");
            chai_1.expect(CLIENT_STATE_EVENT_DATA).eql({});
        }));
        it("should ignore if presence status user is blacklisted", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler({
                statusStateBlacklist: ["badfox"],
                enableStatusState: true,
            });
            const info = {
                mxid: "@_puppet_1_badfox:example.org",
                status: "Foxies!",
                presence: "online",
            };
            const roomId = "!room:example.org";
            yield handler["setMatrixStatusInRoom"](info, roomId);
            chai_1.expect(CLIENT_STATE_EVENT_TYPE).to.equal("");
            chai_1.expect(CLIENT_STATE_EVENT_KEY).to.equal("");
            chai_1.expect(CLIENT_STATE_EVENT_DATA).eql({});
        }));
    });
});
//# sourceMappingURL=test_presencehandler.js.map