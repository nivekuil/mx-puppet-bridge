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
        this.description = "Add puppet types";
    }
    run(store) {
        return __awaiter(this, void 0, void 0, function* () {
            yield store.db.Exec("ALTER TABLE puppet_store ADD type INTEGER DEFAULT '0'");
            yield store.db.Exec("ALTER TABLE puppet_store ADD is_public INTEGER DEFAULT '0'");
            yield store.db.Exec("ALTER TABLE puppet_store ADD autoinvite INTEGER DEFAULT '1'");
        });
    }
    rollBack(store) {
        return __awaiter(this, void 0, void 0, function* () {
            // sqlite has no drop column
            yield store.createTable(`
			CREATE TABLE puppet_store_tmp (
				puppet_id SERIAL PRIMARY KEY,
				puppet_mxid TEXT NOT NULL,
				data TEXT NOT NULL,
				user_id TEXT DEFAULT NULL
			);
		`, "puppet_store_tmp");
            yield store.db.Exec(`INSERT INTO puppet_store_tmp
			(puppet_id, puppet_mxid, data, user_id)
			SELECT old.puppet_id, old.puppet_mxid, old.data, old.user_id
			FROM puppet_store AS old`);
            yield store.db.Exec("DROP TABLE puppet_store");
            yield store.db.Exec("ALTER TABLE puppet_store_tmp RENAME TO puppet_store");
        });
    }
}
exports.Schema = Schema;
//# sourceMappingURL=v11.js.map