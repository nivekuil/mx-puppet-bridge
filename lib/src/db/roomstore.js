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
const log = new log_1.Log("DbRoomStore");
// tslint:disable-next-line:no-magic-numbers
const ROOM_CACHE_LIFETIME = 1000 * 60 * 60 * 24;
class DbRoomStore {
    constructor(db, cache = true, protocol = "unknown") {
        this.db = db;
        this.remoteCache = new timedcache_1.TimedCache(cache ? ROOM_CACHE_LIFETIME : 0);
        this.mxidCache = new timedcache_1.TimedCache(cache ? ROOM_CACHE_LIFETIME : 0);
        this.opCache = new timedcache_1.TimedCache(cache ? ROOM_CACHE_LIFETIME : 0);
        this.protocol = protocol;
    }
    newData(mxid, roomId, puppetId) {
        return {
            mxid,
            roomId,
            puppetId,
            isDirect: false,
            e2be: false,
            isUsed: false,
        };
    }
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_all"));
            const rows = yield this.db.All("SELECT * FROM room_store");
            const results = [];
            for (const row of rows) {
                const res = this.getFromRow(row);
                if (res) {
                    results.push(res);
                }
            }
            stopTimer();
            return results;
        });
    }
    getByRemote(puppetId, roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_by_remote"));
            const cached = this.remoteCache.get(`${puppetId};${roomId}`);
            if (cached) {
                return cached;
            }
            const row = yield this.db.Get("SELECT * FROM room_store WHERE room_id = $room_id AND puppet_id = $puppet_id", {
                room_id: roomId,
                puppet_id: puppetId,
            });
            stopTimer();
            return this.getFromRow(row);
        });
    }
    getByPuppetId(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_by_puppet"));
            const rows = yield this.db.All("SELECT * FROM room_store WHERE puppet_id = $puppet_id", {
                puppet_id: puppetId,
            });
            const results = [];
            for (const row of rows) {
                const res = this.getFromRow(row);
                if (res) {
                    results.push(res);
                }
            }
            stopTimer();
            return results;
        });
    }
    getByMxid(mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_by_mxid"));
            const cached = this.mxidCache.get(mxid);
            if (cached) {
                return cached;
            }
            const row = yield this.db.Get("SELECT * FROM room_store WHERE mxid = $mxid", { mxid });
            stopTimer();
            return this.getFromRow(row);
        });
    }
    set(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("insert_update"));
            const exists = yield this.db.Get("SELECT * FROM room_store WHERE mxid = $mxid", { mxid: data.mxid });
            let query = "";
            if (!exists) {
                query = `INSERT INTO room_store (
				mxid,
				room_id,
				puppet_id,
				name,
				avatar_url,
				avatar_mxc,
				avatar_hash,
				topic,
				group_id,
				is_direct,
				e2be,
				external_url,
				is_used
			) VALUES (
				$mxid,
				$room_id,
				$puppet_id,
				$name,
				$avatar_url,
				$avatar_mxc,
				$avatar_hash,
				$topic,
				$group_id,
				$is_direct,
				$e2be,
				$external_url,
				$is_used
			)`;
            }
            else {
                query = `UPDATE room_store SET
				room_id = $room_id,
				puppet_id = $puppet_id,
				name = $name,
				avatar_url = $avatar_url,
				avatar_mxc = $avatar_mxc,
				avatar_hash = $avatar_hash,
				topic = $topic,
				group_id = $group_id,
				is_direct = $is_direct,
				e2be = $e2be,
				external_url = $external_url,
				is_used = $is_used
				WHERE mxid = $mxid`;
            }
            yield this.db.Run(query, {
                mxid: data.mxid,
                room_id: data.roomId,
                puppet_id: data.puppetId,
                name: data.name || null,
                avatar_url: data.avatarUrl || null,
                avatar_mxc: data.avatarMxc || null,
                avatar_hash: data.avatarHash || null,
                topic: data.topic || null,
                group_id: data.groupId || null,
                is_direct: Number(data.isDirect),
                e2be: Number(data.e2be),
                external_url: data.externalUrl || null,
                is_used: Number(data.isUsed),
            });
            this.remoteCache.set(`${data.puppetId};${data.roomId}`, data);
            this.mxidCache.set(data.mxid, data);
            stopTimer();
        });
    }
    delete(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("delete"));
            yield this.db.Run("DELETE FROM room_store WHERE mxid = $mxid", { mxid: data.mxid });
            yield this.db.Run("DELETE FROM chan_op WHERE chan_mxid=$mxid", { mxid: data.mxid });
            this.remoteCache.delete(`${data.puppetId};${data.roomId}`);
            this.mxidCache.delete(data.mxid);
            this.opCache.delete(data.mxid);
            stopTimer();
        });
    }
    toGlobalNamespace(puppetId, roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("update_namespace"));
            const exists = yield this.getByRemote(-1, roomId);
            if (exists) {
                return;
            }
            const room = yield this.getByRemote(puppetId, roomId);
            if (!room) {
                return;
            }
            yield this.db.Run("UPDATE room_store SET puppet_id = -1, group_id = '' WHERE puppet_id = $pid AND room_id = $rid", {
                pid: puppetId,
                rid: roomId,
            });
            this.remoteCache.delete(`${puppetId};${roomId}`);
            this.mxidCache.delete(room.mxid);
            this.opCache.delete(room.mxid);
            stopTimer();
        });
    }
    setRoomOp(roomMxid, userMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("update_room_op"));
            const row = yield this.db.Get("SELECT * FROM chan_op WHERE chan_mxid=$chan LIMIT 1", {
                chan: roomMxid,
            });
            if (row) {
                if (row.user_mxid === userMxid) {
                    // nothing to do, we are already set
                    stopTimer();
                    return;
                }
                yield this.db.Run("DELETE FROM chan_op WHERE chan_mxid=$chan", {
                    chan: roomMxid,
                });
            }
            yield this.db.Run("INSERT INTO chan_op (chan_mxid, user_mxid) VALUES ($chan, $user)", {
                chan: roomMxid,
                user: userMxid,
            });
            this.opCache.set(roomMxid, userMxid);
            stopTimer();
        });
    }
    getRoomOp(roomMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_room_op"));
            const cached = this.opCache.get(roomMxid);
            if (cached) {
                return cached;
            }
            const row = yield this.db.Get("SELECT user_mxid FROM chan_op WHERE chan_mxid=$chan LIMIT 1", {
                chan: roomMxid,
            });
            if (!row) {
                return null;
            }
            const userMxid = row.user_mxid;
            this.opCache.set(roomMxid, userMxid);
            stopTimer();
            return userMxid;
        });
    }
    getFromRow(row) {
        if (!row) {
            return null;
        }
        const data = this.newData(row.mxid, row.room_id, Number(row.puppet_id));
        data.name = (row.name || null);
        data.avatarUrl = (row.avatar_url || null);
        data.avatarMxc = (row.avatar_mxc || null);
        data.avatarHash = (row.avatar_hash || null);
        data.topic = (row.topic || null);
        data.groupId = (row.group_id || null);
        data.isDirect = Boolean(Number(row.is_direct));
        data.e2be = Boolean(Number(row.e2be));
        data.externalUrl = (row.external_url || null);
        data.isUsed = Boolean(Number(row.is_used));
        this.remoteCache.set(`${data.puppetId};${data.roomId}`, data);
        this.mxidCache.set(data.mxid, data);
        return data;
    }
    labels(queryName) {
        return {
            protocol: this.protocol,
            engine: this.db.type,
            table: "room_store",
            type: queryName,
        };
    }
}
exports.DbRoomStore = DbRoomStore;
//# sourceMappingURL=roomstore.js.map