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
const timedcache_1 = require("../structures/timedcache");
const log = new log_1.Log("DbGroupStore");
// tslint:disable-next-line:no-magic-numbers
const GROUP_CACHE_LIFETIME = 1000 * 60 * 60 * 24;
class DbGroupStore {
    constructor(db, cache = true, protocolId = "unknown") {
        this.db = db;
        this.groupsCache = new timedcache_1.TimedCache(cache ? GROUP_CACHE_LIFETIME : 0);
        this.protocol = protocolId;
    }
    newData(mxid, groupId, puppetId) {
        return {
            mxid,
            groupId,
            puppetId,
            roomIds: [],
        };
    }
    getByRemote(puppetId, groupId, ignoreCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_by_remote"));
            if (!ignoreCache) {
                const cached = this.groupsCache.get(`${puppetId};${groupId}`);
                if (cached) {
                    return cached;
                }
            }
            const row = yield this.db.Get("SELECT * FROM group_store WHERE group_id = $groupId AND puppet_id = $puppetId", {
                groupId,
                puppetId,
            });
            const result = yield this.getFromRow(row);
            stopTimer();
            return result;
        });
    }
    getByPuppetId(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_by_puppet"));
            const rows = yield this.db.All("SELECT * FROM group_store WHERE puppet_id = $puppetId", {
                puppetId,
            });
            const results = [];
            for (const row of rows) {
                const res = yield this.getFromRow(row);
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
            const row = yield this.db.Get("SELECT * FROM group_store WHERE mxid = $mxid", { mxid });
            const result = yield this.getFromRow(row);
            stopTimer();
            return result;
        });
    }
    set(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("insert_update"));
            // first de-dupe the room IDs
            const uniqueRoomIds = [];
            for (const roomId of data.roomIds) {
                if (!uniqueRoomIds.includes(roomId)) {
                    uniqueRoomIds.push(roomId);
                }
            }
            data.roomIds = uniqueRoomIds;
            const oldData = yield this.getByRemote(data.puppetId, data.groupId, true);
            if (!oldData) {
                // okay, we have to create a new entry
                yield this.db.Run(`INSERT INTO group_store (
				mxid,
				group_id,
				puppet_id,
				name,
				avatar_url,
				avatar_mxc,
				avatar_hash,
				short_description,
				long_description
			) VALUES (
				$mxid,
				$groupId,
				$puppetId,
				$name,
				$avatarUrl,
				$avatarMxc,
				$avatarHash,
				$shortDescription,
				$longDescription
			)`, {
                    mxid: data.mxid,
                    groupId: data.groupId,
                    puppetId: data.puppetId,
                    name: data.name || null,
                    avatarUrl: data.avatarUrl || null,
                    avatarMxc: data.avatarMxc || null,
                    avatarHash: data.avatarHash || null,
                    shortDescription: data.shortDescription || null,
                    longDescription: data.longDescription || null,
                });
                for (const roomId of data.roomIds) {
                    yield this.db.Run(`INSERT INTO group_store_rooms (
					group_id,
					puppet_id,
					room_id
				) VALUES (
					$groupId,
					$puppetId,
					$roomId
				)`, {
                        groupId: data.groupId,
                        puppetId: data.puppetId,
                        roomId,
                    });
                }
            }
            else {
                // we need to update an entry
                yield this.db.Run(`UPDATE group_store SET
				group_id = $groupId,
				puppet_id = $puppetId,
				name = $name,
				avatar_url = $avatarUrl,
				avatar_mxc = $avatarMxc,
				avatar_hash = $avatarHash,
				short_description = $shortDescription,
				long_description = $longDescription
				WHERE mxid = $mxid`, {
                    mxid: data.mxid,
                    groupId: data.groupId,
                    puppetId: data.puppetId,
                    name: data.name || null,
                    avatarUrl: data.avatarUrl || null,
                    avatarMxc: data.avatarMxc || null,
                    avatarHash: data.avatarHash || null,
                    shortDescription: data.shortDescription || null,
                    longDescription: data.longDescription || null,
                });
                // now we need to delete / add room IDs
                for (const oldRoomId of oldData.roomIds) {
                    const found = data.roomIds.find((r) => oldRoomId === r);
                    if (!found) {
                        yield this.db.Run(`DELETE FROM group_store_rooms WHERE
						group_id = $groupId AND puppet_id = $puppetId AND room_id = $roomId`, {
                            groupId: data.groupId,
                            puppetId: data.puppetId,
                            roomId: oldRoomId,
                        });
                    }
                }
                // and now we create new ones
                for (const roomId of data.roomIds) {
                    const found = oldData.roomIds.find((r) => roomId === r);
                    if (!found) {
                        yield this.db.Run(`INSERT INTO group_store_rooms (
						group_id,
						puppet_id,
						room_id
					) VALUES (
						$groupId,
						$puppetId,
						$roomId
					)`, {
                            groupId: data.groupId,
                            puppetId: data.puppetId,
                            roomId,
                        });
                    }
                }
            }
            this.groupsCache.set(`${data.puppetId};${data.groupId}`, data);
            stopTimer();
        });
    }
    delete(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("delete"));
            yield this.db.Run("DELETE FROM group_store WHERE mxid = $mxid", { mxid: data.mxid });
            yield this.db.Run("DELETE FROM group_store_rooms WHERE puppet_id = $puppetId AND group_id = $groupId", {
                puppetId: data.puppetId,
                groupId: data.groupId,
            });
            this.groupsCache.delete(`${data.puppetId};${data.groupId}`);
            stopTimer();
        });
    }
    getFromRow(row) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_from_row"));
            if (!row) {
                return null;
            }
            const data = this.newData(row.mxid, row.group_id, Number(row.puppet_id));
            data.name = (row.name || null);
            data.avatarUrl = (row.avatar_url || null);
            data.avatarMxc = (row.avatar_mxc || null);
            data.avatarHash = (row.avatar_hash || null);
            data.shortDescription = (row.short_description || null);
            data.longDescription = (row.long_description || null);
            const rows = yield this.db.All("SELECT room_id FROM group_store_rooms WHERE group_id = $groupId AND puppet_id = $puppetId", {
                groupId: data.groupId,
                puppetId: data.puppetId,
            });
            for (const r of rows) {
                if (r) {
                    data.roomIds.push(r.room_id);
                }
            }
            this.groupsCache.set(`${data.puppetId};${data.groupId}`, data);
            stopTimer();
            return data;
        });
    }
    labels(queryName) {
        return {
            protocol: this.protocol,
            engine: this.db.type,
            table: "group_store",
            type: queryName,
        };
    }
}
exports.DbGroupStore = DbGroupStore;
//# sourceMappingURL=groupstore.js.map