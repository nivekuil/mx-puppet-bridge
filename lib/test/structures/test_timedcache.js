"use strict";
/*
Copyright 2019 matrix-appservice-discord
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
const timedcache_1 = require("../../src/structures/timedcache");
const util_1 = require("../../src/util");
// we are a test file and thus need those
/* tslint:disable:no-unused-expression max-file-line-count no-any */
describe("TimedCache", () => {
    it("should construct", () => {
        const timedCache = new timedcache_1.TimedCache(1000);
        chai_1.expect(timedCache.size).to.equal(0);
    });
    it("should add and get values", () => {
        const timedCache = new timedcache_1.TimedCache(1000);
        timedCache.set("foo", 1);
        timedCache.set("bar", -1);
        timedCache.set("baz", 0);
        chai_1.expect(timedCache.get("foo")).to.equal(1);
        chai_1.expect(timedCache.get("bar")).to.equal(-1);
        chai_1.expect(timedCache.get("baz")).to.equal(0);
    });
    it("should be able to overwrite values", () => {
        const timedCache = new timedcache_1.TimedCache(1000);
        timedCache.set("foo", 1);
        chai_1.expect(timedCache.get("foo")).to.equal(1);
        timedCache.set("bar", 0);
        timedCache.set("foo", -1);
        chai_1.expect(timedCache.get("bar")).to.equal(0);
        chai_1.expect(timedCache.get("foo")).to.equal(-1);
    });
    it("should be able to check if a value exists", () => {
        const timedCache = new timedcache_1.TimedCache(1000);
        chai_1.expect(timedCache.has("foo")).to.be.false;
        timedCache.set("foo", 1);
        chai_1.expect(timedCache.has("foo")).to.be.true;
        timedCache.set("bar", 1);
        chai_1.expect(timedCache.has("bar")).to.be.true;
    });
    it("should be able to delete a value", () => {
        const timedCache = new timedcache_1.TimedCache(1000);
        timedCache.set("foo", 1);
        chai_1.expect(timedCache.has("foo")).to.be.true;
        timedCache.delete("foo");
        chai_1.expect(timedCache.has("foo")).to.be.false;
        chai_1.expect(timedCache.get("foo")).to.be.undefined;
    });
    it("should expire a value", () => __awaiter(void 0, void 0, void 0, function* () {
        const LIVE_FOR = 50;
        const timedCache = new timedcache_1.TimedCache(LIVE_FOR);
        timedCache.set("foo", 1);
        chai_1.expect(timedCache.has("foo")).to.be.true;
        chai_1.expect(timedCache.get("foo")).to.equal(1);
        yield util_1.Util.sleep(LIVE_FOR);
        chai_1.expect(timedCache.has("foo")).to.be.false;
        chai_1.expect(timedCache.get("foo")).to.be.undefined;
    }));
    it("should be able to iterate around a long-lasting collection", () => {
        const timedCache = new timedcache_1.TimedCache(1000);
        timedCache.set("foo", 1);
        timedCache.set("bar", -1);
        timedCache.set("baz", 0);
        let i = 0;
        for (const iterator of timedCache) {
            if (i === 0) {
                chai_1.expect(iterator[0]).to.equal("foo");
                chai_1.expect(iterator[1]).to.equal(1);
            }
            else if (i === 1) {
                chai_1.expect(iterator[0]).to.equal("bar");
                chai_1.expect(iterator[1]).to.equal(-1);
            }
            else {
                chai_1.expect(iterator[0]).to.equal("baz");
                chai_1.expect(iterator[1]).to.equal(0);
            }
            i++;
        }
    });
    it("should be able to iterate around a short-term collection", () => __awaiter(void 0, void 0, void 0, function* () {
        const LIVE_FOR = 100;
        const timedCache = new timedcache_1.TimedCache(LIVE_FOR);
        timedCache.set("foo", 1);
        timedCache.set("bar", -1);
        timedCache.set("baz", 0);
        let i = 0;
        for (const iterator of timedCache) {
            if (i === 0) {
                chai_1.expect(iterator[0]).to.equal("foo");
                chai_1.expect(iterator[1]).to.equal(1);
            }
            else if (i === 1) {
                chai_1.expect(iterator[0]).to.equal("bar");
                chai_1.expect(iterator[1]).to.equal(-1);
            }
            else {
                chai_1.expect(iterator[0]).to.equal("baz");
                chai_1.expect(iterator[1]).to.equal(0);
            }
            i++;
        }
        yield util_1.Util.sleep(LIVE_FOR);
        const vals = [...timedCache.entries()];
        chai_1.expect(vals).to.be.empty;
    }));
});
//# sourceMappingURL=test_timedcache.js.map