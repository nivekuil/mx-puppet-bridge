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
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const stringformatter_1 = require("../../src/structures/stringformatter");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
describe("StringFormatter", () => {
    describe("format", () => {
        it("should format simple things", () => {
            const pattern = ":foo :bar";
            const vars = {
                foo: "Foo",
                bar: "Bar",
            };
            const ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("Foo Bar");
        });
        it("should leave unknown variables blank", () => {
            const pattern = ":foo :bar";
            const vars = {
                foo: "Foo",
            };
            const ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("Foo ");
        });
        it("should do simple if-conditions", () => {
            const pattern = "[:cond?t,f]";
            const vars = {
                cond: "blah",
            };
            let ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("t");
            vars.cond = "";
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("f");
        });
        it("should do nested if-conditions", () => {
            const pattern = "fox [:cond?and [:anim?Bunny,Raccoon],alone]";
            const vars = {
                cond: "",
                anim: "",
            };
            let ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox alone");
            vars.cond = "blah";
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox and Raccoon");
            vars.anim = "blah";
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox and Bunny");
        });
        it("should handle backslash correctly", () => {
            let pattern = "fox [:cond?and \\[\\:anim\\?Bunny\\,Raccoon\\],alone]";
            const vars = {
                cond: "blah",
            };
            let ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox and [:anim?Bunny,Raccoon]");
            pattern = "fox \\:cond \\[beep\\]";
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox :cond [beep]");
        });
        it("should do equality conditions", () => {
            const pattern = "[:var=fox?fox,bunny]";
            const vars = {
                var: "fox",
            };
            let ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox");
            vars.var = "nofox";
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("bunny");
        });
        it("should do or conditions", () => {
            const pattern = "[:var1|:var2?fox,bunny]";
            let vars = {
                var1: "fox",
            };
            let ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox");
            vars = {
                var2: "fox",
            };
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox");
            vars = {
                var1: "fox",
                var2: "fox",
            };
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox");
            vars = {};
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("bunny");
        });
        it("should do and conditions", () => {
            const pattern = "[:var1&:var2?fox,bunny]";
            let vars = {
                var1: "fox",
            };
            let ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("bunny");
            vars = {
                var2: "fox",
            };
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("bunny");
            vars = {
                var1: "fox",
                var2: "fox",
            };
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox");
            vars = {};
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("bunny");
        });
        it("should do xor conditions", () => {
            const pattern = "[:var1^:var2?fox,bunny]";
            let vars = {
                var1: "fox",
            };
            let ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox");
            vars = {
                var2: "fox",
            };
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox");
            vars = {
                var1: "fox",
                var2: "fox",
            };
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("bunny");
            vars = {};
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("bunny");
        });
        it("should do paranthesis", () => {
            const pattern = "[(:var1=fox)&(:var2=bunny)?fox,bunny]";
            let vars = {
                var1: "fox",
            };
            let ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("bunny");
            vars = {
                var2: "bunny",
            };
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("bunny");
            vars = {
                var1: "fox",
                var2: "bunny",
            };
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("fox");
            vars = {};
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("bunny");
        });
        it("should do multiple if-conditions", () => {
            const pattern = "[:team?:team - ,][:type=channel?#,]:name";
            let vars = {
                team: "Foxes",
                type: "channel",
                name: "den",
            };
            let ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("Foxes - #den");
            vars = {
                type: "channel",
                name: "den",
            };
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("#den");
            vars = {
                team: "Foxes",
                type: "voice",
                name: "den",
            };
            ret = stringformatter_1.StringFormatter.format(pattern, vars);
            chai_1.expect(ret).to.equal("Foxes - den");
        });
    });
});
//# sourceMappingURL=test_stringformatter.js.map