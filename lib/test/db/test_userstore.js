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
const userstore_1 = require("../../src/db/userstore");
const store_1 = require("../../src/store");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
function getStore(cache = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const store = new store_1.Store({
            filename: ":memory:",
        }, {});
        yield store.init();
        return new userstore_1.DbUserStore(store.db, cache);
    });
}
describe("DbUserStore", () => {
    for (const cache of [true, false]) {
        const extra = (cache ? " with cache" : " without cache");
        it("should handle normal data" + extra, () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore(cache);
            chai_1.expect(yield store.get(1, "user")).to.be.null;
            const user = {
                puppetId: 1,
                userId: "user",
                name: "Fox Lover",
                avatarUrl: "https://fox",
                avatarMxc: "mxc://fox/avatar",
                avatarHash: "foxies",
            };
            yield store.set(user);
            chai_1.expect(yield store.get(1, "user")).to.eql(user);
            user.name = "Fox Super Lover";
            yield store.set(user);
            chai_1.expect((yield store.get(1, "user")).name).to.equal("Fox Super Lover");
            yield store.delete(user);
            chai_1.expect(yield store.get(1, "user")).to.be.null;
        }));
        it("should handle room overrides" + extra, () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore(cache);
            const user = {
                puppetId: 1,
                userId: "user",
                name: "Fox Lover",
                avatarUrl: "https://fox",
                avatarMxc: "mxc://fox/avatar",
                avatarHash: "foxies",
            };
            yield store.set(user);
            chai_1.expect(yield store.getRoomOverride(1, "user", "!room")).to.be.null;
            const roomOverride = {
                puppetId: 1,
                userId: "user",
                roomId: "!room",
                name: "Bunny Lover",
                avatarUrl: "https://bunny",
                avatarMxc: "mxc://bunny/avatar",
                avatarHash: "bunnies",
            };
            yield store.setRoomOverride(roomOverride);
            chai_1.expect(yield store.getRoomOverride(1, "user", "!room")).to.eql(roomOverride);
            roomOverride.name = "Bunny Super Lover";
            yield store.setRoomOverride(roomOverride);
            chai_1.expect((yield store.getRoomOverride(1, "user", "!room")).name).to.equal("Bunny Super Lover");
            chai_1.expect(yield store.getAllRoomOverrides(1, "user")).to.eql([roomOverride]);
            yield store.delete(user);
            chai_1.expect(yield store.getAllRoomOverrides(1, "user")).to.eql([]);
            chai_1.expect(yield store.getRoomOverride(1, "user", "!room")).to.be.null;
        }));
    }
});
//# sourceMappingURL=test_userstore.js.map