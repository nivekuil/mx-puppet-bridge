"use strict";
/*
Copyright 2019, 2020 mx-puppet-bridge
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
const timedcache_1 = require("../structures/timedcache");
const log = new log_1.Log("DbUserStore");
// tslint:disable-next-line:no-magic-numbers
const USERS_CACHE_LIFETIME = 1000 * 60 * 60 * 24;
class DbUserStore {
    constructor(db, cache = true, protocol = "unknown") {
        this.db = db;
        this.usersCache = new timedcache_1.TimedCache(cache ? USERS_CACHE_LIFETIME : 0);
        this.protocol = protocol;
    }
    newData(puppetId, userId) {
        return {
            puppetId,
            userId,
        };
    }
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_all"));
            const results = [];
            const rows = yield this.db.All("SELECT * FROM user_store;");
            if (!rows) {
                return [];
            }
            for (const r of rows) {
                const data = {
                    name: r.name,
                    userId: r.user_id,
                    puppetId: r.puppet_id,
                    avatarUrl: r.avatar_url,
                    avatarMxc: r.avatar_mxc,
                    avatarHash: r.avatar_hash,
                };
                results.push(data);
            }
            stopTimer();
            return results;
        });
    }
    get(puppetId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select"));
            const cacheKey = `${puppetId};${userId}`;
            const cached = this.usersCache.get(cacheKey);
            if (cached) {
                return cached;
            }
            const row = yield this.db.Get("SELECT * FROM user_store WHERE user_id = $id AND puppet_id = $pid", { id: userId, pid: puppetId });
            if (!row) {
                return null;
            }
            const data = this.newData(puppetId, userId);
            data.name = row.name;
            data.avatarUrl = row.avatar_url;
            data.avatarMxc = row.avatar_mxc;
            data.avatarHash = row.avatar_hash;
            this.usersCache.set(cacheKey, data);
            stopTimer();
            return data;
        });
    }
    set(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("insert_update"));
            const exists = yield this.db.Get("SELECT 1 FROM user_store WHERE user_id = $id AND puppet_id = $pid", { id: data.userId, pid: data.puppetId });
            let query = "";
            if (!exists) {
                query = `INSERT INTO user_store (
				user_id,
				puppet_id,
				name,
				avatar_url,
				avatar_mxc,
				avatar_hash
			) VALUES (
				$user_id,
				$puppet_id,
				$name,
				$avatar_url,
				$avatar_mxc,
				$avatar_hash
			)`;
            }
            else {
                query = `UPDATE user_store SET
				name = $name,
				avatar_url = $avatar_url,
				avatar_mxc = $avatar_mxc,
				avatar_hash = $avatar_hash
				WHERE user_id = $user_id AND puppet_id = $puppet_id`;
            }
            yield this.db.Run(query, {
                user_id: data.userId,
                puppet_id: data.puppetId,
                name: data.name || null,
                avatar_url: data.avatarUrl || null,
                avatar_mxc: data.avatarMxc || null,
                avatar_hash: data.avatarHash || null,
            });
            const cacheKey = `${data.puppetId};${data.userId}`;
            this.usersCache.set(cacheKey, data);
            stopTimer();
        });
    }
    delete(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("delete"));
            yield this.db.Run("DELETE FROM user_store WHERE user_id = $user_id AND puppet_id = $puppet_id", {
                user_id: data.userId,
                puppet_id: data.puppetId,
            });
            // also delete the room overrides
            yield this.db.Run("DELETE FROM user_store_room_override WHERE user_id = $user_id AND puppet_id = $puppet_id", {
                user_id: data.userId,
                puppet_id: data.puppetId,
            });
            const cacheKey = `${data.puppetId};${data.userId}`;
            this.usersCache.delete(cacheKey);
            stopTimer();
        });
    }
    newRoomOverrideData(puppetId, userId, roomId) {
        return {
            puppetId,
            userId,
            roomId,
        };
    }
    getRoomOverride(puppetId, userId, roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("get_room_override"));
            const row = yield this.db.Get("SELECT * FROM user_store_room_override WHERE user_id = $uid AND puppet_id = $pid AND room_id = $rid", {
                uid: userId,
                pid: puppetId,
                rid: roomId,
            });
            if (!row) {
                return null;
            }
            stopTimer();
            return this.getRoomOverrideFromRow(row);
        });
    }
    setRoomOverride(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("insert_update_room_override"));
            const exists = yield this.db.Get("SELECT 1 FROM user_store_room_override WHERE user_id = $uid AND puppet_id = $pid AND room_id = $rid", {
                uid: data.userId,
                pid: data.puppetId,
                rid: data.roomId,
            });
            let query = "";
            if (!exists) {
                query = `INSERT INTO user_store_room_override (
				user_id,
				puppet_id,
				room_id,
				name,
				avatar_url,
				avatar_mxc,
				avatar_hash
			) VALUES (
				$user_id,
				$puppet_id,
				$room_id,
				$name,
				$avatar_url,
				$avatar_mxc,
				$avatar_hash
			)`;
            }
            else {
                query = `UPDATE user_store_room_override SET
				name = $name,
				avatar_url = $avatar_url,
				avatar_mxc = $avatar_mxc,
				avatar_hash = $avatar_hash
				WHERE user_id = $user_id AND puppet_id = $puppet_id AND room_id = $room_id`;
            }
            yield this.db.Run(query, {
                user_id: data.userId,
                puppet_id: data.puppetId,
                room_id: data.roomId,
                name: data.name || null,
                avatar_url: data.avatarUrl || null,
                avatar_mxc: data.avatarMxc || null,
                avatar_hash: data.avatarHash || null,
            });
            stopTimer();
        });
    }
    getAllRoomOverrides(puppetId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_all_room_override"));
            const result = [];
            const rows = yield this.db.All("SELECT * FROM user_store_room_override WHERE user_id = $uid AND puppet_id = $pid", {
                uid: userId,
                pid: puppetId,
            });
            for (const row of rows) {
                const entry = this.getRoomOverrideFromRow(row);
                if (entry) {
                    result.push(entry);
                }
            }
            stopTimer();
            return result;
        });
    }
    getRoomOverrideFromRow(row) {
        if (!row) {
            return null;
        }
        const data = this.newRoomOverrideData(Number(row.puppet_id), row.user_id, row.room_id);
        data.name = row.name;
        data.avatarUrl = row.avatar_url;
        data.avatarMxc = row.avatar_mxc;
        data.avatarHash = row.avatar_hash;
        return data;
    }
    labels(queryName) {
        return {
            protocol: this.protocol,
            engine: this.db.type,
            table: "user_store",
            type: queryName,
        };
    }
}
exports.DbUserStore = DbUserStore;
//# sourceMappingURL=userstore.js.map