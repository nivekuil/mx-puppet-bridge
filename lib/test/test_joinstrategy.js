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
const joinstrategy_1 = require("../src/joinstrategy");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers
let CLIENT_INVITE_USER = "";
function getClient() {
    CLIENT_INVITE_USER = "";
    return {
        resolveRoom: (roomId) => __awaiter(this, void 0, void 0, function* () { return roomId; }),
        inviteUser: (userId, roomId) => __awaiter(this, void 0, void 0, function* () {
            CLIENT_INVITE_USER = `${userId};${roomId}`;
        }),
    };
}
let UNDERLYING_STRATEGY_JOIN_ROOM = "";
function getStrategy(haveStrategy = false) {
    UNDERLYING_STRATEGY_JOIN_ROOM = "";
    const underlyingStrategy = {
        joinRoom: (roomId, userId, apiCall) => __awaiter(this, void 0, void 0, function* () {
            UNDERLYING_STRATEGY_JOIN_ROOM = `${roomId};${userId}`;
        }),
    };
    const bridge = {
        roomSync: {
            getRoomOp: (roomId) => __awaiter(this, void 0, void 0, function* () {
                return getClient();
            }),
        },
    };
    return new joinstrategy_1.PuppetBridgeJoinRoomStrategy(haveStrategy ? underlyingStrategy : null, bridge);
}
describe("PuppetBridgeJoinRoomStrategy", () => {
    describe("joinRoom", () => {
        it("should just join the room, should it not fail", () => __awaiter(void 0, void 0, void 0, function* () {
            const strategy = getStrategy();
            const roomId = "!someroom:example.org";
            const userId = "@_puppet_1_fox:example.org";
            const apiCall = (idOrAlias) => __awaiter(void 0, void 0, void 0, function* () { return "Direct Join"; });
            const ret = yield strategy.joinRoom(roomId, userId, apiCall);
            chai_1.expect(ret).to.equal("Direct Join");
            chai_1.expect(CLIENT_INVITE_USER).to.equal("");
        }));
        it("should invite and then join the user, should the initial join fail", () => __awaiter(void 0, void 0, void 0, function* () {
            const strategy = getStrategy();
            const roomId = "!someroom:example.org";
            const userId = "@_puppet_1_fox:example.org";
            let apiCalls = 0;
            const apiCall = (idOrAlias) => __awaiter(void 0, void 0, void 0, function* () {
                apiCalls++;
                if (apiCalls === 1) {
                    throw new Error("not allowed");
                }
                else {
                    return "Indirect Join";
                }
            });
            const ret = yield strategy.joinRoom(roomId, userId, apiCall);
            chai_1.expect(ret).to.equal("Indirect Join");
            chai_1.expect(CLIENT_INVITE_USER).to.equal("@_puppet_1_fox:example.org;!someroom:example.org");
        }));
        it("should call an underlying strategy, if one is present", () => __awaiter(void 0, void 0, void 0, function* () {
            const strategy = getStrategy(true);
            const roomId = "!someroom:example.org";
            const userId = "@_puppet_1_fox:example.org";
            let apiCalls = 0;
            const apiCall = (idOrAlias) => __awaiter(void 0, void 0, void 0, function* () {
                apiCalls++;
                if (apiCalls === 1) {
                    throw new Error("not allowed");
                }
                else {
                    return "Indirect Join";
                }
            });
            const ret = yield strategy.joinRoom(roomId, userId, apiCall);
            chai_1.expect(ret).not.to.equal("Indirect Join");
            chai_1.expect(CLIENT_INVITE_USER).to.equal("@_puppet_1_fox:example.org;!someroom:example.org");
            chai_1.expect(UNDERLYING_STRATEGY_JOIN_ROOM).to.equal("!someroom:example.org;@_puppet_1_fox:example.org");
        }));
    });
});
//# sourceMappingURL=test_joinstrategy.js.map