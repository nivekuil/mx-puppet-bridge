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
class Schema {
    constructor() {
        this.description = "Add file mxc map table";
    }
    run(store) {
        return __awaiter(this, void 0, void 0, function* () {
            yield store.createTable(`
			CREATE TABLE file_mxc_map (
				id SERIAL PRIMARY KEY,
				thing TEXT NOT NULL,
				mxc_url TEXT NOT NULL,
				filename TEXT
			);
		`, "file_mxc_map");
        });
    }
    rollBack(store) {
        return __awaiter(this, void 0, void 0, function* () {
            // sqlite has no drop column
            yield store.db.Exec("DROP TABLE file_mxc_map");
        });
    }
}
exports.Schema = Schema;
//# sourceMappingURL=v7.js.map