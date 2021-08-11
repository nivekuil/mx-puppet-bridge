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
const eventstore_1 = require("../../src/db/eventstore");
const store_1 = require("../../src/store");
const prometheus = require("prom-client");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
function getStore() {
    return __awaiter(this, void 0, void 0, function* () {
        prometheus.register.clear();
        const store = new store_1.Store({
            filename: ":memory:",
        }, {});
        yield store.init();
        return new eventstore_1.DbEventStore(store.db);
    });
}
beforeEach("Prometheus clean up", () => {
    prometheus.register.clear();
});
describe("DbEventStore", () => {
    it("should insert things", () => __awaiter(void 0, void 0, void 0, function* () {
        const store = yield getStore();
        yield store.insert(1, "room", "ma", "ra");
        yield store.insert(1, "room", "mb", "rb");
        chai_1.expect(yield store.getRemote(1, "room", "ma")).to.eql(["ra"]);
        chai_1.expect(yield store.getMatrix(1, "room", "rb")).to.eql(["mb"]);
    }));
    it("should fetch multi-results matrix->remote", () => __awaiter(void 0, void 0, void 0, function* () {
        const store = yield getStore();
        yield store.insert(1, "room", "ma", "ra");
        yield store.insert(1, "room", "ma", "rb");
        chai_1.expect(yield store.getRemote(1, "room", "ma")).to.eql(["ra", "rb"]);
    }));
    it("should fetch multi-results remote->matrix", () => __awaiter(void 0, void 0, void 0, function* () {
        const store = yield getStore();
        yield store.insert(1, "room", "ma", "ra");
        yield store.insert(1, "room", "mb", "ra");
        chai_1.expect(yield store.getMatrix(1, "room", "ra")).to.eql(["ma", "mb"]);
    }));
    it("should return blanks on not found", () => __awaiter(void 0, void 0, void 0, function* () {
        const store = yield getStore();
        yield store.insert(1, "room", "ma", "ra");
        chai_1.expect(yield store.getMatrix(1, "room", "rb")).to.eql([]);
        chai_1.expect(yield store.getRemote(1, "room", "mb")).to.eql([]);
    }));
    it("should remove entires", () => __awaiter(void 0, void 0, void 0, function* () {
        const store = yield getStore();
        yield store.insert(1, "room", "ma", "ra");
        yield store.remove(1, "room", "ra");
        chai_1.expect(yield store.getMatrix(1, "room", "ra")).to.eql([]);
    }));
});
//# sourceMappingURL=test_eventstore.js.map