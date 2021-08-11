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
const lock_1 = require("../../src/structures/lock");
const LOCKTIMEOUT = 300;
describe("Lock", () => {
    it("should lock and unlock", () => __awaiter(void 0, void 0, void 0, function* () {
        const lock = new lock_1.Lock(LOCKTIMEOUT);
        const t = Date.now();
        lock.set("bunny");
        yield lock.wait("bunny");
        const diff = Date.now() - t;
        chai_1.expect(diff).to.be.greaterThan(LOCKTIMEOUT - 1);
    }));
    it("should lock and unlock early, if unlocked", () => __awaiter(void 0, void 0, void 0, function* () {
        const SHORTDELAY = 100;
        const DELAY_ACCURACY = 5;
        const lock = new lock_1.Lock(LOCKTIMEOUT);
        setTimeout(() => lock.release("fox"), SHORTDELAY);
        const t = Date.now();
        lock.set("fox");
        yield lock.wait("fox");
        const diff = Date.now() - t;
        // accuracy can be off by a few ms soemtimes
        chai_1.expect(diff).to.be.greaterThan(SHORTDELAY - DELAY_ACCURACY);
        chai_1.expect(diff).to.be.lessThan(SHORTDELAY + DELAY_ACCURACY);
    }));
});
//# sourceMappingURL=test_lock.js.map