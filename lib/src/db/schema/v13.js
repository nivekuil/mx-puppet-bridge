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
const log_1 = require("../../log");
const log = new log_1.Log("v13 Migration");
class Schema {
    constructor() {
        this.description = "chan_store --> room_store, and add more parameters";
    }
    run(store) {
        return __awaiter(this, void 0, void 0, function* () {
            yield store.createTable(`
			CREATE TABLE room_store (
				mxid TEXT NOT NULL,
				room_id TEXT NOT NULL,
				puppet_id INTEGER NOT NULL,
				name TEXT DEFAULT NULL,
				avatar_url TEXT DEFAULT NULL,
				avatar_mxc TEXT DEFAULT NULL,
				avatar_hash TEXT DEFAULT NULL,
				topic TEXT DEFAULT NULL,
				group_id TEXT DEFAULT NULL,
				is_direct INTEGER DEFAULT '0',
				e2be INTEGER DEFAULT '0',
				external_url TEXT DEFAULT NULL,
				is_used INTEGER DEFAULT '0'
			);
		`, "room_store");
            yield store.db.Exec(`INSERT INTO room_store
			(mxid, room_id, puppet_id, name, avatar_url, avatar_mxc, avatar_hash, topic, group_id)
			SELECT old.mxid, old.room_id, old.puppet_id, old.name, old.avatar_url, old.avatar_mxc, old.avatar_hash, old.topic, old.group_id
			FROM chan_store AS old`);
            yield store.db.Exec("DROP TABLE chan_store");
            const rows = yield store.db.All("SELECT * FROM room_store");
            for (const row of rows) {
                const mxid = row.mxid;
                log.info(`Migrating room ${mxid}...`);
                try {
                    const opMxid = yield store.roomStore.getRoomOp(mxid);
                    if (opMxid) {
                        const opIntent = store.bridge.AS.getIntentForUserId(opMxid);
                        try {
                            const evt = yield opIntent.underlyingClient.getRoomStateEvent(mxid, "m.room.canonical_alias", "");
                            if (evt && evt.alias) {
                                // assuming this is a non-direct room
                                // so lets have the bridge bot join and OP it
                                yield store.bridge.botIntent.ensureRegisteredAndJoined(mxid);
                                const powerLevels = yield opIntent.underlyingClient.getRoomStateEvent(mxid, "m.room.power_levels", "");
                                powerLevels.users[store.bridge.botIntent.userId] = powerLevels.users[opMxid];
                                yield opIntent.underlyingClient.sendStateEvent(mxid, "m.room.power_levels", "", powerLevels);
                                yield store.roomStore.setRoomOp(mxid, store.bridge.botIntent.userId);
                            }
                            else {
                                yield store.db.Run("UPDATE room_store SET is_direct = 1 WHERE mxid = $mxid", { mxid });
                            }
                        }
                        catch (e) {
                            log.verbose("No canonical alias found, assuming a direct chat");
                            log.silly(e.error || e.body || e);
                            yield store.db.Run("UPDATE room_store SET is_direct = 1 WHERE mxid = $mxid", { mxid });
                        }
                    }
                    else {
                        log.warn(`No op in room ${mxid}, assuming a direct chat`);
                        yield store.db.Run("UPDATE room_store SET is_direct = 1 WHERE mxid = $mxid", { mxid });
                    }
                }
                catch (err) {
                    log.warn(`Failed to migrate room ${mxid}`, err);
                }
            }
        });
    }
    rollBack(store) {
        return __awaiter(this, void 0, void 0, function* () {
            // sqlite has no drop column
            yield store.createTable(`
			CREATE TABLE chan_store (
				mxid TEXT NOT NULL,
				room_id TEXT NOT NULL,
				puppet_id INTEGER NOT NULL,
				name TEXT DEFAULT NULL,
				avatar_url TEXT DEFAULT NULL,
				avatar_mxc TEXT DEFAULT NULL,
				avatar_hash TEXT DEFAULT NULL,
				topic TEXT DEFAULT NULL,
				group_id TEXT DEFAULT NULL
			);
		`, "chan_store");
            yield store.db.Exec(`INSERT INTO chan_store
			(mxid, room_id, puppet_id, name, avatar_url, avatar_mxc, avatar_hash, topic, group_id)
			SELECT old.mxid, old.room_id, old.puppet_id, old.name, old.avatar_url, old.avatar_mxc, old.avatar_hash, old.topic, old.group_id
			FROM room_store AS old`);
            yield store.db.Exec("DROP TABLE room_store");
        });
    }
}
exports.Schema = Schema;
//# sourceMappingURL=v13.js.map