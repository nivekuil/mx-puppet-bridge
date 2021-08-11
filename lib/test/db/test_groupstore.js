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
const groupstore_1 = require("../../src/db/groupstore");
const store_1 = require("../../src/store");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
function getStore(cache = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const store = new store_1.Store({
            filename: ":memory:",
        }, {});
        yield store.init();
        return new groupstore_1.DbGroupStore(store.db, cache);
    });
}
describe("DbGroupStore", () => {
    for (const cache of [true, false]) {
        const extra = (cache ? " with cache" : " without cache");
        it("should set, get and delete" + extra, () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore(cache);
            chai_1.expect(yield store.getByRemote(1, "r1")).to.be.null;
            const group = {
                mxid: "+group",
                groupId: "r1",
                puppetId: 1,
                name: "group",
                avatarUrl: "http://someurl",
                avatarMxc: "mxc://someserver/someurl",
                avatarHash: "foxies",
                shortDescription: "short desc",
                longDescription: "long desc",
                roomIds: ["!room1", "!room2"],
            };
            yield store.set(group);
            chai_1.expect(yield store.getByRemote(1, "r1")).to.eql(group);
            yield store.delete(group);
            chai_1.expect(yield store.getByRemote(1, "r1")).to.be.null;
        }));
        it("should reflect room changes" + extra, () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore(cache);
            let roomIds = ["!room1", "!room2"];
            const group = {
                mxid: "+group",
                groupId: "r1",
                puppetId: 1,
                roomIds,
            };
            yield store.set(group);
            chai_1.expect((yield store.getByRemote(1, "r1")).roomIds).to.eql(["!room1", "!room2"]);
            roomIds.push("!room3");
            group.roomIds = roomIds;
            yield store.set(group);
            chai_1.expect((yield store.getByRemote(1, "r1")).roomIds).to.eql(["!room1", "!room2", "!room3"]);
            roomIds.push("!room4");
            roomIds.push("!room4");
            group.roomIds = roomIds;
            yield store.set(group);
            chai_1.expect((yield store.getByRemote(1, "r1")).roomIds).to.eql(["!room1", "!room2", "!room3", "!room4"]);
            roomIds = ["!room2"];
            group.roomIds = roomIds;
            yield store.set(group);
            chai_1.expect((yield store.getByRemote(1, "r1")).roomIds).to.eql(["!room2"]);
        }));
        it("should get by mxid" + extra, () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore(cache);
            chai_1.expect(yield store.getByMxid("+group")).to.be.null;
            const group = {
                mxid: "+group",
                groupId: "r1",
                puppetId: 1,
                name: "group",
                avatarUrl: "http://someurl",
                avatarMxc: "mxc://someserver/someurl",
                avatarHash: "foxies",
                shortDescription: "short desc",
                longDescription: "long desc",
                roomIds: ["!room1", "!room2"],
            };
            yield store.set(group);
            chai_1.expect(yield store.getByMxid("+group")).to.eql(group);
        }));
    }
});
//# sourceMappingURL=test_groupstore.js.map