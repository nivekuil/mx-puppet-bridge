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
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
const puppetEntries = [
    {
        puppetId: 1,
        puppetMxid: "@fox:example.org",
        data: { name: "Fox", token: "fox" },
        userId: "fox",
        type: "puppet",
        isPublic: false,
    },
    {
        puppetId: 2,
        puppetMxid: "@bunny:example.org",
        data: { name: "Bunny", token: "bunny" },
        userId: "bunny",
        type: "puppet",
        isPublic: false,
    },
];
const mxidInfoEntries = [
    {
        puppetMxid: "@fox:example.org",
        name: "Fox",
        avatarMxc: "mxc://example.org/fox",
        avatarUrl: null,
        token: null,
        statusRoom: "!foxstatus:example.org",
    },
    {
        puppetMxid: "@bunny:example.org",
        name: "Bunny",
        avatarMxc: "mxc://example.org/bunny",
        avatarUrl: null,
        token: "bunnytoken",
        statusRoom: "!foxstatus:example.org",
    },
];
let MATRIX_AUTH_DEVICENAME_SET = "";
let PUPPETSTORE_SET_MXID_INFO = {};
let PUPPETSTORE_SET_USER_ID = "";
let PUPPETSTORE_SET_DATA = {};
let PUPPETSTORE_NEW_MXID = "";
let PUPPETSTORE_DELETE = -1;
let BRIDGE_EVENTS_EMITTED = [];
let ROOMSYNC_DELETE_FOR_PUPPET = -1;
function getProvisioner() {
    MATRIX_AUTH_DEVICENAME_SET = "";
    PUPPETSTORE_SET_MXID_INFO = {};
    PUPPETSTORE_SET_USER_ID = "";
    PUPPETSTORE_SET_DATA = {};
    PUPPETSTORE_NEW_MXID = "";
    PUPPETSTORE_DELETE = -1;
    BRIDGE_EVENTS_EMITTED = [];
    ROOMSYNC_DELETE_FOR_PUPPET = -1;
    const bridge = {
        puppetStore: {
            getAll: () => __awaiter(this, void 0, void 0, function* () {
                return puppetEntries;
            }),
            getForMxid: (mxid) => __awaiter(this, void 0, void 0, function* () {
                return puppetEntries.filter((e) => e.puppetMxid === mxid);
            }),
            get: (puppetId) => __awaiter(this, void 0, void 0, function* () {
                return puppetEntries.find((e) => e.puppetId === puppetId) || null;
            }),
            getMxid: (puppetId) => __awaiter(this, void 0, void 0, function* () {
                const entry = puppetEntries.find((e) => e.puppetId === puppetId);
                if (!entry) {
                    throw new Error("not found");
                }
                return entry.puppetMxid;
            }),
            getOrCreateMxidInfo: (mxid) => __awaiter(this, void 0, void 0, function* () {
                const existing = mxidInfoEntries.find((e) => e.puppetMxid === mxid);
                if (existing) {
                    return existing;
                }
                return {
                    puppetMxid: mxid,
                    name: null,
                    avatarMxc: null,
                    avatarUrl: null,
                    token: null,
                    statusRoom: null,
                };
            }),
            getMxidInfo: (mxid) => __awaiter(this, void 0, void 0, function* () {
                return mxidInfoEntries.find((e) => e.puppetMxid === mxid) || null;
            }),
            setMxidInfo: (info) => __awaiter(this, void 0, void 0, function* () {
                PUPPETSTORE_SET_MXID_INFO = info;
            }),
            setUserId: (puppetId, userId) => __awaiter(this, void 0, void 0, function* () {
                PUPPETSTORE_SET_USER_ID = `${puppetId};${userId}`;
            }),
            setData: (puppetId, data) => __awaiter(this, void 0, void 0, function* () {
                PUPPETSTORE_SET_DATA = data;
            }),
            new: (mxid, data, userId) => __awaiter(this, void 0, void 0, function* () {
                PUPPETSTORE_NEW_MXID = mxid;
                return 3;
            }),
            delete: (puppetId) => __awaiter(this, void 0, void 0, function* () {
                PUPPETSTORE_DELETE = puppetId;
            }),
        },
        roomStore: {
            getAll: () => __awaiter(this, void 0, void 0, function* () {
                return [];
            }),
        },
        config: {
            bridge: {
                loginSharedSecretMap: {
                    "example.org": "secret",
                },
            },
            homeserverUrlMap: {
                "override.org": "https://foxies.org",
            },
            provisioning: {
                whitelist: [".*:example\\.org"],
                blacklist: ["@bad:example\\.org"],
            },
            relay: {
                whitelist: [".*"],
                blacklist: [],
            },
        },
        protocol: {
            displayname: "Remote",
            features: {
                globalNamespace: true,
            },
        },
        emit: (type) => {
            BRIDGE_EVENTS_EMITTED.push(type);
        },
        hooks: {
            getDesc: (puppetId, data) => __awaiter(this, void 0, void 0, function* () {
                return `${data.name} (${data.token})`;
            }),
        },
        roomSync: {
            deleteForPuppet: (puppetId) => __awaiter(this, void 0, void 0, function* () {
                ROOMSYNC_DELETE_FOR_PUPPET = puppetId;
            }),
        },
    };
    function MatrixAuth(homeserverUrl) { }
    MatrixAuth.prototype.passwordLogin = (mxid, password, devicename) => __awaiter(this, void 0, void 0, function* () {
        if (mxid.startsWith("@invalid")) {
            throw new Error("Invalid login");
        }
        MATRIX_AUTH_DEVICENAME_SET = devicename;
        return { accessToken: "token" };
    });
    const Provisioner = proxyquire.load("../src/provisioner", {
        "@sorunome/matrix-bot-sdk": { MatrixAuth },
        "./util": { Util: {
                DownloadFile: (url) => __awaiter(this, void 0, void 0, function* () {
                    if (url.startsWith("https://example.org")) {
                        return Buffer.from("{\"m.homeserver\": {\"base_url\": \"https://matrix.example.org\"}}");
                    }
                    return Buffer.from("");
                }),
            } },
    }).Provisioner;
    return new Provisioner(bridge);
}
describe("Provisioner", () => {
    describe("getAll", () => {
        it("should fetch all puppets", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getAll();
            chai_1.expect(ret).eql(puppetEntries);
        }));
    });
    describe("getForMxid", () => {
        it("should fetch all puppets for an mxid", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getForMxid("@fox:example.org");
            chai_1.expect(ret).eql([puppetEntries[0]]);
        }));
        it("should return a blank array on an unknown mxid", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getForMxid("@unknown:example.org");
            chai_1.expect(ret).eql([]);
        }));
    });
    describe("get", () => {
        it("should fetch a puppet by puppetId", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.get(1);
            chai_1.expect(ret).eql(puppetEntries[0]);
        }));
        it("should return null for a non-found puppetId", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.get(42);
            chai_1.expect(ret).to.be.null;
        }));
    });
    describe("getMxid", () => {
        it("should fetch the mxid of a puppetId", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getMxid(1);
            chai_1.expect(ret).to.equal("@fox:example.org");
        }));
        it("should throw an error, if the puppetId is not found", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            try {
                const ret = yield provisioner.getMxid(42);
                throw new Error("should throw");
            }
            catch (err) {
                if (err.message === "should throw") {
                    throw err;
                }
            }
        }));
    });
    describe("loginWithSharedSecret", () => {
        it("should do nothing if homeserver not configured", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            provisioner["getHsUrl"] = (mxid) => __awaiter(void 0, void 0, void 0, function* () { return "https://example.org"; });
            const ret = yield provisioner.loginWithSharedSecret("@user:otherserver.com");
            chai_1.expect(ret).to.be.null;
        }));
        it("should log in just fine with a configured homeserver", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            provisioner["getHsUrl"] = (mxid) => __awaiter(void 0, void 0, void 0, function* () { return "https://example.org"; });
            const ret = yield provisioner.loginWithSharedSecret("@fox:example.org");
            chai_1.expect(ret).to.equal("token");
            chai_1.expect(MATRIX_AUTH_DEVICENAME_SET).to.equal("Remote Puppet Bridge");
        }));
        it("should do nothing if login in the homeserver fails", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            provisioner["getHsUrl"] = (mxid) => __awaiter(void 0, void 0, void 0, function* () { return "https://example.org"; });
            const ret = yield provisioner.loginWithSharedSecret("@invalid:example.org");
            chai_1.expect(ret).to.be.null;
        }));
    });
    describe("getHsUrl", () => {
        it("should handle .well-known", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getHsUrl("@user:example.org");
            chai_1.expect(ret).to.equal("https://matrix.example.org");
        }));
        it("should handle manually configured overrides", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getHsUrl("@user:override.org");
            chai_1.expect(ret).to.equal("https://foxies.org");
        }));
        it("should just prepend https:// if all fails", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getHsUrl("@user:someserver.com");
            chai_1.expect(ret).to.equal("https://someserver.com");
        }));
        it("should prefix http:// for localhost", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getHsUrl("@user:localhost");
            chai_1.expect(ret).to.equal("http://localhost");
        }));
        it("should handle addresses with ports", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getHsUrl("@user:someserver.com:1234");
            chai_1.expect(ret).to.equal("https://someserver.com:1234");
        }));
    });
    describe("getToken", () => {
        it("should fetch a token by mxid", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getToken("@bunny:example.org");
            chai_1.expect(ret).eql({
                hsUrl: "https://matrix.example.org",
                mxid: "@bunny:example.org",
                token: "bunnytoken",
            });
        }));
        it("should fetch token by puppetId", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getToken(2);
            chai_1.expect(ret).eql({
                hsUrl: "https://matrix.example.org",
                mxid: "@bunny:example.org",
                token: "bunnytoken",
            });
        }));
        it("should return null, if no token found", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getToken(1);
            chai_1.expect(ret).to.be.null;
        }));
    });
    describe("setToken", () => {
        it("should set a token on an existing account", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            yield provisioner.setToken("@fox:example.org", "foxtoken");
            chai_1.expect(PUPPETSTORE_SET_MXID_INFO.puppetMxid).to.equal("@fox:example.org");
            chai_1.expect(PUPPETSTORE_SET_MXID_INFO.token).to.equal("foxtoken");
        }));
        it("should set a token on a new account", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            yield provisioner.setToken("@new:example.org", "newtoken");
            chai_1.expect(PUPPETSTORE_SET_MXID_INFO.puppetMxid).to.equal("@new:example.org");
            chai_1.expect(PUPPETSTORE_SET_MXID_INFO.token).to.equal("newtoken");
        }));
    });
    describe("setUserId", () => {
        it("should set the user ID", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            yield provisioner.setUserId(1, "userfox");
            chai_1.expect(PUPPETSTORE_SET_USER_ID).to.equal("1;userfox");
        }));
    });
    describe("setData", () => {
        it("should set data", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const data = { yay: "wohooo" };
            yield provisioner.setData(1, data);
            chai_1.expect(PUPPETSTORE_SET_DATA).eql(data);
        }));
    });
    describe("canCreate", () => {
        it("should allow whitelisted users", () => {
            const provisioner = getProvisioner();
            const ret = provisioner.canCreate("@user:example.org");
            chai_1.expect(ret).to.be.true;
        });
        it("should deny blacklisted users", () => {
            const provisioner = getProvisioner();
            const ret = provisioner.canCreate("@bad:example.org");
            chai_1.expect(ret).to.be.false;
        });
        it("should deny users not in the whitelist", () => {
            const provisioner = getProvisioner();
            const ret = provisioner.canCreate("@user:otherserver.org");
            chai_1.expect(ret).to.be.false;
        });
    });
    describe("canRelay", () => {
        it("should have its own black/whitelist", () => {
            const provisioner = getProvisioner();
            const ret = provisioner.canRelay("@user:otherserver.org");
            chai_1.expect(ret).to.be.true;
        });
    });
    describe("new", () => {
        it("should deny, if you can't create", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.new("@user:otherserver.org", { yay: "foo" });
            chai_1.expect(ret).to.equal(-1);
        }));
        it("create a new puppet", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.new("@newuser:example.org", { yay: "foo" });
            chai_1.expect(ret).to.equal(3);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).eql(["puppetNew"]);
            chai_1.expect(PUPPETSTORE_NEW_MXID).to.equal("@newuser:example.org");
        }));
    });
    describe("update", () => {
        it("should deny, if you can't create", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            yield provisioner.update("@user:otherserver.org", 1, { yay: "foo" });
            chai_1.expect(BRIDGE_EVENTS_EMITTED).eql([]);
        }));
        it("should deny, if puppet id not found", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            yield provisioner.update("@fox:example.org", 3, { yay: "foo" });
            chai_1.expect(BRIDGE_EVENTS_EMITTED).eql([]);
        }));
        it("should deny, if not your own puppet", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            yield provisioner.update("@user:example.org", 1, { yay: "foo" });
            chai_1.expect(BRIDGE_EVENTS_EMITTED).eql([]);
        }));
        it("should update, is all fine", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            yield provisioner.update("@fox:example.org", 1, { yay: "foo" });
            chai_1.expect(BRIDGE_EVENTS_EMITTED).eql(["puppetNew"]);
            chai_1.expect(PUPPETSTORE_SET_DATA).eql({ yay: "foo" });
        }));
    });
    describe("delete", () => {
        it("should do nothing, if puppet id is not found", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            yield provisioner.delete("@fox:example.org", 3);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).eql([]);
        }));
        it("should do nothing, if not your own puppet", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            yield provisioner.delete("@user:example.org", 1);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).eql([]);
        }));
        it("should delete, is all fine", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            yield provisioner.delete("@fox:example.org", 1);
            chai_1.expect(BRIDGE_EVENTS_EMITTED).eql(["puppetDelete"]);
            chai_1.expect(ROOMSYNC_DELETE_FOR_PUPPET).to.equal(1);
            chai_1.expect(PUPPETSTORE_DELETE).to.equal(1);
        }));
    });
    describe("getDesc", () => {
        it("should return null if the puppet isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getDesc("@fox:example.org", 3);
            chai_1.expect(ret).to.be.null;
        }));
        it("should return null, if the puppet isn't ours", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getDesc("@other:example.org", 1);
            chai_1.expect(ret).to.be.null;
        }));
        it("should return the descriptor, is all fine", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getDesc("@fox:example.org", 1);
            chai_1.expect(ret).eql({
                puppetId: 1,
                desc: "Fox (fox)",
                type: "puppet",
                isPublic: false,
            });
        }));
    });
    describe("getDescMxid", () => {
        it("should return all the descriptors for the mxid", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getDescMxid("@fox:example.org");
            chai_1.expect(ret).eql([{
                    puppetId: 1,
                    desc: "Fox (fox)",
                    type: "puppet",
                    isPublic: false,
                }]);
        }));
    });
    describe("getDescFromData", () => {
        it("should return a descriptor based on data", () => __awaiter(void 0, void 0, void 0, function* () {
            const provisioner = getProvisioner();
            const ret = yield provisioner.getDescFromData({
                puppetId: 42,
                data: { name: "Beep", token: "boop" },
                type: "puppet",
                isPublic: false,
            });
            chai_1.expect(ret).eql({
                puppetId: 42,
                desc: "Beep (boop)",
                type: "puppet",
                isPublic: false,
            });
        }));
    });
});
//# sourceMappingURL=test_provisioner.js.map