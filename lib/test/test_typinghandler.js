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
const typinghandler_1 = require("../src/typinghandler");
const util_1 = require("../src/util");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
let CLIENT_REQUEST_METHOD = "";
let CLIENT_REQUEST_URL = "";
let CLIENT_REQUEST_DATA = {};
function getClient(userId) {
    CLIENT_REQUEST_METHOD = "";
    CLIENT_REQUEST_URL = "";
    CLIENT_REQUEST_DATA = {};
    return {
        getUserId: () => __awaiter(this, void 0, void 0, function* () { return userId; }),
        doRequest: (method, url, qs, data) => __awaiter(this, void 0, void 0, function* () {
            CLIENT_REQUEST_METHOD = method;
            CLIENT_REQUEST_URL = url;
            CLIENT_REQUEST_DATA = data;
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
function getHandler() {
    getIntent("");
    getClient("");
    const bridge = {
        AS: {
            isNamespacedUser: (userId) => userId.startsWith("@_puppet"),
            getIntentForUserId: (userId) => getIntent(userId),
        },
        botIntent: { userId: "@_puppet_bot:example.org" },
    };
    const timeout = 50;
    return new typinghandler_1.TypingHandler(bridge, timeout);
}
describe("TypingHandler", () => {
    describe("set", () => {
        it("should ignore mxids not handled", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const mxid = "@user:example.org";
            const roomId = "!someroom:example.org";
            const typing = true;
            yield handler.set(mxid, roomId, typing);
            chai_1.expect(CLIENT_REQUEST_DATA).eql({});
        }));
        it("should handle correct input", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const mxid = "@_puppet_1_fox:example.org";
            const roomId = "!someroom:example.org";
            const typing = true;
            yield handler.set(mxid, roomId, typing);
            chai_1.expect(CLIENT_REQUEST_METHOD).to.equal("PUT");
            chai_1.expect(CLIENT_REQUEST_URL).to.equal("/_matrix/client/r0/rooms/!someroom%3Aexample.org" +
                "/typing/%40_puppet_1_fox%3Aexample.org");
            chai_1.expect(CLIENT_REQUEST_DATA).eql({
                typing: true,
                timeout: 50,
            });
        }));
        it("should do nothing if the user isn't typing anyways", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const mxid = "@_puppet_1_fox:example.org";
            const roomId = "!someroom:example.org";
            const typing = false;
            yield handler.set(mxid, roomId, typing);
            chai_1.expect(CLIENT_REQUEST_METHOD).to.equal("");
        }));
        it("should do nothing, if the typing user timeouts", () => __awaiter(void 0, void 0, void 0, function* () {
            const handler = getHandler();
            const mxid = "@_puppet_1_fox:example.org";
            const roomId = "!someroom:example.org";
            yield handler.set(mxid, roomId, true);
            chai_1.expect(CLIENT_REQUEST_METHOD).to.equal("PUT");
            getClient("");
            yield util_1.Util.sleep(55);
            yield handler.set(mxid, roomId, false);
            chai_1.expect(CLIENT_REQUEST_METHOD).to.equal("");
        }));
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
});
//# sourceMappingURL=test_typinghandler.js.map