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
const log_1 = require("../log");
const log = new log_1.Log("DbEmoteStore");
class DbEmoteStore {
    constructor(db, protocol = "unknown") {
        this.db = db;
        this.protocol = protocol;
    }
    newData(puppetId, roomId, emoteId) {
        return {
            puppetId,
            roomId,
            emoteId,
            name: null,
            avatarUrl: null,
            avatarMxc: null,
            avatarHash: null,
            data: {},
        };
    }
    get(puppetId, roomId, emoteId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select"));
            if (roomId) {
                const row = yield this.db.Get("SELECT * FROM emote_store WHERE puppet_id = $pid AND room_id = $rid AND emote_id = $eid LIMIT 1", {
                    pid: puppetId,
                    rid: roomId,
                    eid: emoteId,
                });
                stopTimer();
                return this.getFromRow(row);
            }
            else {
                const row = yield this.db.Get("SELECT * FROM emote_store WHERE puppet_id = $pid AND emote_id = $eid LIMIT 1", {
                    pid: puppetId,
                    eid: emoteId,
                });
                stopTimer();
                return this.getFromRow(row);
            }
        });
    }
    getByMxc(puppetId, roomId, mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_by_mxc"));
            if (roomId) {
                const row = yield this.db.Get("SELECT * FROM emote_store WHERE puppet_id = $pid AND room_id = $rid AND avatar_mxc = $mxid LIMIT 1", {
                    pid: puppetId,
                    rid: roomId,
                    mxid,
                });
                stopTimer();
                return this.getFromRow(row);
            }
            else {
                const row = yield this.db.Get("SELECT * FROM emote_store WHERE puppet_id = $pid AND avatar_mxc = $mxid LIMIT 1", {
                    pid: puppetId,
                    mxid,
                });
                stopTimer();
                return this.getFromRow(row);
            }
        });
    }
    getForRoom(puppetId, roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_by_room"));
            const rows = yield this.db.All("SELECT * FROM emote_store WHERE puppet_id = $pid AND room_id = $rid", {
                pid: puppetId,
                rid: roomId,
            });
            const result = [];
            for (const r of rows) {
                const res = this.getFromRow(r);
                if (res) {
                    result.push(res);
                }
            }
            stopTimer();
            return result;
        });
    }
    set(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("insert_update"));
            let exists = null;
            if (data.roomId) {
                exists = yield this.db.Get("SELECT * FROM emote_store WHERE puppet_id = $pid AND room_id = $rid AND emote_id = $eid LIMIT 1", {
                    pid: data.puppetId,
                    rid: data.roomId,
                    eid: data.emoteId,
                });
            }
            else {
                exists = yield this.db.Get("SELECT * FROM emote_store WHERE puppet_id = $pid AND emote_id = $eid LIMIT 1", {
                    pid: data.puppetId,
                    eid: data.emoteId,
                });
            }
            let query = "";
            if (!exists) {
                query = `INSERT INTO emote_store (
				puppet_id,
				room_id,
				emote_id,
				name,
				avatar_url,
				avatar_mxc,
				avatar_hash,
				data
			) VALUES (
				$pid,
				$rid,
				$eid,
				$name,
				$avatar_url,
				$avatar_mxc,
				$avatar_hash,
				$data
			)`;
            }
            else {
                query = `UPDATE emote_store SET
				name = $name,
				avatar_url = $avatar_url,
				avatar_mxc = $avatar_mxc,
				avatar_hash = $avatar_hash,
				data = $data
				WHERE puppet_id = $pid
				AND room_id = $rid
				AND emote_id = $eid`;
            }
            yield this.db.Run(query, {
                pid: data.puppetId,
                rid: data.roomId || (exists && exists.room_id) || null,
                eid: data.emoteId,
                name: data.name || null,
                avatar_url: data.avatarUrl || null,
                avatar_mxc: data.avatarMxc || null,
                avatar_hash: data.avatarHash || null,
                data: JSON.stringify(data.data || {}),
            });
            stopTimer();
        });
    }
    getFromRow(row) {
        if (!row) {
            return null;
        }
        return {
            puppetId: Number(row.puppet_id),
            roomId: (row.room_id || null),
            emoteId: row.emote_id,
            name: (row.name || null),
            avatarUrl: (row.avatar_url || null),
            avatarMxc: (row.avatar_mxc || null),
            avatarHash: (row.avatar_hash || null),
            data: JSON.parse(row.data),
        };
    }
    labels(queryName) {
        return {
            protocol: this.protocol,
            engine: this.db.type,
            table: "emote_store",
            type: queryName,
        };
    }
}
exports.DbEmoteStore = DbEmoteStore;
//# sourceMappingURL=emotestore.js.map