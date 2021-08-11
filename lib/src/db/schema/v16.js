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
function createIndex(store, table, columns, wipe = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const columnsStr = columns.join(", ");
        try {
            yield store.db.Exec(`CREATE UNIQUE INDEX ${table}_unique ON ${table} (${columnsStr})`);
        }
        catch (err) {
            if (wipe) {
                yield store.db.Exec(`DELETE FROM ${table}`);
            }
            else {
                if (store.db.type === "postgres") {
                    const wherestr = columns.map((c) => `a.${c} = b.${c}`).join(" AND ");
                    yield store.db.Exec(`DELETE FROM ${table} a WHERE a.ctid <> (SELECT min(b.ctid) FROM ${table} b WHERE ${wherestr})`);
                }
                else {
                    yield store.db.Exec(`DELETE FROM ${table} WHERE rowid NOT IN (SELECT min(rowid) FROM ${table} GROUP BY ${columnsStr})`);
                }
            }
            yield store.db.Exec(`CREATE UNIQUE INDEX ${table}_unique ON ${table} (${columnsStr})`);
        }
    });
}
const indexes = [
    ["room_store", ["puppet_id", "room_id"]],
    ["group_store", ["puppet_id", "group_id"]],
    ["group_store_rooms", ["puppet_id", "group_id", "room_id"]],
    ["ghosts_joined_chans", ["ghost_mxid", "chan_mxid"]],
    ["puppet_mxid_store", ["puppet_mxid"]],
    ["emote_store", ["puppet_id", "room_id", "emote_id"], true],
    ["reaction_store", ["puppet_id", "room_id", "user_id", "event_id", "key"]],
    ["user_store", ["puppet_id", "user_id"], true],
    ["user_store_room_override", ["puppet_id", "user_id", "room_id"], true],
];
class Schema {
    constructor() {
        this.description = "add unique indexes";
    }
    run(store) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const i of indexes) {
                // tslint:disable-next-line no-magic-numbers
                yield createIndex(store, i[0], i[1], i[2]);
            }
        });
    }
    rollBack(store) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const i of indexes) {
                yield store.db.Exec(`DROP INDEX IF EXISTS ${i[0]}_unique`);
            }
        });
    }
}
exports.Schema = Schema;
//# sourceMappingURL=v16.js.map