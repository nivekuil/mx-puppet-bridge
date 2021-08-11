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
const store_1 = require("../src/store");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
function getStore() {
    return __awaiter(this, void 0, void 0, function* () {
        const store = new store_1.Store({
            filename: ":memory:",
        }, {});
        yield store.init();
        return store;
    });
}
describe("Store", () => {
    describe("init", () => {
        it("should be able to create a db", () => __awaiter(void 0, void 0, void 0, function* () {
            yield getStore();
        }));
    });
    describe("get/set file mxc", () => __awaiter(void 0, void 0, void 0, function* () {
        it("should return null, if mxc isn't found", () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore();
            const ret = yield store.getFileMxc("blah");
            chai_1.expect(ret).to.be.null;
        }));
        it("should return the mxc, if it is found", () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore();
            yield store.setFileMxc("blah", "mxc://somefile");
            const ret = yield store.getFileMxc("blah");
            chai_1.expect(ret).to.equal("mxc://somefile");
        }));
        it("should handle buffers", () => __awaiter(void 0, void 0, void 0, function* () {
            const store = yield getStore();
            const buffer = Buffer.from("blubb");
            yield store.setFileMxc(buffer, "mxc://somefile");
            const ret = yield store.getFileMxc(buffer);
            chai_1.expect(ret).to.equal("mxc://somefile");
        }));
    }));
});
//# sourceMappingURL=test_store.js.map