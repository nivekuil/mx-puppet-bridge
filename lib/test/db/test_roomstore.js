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
const roomstore_1 = require("../../src/db/roomstore");
const store_1 = require("../../src/store");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
function getStore(cache = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const store = new store_1.Store({
            filename: ":memory:",
        }, {});
        yield store.init();
        return new roomstore_1.DbRoomStore(store.db, cache);
    });
}
describe("DbRoomStore", () => {
    for (const cache of [true, false]) {
        const extra = (cache ? " with cache" : " without cache");
        it("should handle normal room storing" + extra, () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore(cache);
            chai_1.expect(yield store.getByRemote(1, "room")).to.be.null;
            const room = {
                puppetId: 1,
                roomId: "room",
                mxid: "!room",
                name: "Room",
                avatarUrl: "http://avatar",
                avatarMxc: "mxc://blah/avatar",
                avatarHash: "foxies",
                topic: "Topic",
                groupId: "group",
                isDirect: false,
                e2be: false,
                externalUrl: "https://somebridge",
                isUsed: false,
            };
            yield store.set(room);
            chai_1.expect(yield store.getByRemote(1, "room")).to.eql(room);
            room.name = "New Room";
            yield store.set(room);
            chai_1.expect((yield store.getByRemote(1, "room")).name).to.equal("New Room");
            chai_1.expect(yield store.getByMxid("!room")).to.eql(room);
            chai_1.expect(yield store.getByPuppetId(1)).to.eql([room]);
            yield store.delete(room);
            chai_1.expect(yield store.getByRemote(1, "room")).to.be.null;
            chai_1.expect(yield store.getByMxid("!room")).to.be.null;
            chai_1.expect(yield store.getByPuppetId(1)).to.eql([]);
        }));
        it("should handle room OPs" + extra, () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore(cache);
            chai_1.expect(yield store.getRoomOp("!room")).to.be.null;
            yield store.setRoomOp("!room", "@user1");
            chai_1.expect(yield store.getRoomOp("!room")).to.equal("@user1");
            yield store.setRoomOp("!room", "@user2");
            chai_1.expect(yield store.getRoomOp("!room")).to.equal("@user2");
            yield store.setRoomOp("!room", "@user2");
            chai_1.expect(yield store.getRoomOp("!room")).to.equal("@user2");
        }));
    }
});
//# sourceMappingURL=test_roomstore.js.map