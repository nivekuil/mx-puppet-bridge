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
const puppetstore_1 = require("../../src/db/puppetstore");
const store_1 = require("../../src/store");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
function getStore(cache = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const store = new store_1.Store({
            filename: ":memory:",
        }, {});
        yield store.init();
        return new puppetstore_1.DbPuppetStore(store.db, cache);
    });
}
describe("DbPuppetStore", () => {
    for (const cache of [true, false]) {
        const extra = (cache ? " with cache" : " without cache");
        it("should handle mxid info" + extra, () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore(cache);
            chai_1.expect(yield store.getMxidInfo("@user")).to.be.null;
            chai_1.expect((yield store.getOrCreateMxidInfo("@user")).puppetMxid).to.equal("@user");
            chai_1.expect((yield store.getMxidInfo("@user")).puppetMxid).to.equal("@user");
            chai_1.expect(yield store.getMxidInfo("@user2")).to.be.null;
            const user = {
                puppetMxid: "@user2",
                name: "Heya!",
                avatarMxc: null,
                avatarUrl: null,
                token: null,
                statusRoom: null,
            };
            yield store.setMxidInfo(user);
            chai_1.expect(yield store.getMxidInfo("@user2")).to.eql(user);
            user.name = "new name";
            yield store.setMxidInfo(user);
            chai_1.expect(yield store.getMxidInfo("@user2")).to.eql(user);
        }));
        it("should handle puppet info" + extra, () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore(cache);
            chai_1.expect(yield store.get(1)).to.be.null;
            const puppetId = yield store.new("@user", { fox: "yay" }, "remoteuser");
            chai_1.expect(yield store.get(puppetId)).to.eql({
                puppetId,
                puppetMxid: "@user",
                data: { fox: "yay" },
                userId: "remoteuser",
                type: "puppet",
                isPublic: false,
                autoinvite: true,
                isGlobalNamespace: false,
            });
            chai_1.expect(yield store.getMxid(puppetId)).to.equal("@user");
            yield store.setUserId(puppetId, "newremoteuser");
            chai_1.expect((yield store.get(puppetId)).userId).to.equal("newremoteuser");
            yield store.setData(puppetId, { fox: "superyay" });
            chai_1.expect((yield store.get(puppetId)).data).to.eql({ fox: "superyay" });
            yield store.setType(puppetId, "relay");
            chai_1.expect((yield store.get(puppetId)).type).to.equal("relay");
            yield store.setIsPublic(puppetId, true);
            chai_1.expect((yield store.get(puppetId)).isPublic).to.be.true;
            yield store.setAutoinvite(puppetId, false);
            chai_1.expect((yield store.get(puppetId)).autoinvite).to.be.false;
            yield store.setIsGlobalNamespace(puppetId, true);
            chai_1.expect((yield store.get(puppetId)).isGlobalNamespace).to.be.true;
            chai_1.expect(yield store.getForMxid("@invalid")).to.eql([]);
            chai_1.expect(yield store.getForMxid("@user")).to.eql([{
                    puppetId,
                    puppetMxid: "@user",
                    data: { fox: "superyay" },
                    userId: "newremoteuser",
                    type: "relay",
                    isPublic: true,
                    autoinvite: false,
                    isGlobalNamespace: true,
                }]);
            chai_1.expect(yield store.getAll()).to.eql([{
                    puppetId,
                    puppetMxid: "@user",
                    data: { fox: "superyay" },
                    userId: "newremoteuser",
                    type: "relay",
                    isPublic: true,
                    autoinvite: false,
                    isGlobalNamespace: true,
                }]);
            yield store.delete(puppetId);
            chai_1.expect(yield store.get(puppetId)).to.be.null;
        }));
        it("should handle ghosts" + extra, () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore(cache);
            chai_1.expect(yield store.isGhostInRoom("@ghost1", "@room1")).to.be.false;
            yield store.joinGhostToRoom("@ghost1", "@room1");
            chai_1.expect(yield store.isGhostInRoom("@ghost1", "@room1")).to.be.true;
            yield store.joinGhostToRoom("@ghost2", "@room1");
            yield store.joinGhostToRoom("@ghost1", "@room2");
            chai_1.expect(yield store.getGhostsInRoom("@room1")).to.eql(["@ghost1", "@ghost2"]);
            chai_1.expect(yield store.getRoomsOfGhost("@ghost1")).to.eql(["@room1", "@room2"]);
            yield store.emptyGhostsInRoom("@room1");
            chai_1.expect(yield store.getGhostsInRoom("@room1")).to.eql([]);
            chai_1.expect(yield store.isGhostInRoom("@ghost1", "@room2")).to.be.true;
            yield store.leaveGhostFromRoom("@ghost1", "@room2");
            chai_1.expect(yield store.isGhostInRoom("@ghost1", "@room2")).to.be.false;
        }));
    }
});
//# sourceMappingURL=test_puppetstore.js.map