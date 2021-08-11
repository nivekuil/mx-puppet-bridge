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
const messagededuplicator_1 = require("../../src/structures/messagededuplicator");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
describe("MessageDeduplicator", () => {
    describe("Functionality", () => {
        it("should deduplicate messages based on content", () => __awaiter(void 0, void 0, void 0, function* () {
            const dedupe = new messagededuplicator_1.MessageDeduplicator();
            dedupe.lock("room", "author", "hello world");
            setTimeout(() => {
                dedupe.unlock("room");
            }, 50);
            const ret = yield dedupe.dedupe("room", "author", undefined, "hello world");
            chai_1.expect(ret).to.be.true;
            dedupe["authorIds"].delete("author");
        }));
        it("should not dedupe message if content is different", () => __awaiter(void 0, void 0, void 0, function* () {
            const dedupe = new messagededuplicator_1.MessageDeduplicator();
            dedupe.lock("room", "author", "hello world");
            setTimeout(() => {
                dedupe.unlock("room");
            }, 50);
            const ret = yield dedupe.dedupe("room", "author", undefined, "hello world!!");
            chai_1.expect(ret).to.be.false;
            dedupe["authorIds"].delete("author");
            dedupe["data"].delete("room;author;m:hello world");
        }));
        it("should not dedupe message if it is from a different author", () => __awaiter(void 0, void 0, void 0, function* () {
            const dedupe = new messagededuplicator_1.MessageDeduplicator();
            dedupe.lock("room", "author", "hello world");
            setTimeout(() => {
                dedupe.unlock("room");
            }, 50);
            const ret = yield dedupe.dedupe("room", "author2", undefined, "hello world");
            chai_1.expect(ret).to.be.false;
            dedupe["authorIds"].delete("author");
            dedupe["data"].delete("room;author;m:hello world");
        }));
        it("should deduplicate messages based on event ID", () => __awaiter(void 0, void 0, void 0, function* () {
            const dedupe = new messagededuplicator_1.MessageDeduplicator();
            dedupe.lock("room", "author");
            setTimeout(() => {
                dedupe.unlock("room", "author", "event");
            }, 50);
            const ret = yield dedupe.dedupe("room", "author", "event");
            chai_1.expect(ret).to.be.true;
            dedupe["authorIds"].delete("author");
        }));
        it("should not dedupe message if event ID is different", () => __awaiter(void 0, void 0, void 0, function* () {
            const dedupe = new messagededuplicator_1.MessageDeduplicator();
            dedupe.lock("room", "author");
            setTimeout(() => {
                dedupe.unlock("room", "author", "event");
            }, 50);
            const ret = yield dedupe.dedupe("room", "author", "event2");
            chai_1.expect(ret).to.be.false;
            dedupe["authorIds"].delete("author");
            dedupe["data"].delete("room;author;e:event");
        }));
        it("should not dedupe message if event ID is from other author", () => __awaiter(void 0, void 0, void 0, function* () {
            const dedupe = new messagededuplicator_1.MessageDeduplicator();
            dedupe.lock("room", "author");
            setTimeout(() => {
                dedupe.unlock("room", "author", "event");
            }, 50);
            setTimeout(() => {
                dedupe["authorIds"].delete("author");
                dedupe["data"].delete("room;author;e:event");
            }, 70);
            const ret = yield dedupe.dedupe("room", "author2", "event");
            chai_1.expect(ret).to.be.false;
        }));
        it("should dedupe if event id matches, even if message doesn't", () => __awaiter(void 0, void 0, void 0, function* () {
            const dedupe = new messagededuplicator_1.MessageDeduplicator();
            dedupe.lock("room", "author", "hello world");
            setTimeout(() => {
                dedupe.unlock("room", "author", "event");
            }, 50);
            const ret = yield dedupe.dedupe("room", "author", "event", "hello world!!");
            chai_1.expect(ret).to.be.true;
            dedupe["authorIds"].delete("author");
            dedupe["data"].delete("room;author;m:hello world");
        }));
        it("should dedupe if message matches, even if event id doesn't", () => __awaiter(void 0, void 0, void 0, function* () {
            const dedupe = new messagededuplicator_1.MessageDeduplicator();
            dedupe.lock("room", "author", "hello world");
            setTimeout(() => {
                dedupe.unlock("room", "author", "event");
            }, 50);
            const ret = yield dedupe.dedupe("room", "author", "event2", "hello world");
            chai_1.expect(ret).to.be.true;
            dedupe["authorIds"].delete("author");
            dedupe["data"].delete("room;author;e:event");
        }));
        it("should dedupe if timeout is reached but message is correct", () => __awaiter(void 0, void 0, void 0, function* () {
            const dedupe = new messagededuplicator_1.MessageDeduplicator(50);
            dedupe.lock("room", "author", "hello world");
            setTimeout(() => {
                dedupe.unlock("room", "author", "event");
                dedupe["authorIds"].delete("author");
                dedupe["data"].delete("room;author;e:event");
            }, 75);
            const ret = yield dedupe.dedupe("room", "author", "event", "hello world");
            chai_1.expect(ret).to.be.true;
        }));
    });
});
//# sourceMappingURL=test_messagededuplicator.js.map