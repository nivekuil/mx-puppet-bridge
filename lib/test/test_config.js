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
const config_1 = require("../src/config");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
describe("Config", () => {
    it("should merge configs correctly", () => {
        const config = new config_1.Config();
        config.applyConfig({
            bridge: {
                domain: "example.org",
                homeserverUrl: "https://matrix.example.org",
            },
            logging: {
                console: {
                    level: "info",
                },
            },
        });
        chai_1.expect(config.bridge.domain).to.equal("example.org");
        chai_1.expect(config.bridge.homeserverUrl).to.equal("https://matrix.example.org");
        chai_1.expect(config.logging.console.level).to.equal("info");
    });
    it("should not error out on empty objects", () => {
        const config = new config_1.Config();
        config.applyConfig({
            bridge: {
                domain: "example.org",
                homeserverUrl: "https://matrix.example.org",
            },
            logging: null,
        });
    });
});
//# sourceMappingURL=test_config.js.map