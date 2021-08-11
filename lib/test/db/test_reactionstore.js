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
const reactionstore_1 = require("../../src/db/reactionstore");
const store_1 = require("../../src/store");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
function getStore() {
    return __awaiter(this, void 0, void 0, function* () {
        const store = new store_1.Store({
            filename: ":memory:",
        }, {});
        yield store.init();
        return new reactionstore_1.DbReactionStore(store.db);
    });
}
describe("DbReactionStore", () => {
    it("should work", () => __awaiter(void 0, void 0, void 0, function* () {
        const store = yield getStore();
        const reaction = {
            puppetId: 1,
            roomId: "!room",
            userId: "@user",
            eventId: "blah",
            reactionMxid: "$event",
            key: "fox",
        };
        chai_1.expect(yield store.exists(reaction)).to.be.false;
        yield store.insert(reaction);
        chai_1.expect(yield store.exists(reaction)).to.be.true;
        chai_1.expect(yield store.getFromReactionMxid("$event")).to.eql(reaction);
        chai_1.expect(yield store.getFromReactionMxid("$nonexisting")).to.be.null;
        chai_1.expect(yield store.getFromKey(reaction)).to.eql(reaction);
        chai_1.expect(yield store.getForEvent(1, "blah")).to.eql([reaction]);
        yield store.delete("$event");
        chai_1.expect(yield store.exists(reaction)).to.be.false;
        yield store.insert(reaction);
        chai_1.expect(yield store.exists(reaction)).to.be.true;
        yield store.deleteForEvent(1, "blah");
        chai_1.expect(yield store.exists(reaction)).to.be.false;
    }));
});
//# sourceMappingURL=test_reactionstore.js.map