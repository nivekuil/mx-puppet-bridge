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
const log = new log_1.Log("DbReactionStore");
class DbReactionStore {
    constructor(db, protocol = "unknown") {
        this.db = db;
        this.protocol = protocol;
    }
    exists(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_exists"));
            const exists = yield this.db.Get(`SELECT 1 FROM reaction_store WHERE puppet_id = $pid AND user_id = $uid
			AND room_id = $rid AND user_id = $uid AND event_id = $eid AND key = $key`, {
                pid: data.puppetId,
                rid: data.roomId,
                uid: data.userId,
                eid: data.eventId,
                key: data.key,
            });
            stopTimer();
            return exists ? true : false;
        });
    }
    insert(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("insert"));
            if (yield this.exists(data)) {
                return false;
            }
            yield this.db.Run(`INSERT INTO reaction_store
			(puppet_id, user_id, room_id, event_id, reaction_mxid, key) VALUES
			($pid, $uid, $rid, $eid, $rmxid, $key)`, {
                pid: data.puppetId,
                uid: data.userId,
                rid: data.roomId,
                eid: data.eventId,
                rmxid: data.reactionMxid,
                key: data.key,
            });
            stopTimer();
            return true;
        });
    }
    getFromReactionMxid(reactionMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_by_reaction_mxid"));
            const row = yield this.db.Get("SELECT * FROM reaction_store WHERE reaction_mxid = $reactionMxid", { reactionMxid });
            stopTimer();
            return this.getFromRow(row);
        });
    }
    getFromKey(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_by_key"));
            const row = yield this.db.Get(`SELECT * FROM reaction_store WHERE puppet_id = $pid AND user_id = $uid AND room_id = $rid
			AND event_id = $eid AND key = $key`, {
                pid: data.puppetId,
                rid: data.roomId,
                uid: data.userId,
                eid: data.eventId,
                key: data.key,
            });
            stopTimer();
            return this.getFromRow(row);
        });
    }
    getForEvent(puppetId, eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_for_event"));
            const rows = yield this.db.All("SELECT * FROM reaction_store WHERE puppet_id = $puppetId AND event_id = $eventId", { puppetId, eventId });
            const result = [];
            for (const row of rows) {
                const entry = this.getFromRow(row);
                if (entry) {
                    result.push(entry);
                }
            }
            stopTimer();
            return result;
        });
    }
    delete(reactionMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("delete"));
            yield this.db.Run("DELETE FROM reaction_store WHERE reaction_mxid = $reactionMxid", { reactionMxid });
            stopTimer();
        });
    }
    deleteForEvent(puppetId, eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("delete_for_event"));
            yield this.db.Run("DELETE FROM reaction_store WHERE puppet_id = $puppetId AND event_id = $eventId", { puppetId, eventId });
            stopTimer();
        });
    }
    getFromRow(row) {
        if (!row) {
            return null;
        }
        return {
            puppetId: Number(row.puppet_id),
            roomId: row.room_id,
            userId: row.user_id,
            eventId: row.event_id,
            reactionMxid: row.reaction_mxid,
            key: row.key,
        };
    }
    labels(queryName) {
        return {
            protocol: this.protocol,
            engine: this.db.type,
            table: "reaction_store",
            type: queryName,
        };
    }
}
exports.DbReactionStore = DbReactionStore;
//# sourceMappingURL=reactionstore.js.map