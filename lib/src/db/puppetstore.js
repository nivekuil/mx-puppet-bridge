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
const lock_1 = require("../structures/lock");
const log = new log_1.Log("DbPuppetStore");
// tslint:disable:no-magic-numbers
const PUPPET_CACHE_LIFETIME = 1000 * 60 * 60 * 24;
const MXID_INFO_LOCK_TIMEOUT = 1000;
exports.PUPPET_TYPES = ["puppet", "relay"];
class DbPuppetStore {
    constructor(db, cache = true, protocol = "unknown") {
        this.db = db;
        this.mxidCache = new timedcache_1.TimedCache(cache ? PUPPET_CACHE_LIFETIME : 0);
        this.puppetCache = new timedcache_1.TimedCache(cache ? PUPPET_CACHE_LIFETIME : 0);
        this.mxidInfoLock = new lock_1.Lock(MXID_INFO_LOCK_TIMEOUT);
        this.allPuppetIds = null;
        this.protocol = protocol;
    }
    deleteStatusRoom(mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("update_status"));
            yield this.db.Run("UPDATE puppet_mxid_store SET status_room = '' WHERE status_room = $mxid", { mxid });
            stopTimer();
        });
    }
    getMxidInfo(puppetMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("get_mx_info"));
            const row = yield this.db.Get("SELECT * FROM puppet_mxid_store WHERE puppet_mxid=$id", { id: puppetMxid });
            if (!row) {
                return null;
            }
            stopTimer();
            return {
                puppetMxid,
                name: row.name,
                avatarMxc: row.avatar_mxc,
                avatarUrl: null,
                token: row.token,
                statusRoom: row.status_room,
            };
        });
    }
    getOrCreateMxidInfo(puppetMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.mxidInfoLock.wait(puppetMxid);
            this.mxidInfoLock.set(puppetMxid);
            const puppet = yield this.getMxidInfo(puppetMxid);
            if (puppet) {
                this.mxidInfoLock.release(puppetMxid);
                return puppet;
            }
            const p = {
                puppetMxid,
                name: null,
                avatarMxc: null,
                avatarUrl: null,
                token: null,
                statusRoom: null,
            };
            yield this.setMxidInfo(p);
            this.mxidInfoLock.release(puppetMxid);
            return p;
        });
    }
    setMxidInfo(puppet) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("set_mxid_info"));
            const exists = yield this.db.Get("SELECT * FROM puppet_mxid_store WHERE puppet_mxid=$id", { id: puppet.puppetMxid });
            let query = "";
            if (!exists) {
                query = `INSERT INTO puppet_mxid_store (
				puppet_mxid,
				name,
				avatar_mxc,
				token,
				status_room
			) VALUES (
				$puppetMxid,
				$name,
				$avatarMxc,
				$token,
				$statusRoom
			)`;
            }
            else {
                query = `UPDATE puppet_mxid_store SET
				name = $name,
				avatar_mxc = $avatarMxc,
				token = $token,
				status_room = $statusRoom
				WHERE puppet_mxid = $puppetMxid`;
            }
            yield this.db.Run(query, {
                puppetMxid: puppet.puppetMxid,
                name: puppet.name || null,
                avatarMxc: puppet.avatarMxc || null,
                token: puppet.token || null,
                statusRoom: puppet.statusRoom || null,
            });
            stopTimer();
        });
    }
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_all"));
            let result = [];
            if (this.allPuppetIds) {
                let haveAll = true;
                for (const puppetId of this.allPuppetIds) {
                    const cached = this.puppetCache.get(puppetId);
                    if (!cached) {
                        haveAll = false;
                        break;
                    }
                    result.push(cached);
                }
                if (haveAll) {
                    return result;
                }
                result = [];
            }
            const rows = yield this.db.All("SELECT * FROM puppet_store");
            this.allPuppetIds = new Set();
            for (const r of rows) {
                const res = this.getRow(r);
                if (res) {
                    this.allPuppetIds.add(res.puppetId);
                    result.push(res);
                }
            }
            stopTimer();
            return result;
        });
    }
    getForMxid(puppetMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_for_mx"));
            const result = [];
            const rows = yield this.db.All("SELECT * FROM puppet_store WHERE puppet_mxid=$mxid", { mxid: puppetMxid });
            for (const r of rows) {
                const res = this.getRow(r);
                if (res) {
                    result.push(res);
                }
            }
            stopTimer();
            return result;
        });
    }
    get(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select"));
            const cached = this.puppetCache.get(puppetId);
            if (cached) {
                return cached;
            }
            const row = yield this.db.Get("SELECT * FROM puppet_store WHERE puppet_id=$id", { id: puppetId });
            if (!row) {
                return null;
            }
            stopTimer();
            return this.getRow(row);
        });
    }
    getMxid(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_mxid"));
            const cached = this.mxidCache.get(puppetId);
            if (cached) {
                return cached;
            }
            const result = yield this.db.Get("SELECT puppet_mxid FROM puppet_store WHERE puppet_id=$id", { id: puppetId });
            if (!result) {
                throw new Error("Puppet not found");
            }
            const mxid = result.puppet_mxid;
            this.mxidCache.set(puppetId, mxid);
            stopTimer();
            return mxid;
        });
    }
    setUserId(puppetId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("update_uid"));
            yield this.db.Run("UPDATE puppet_store SET user_id=$uid WHERE puppet_id=$pid", {
                uid: userId,
                pid: puppetId,
            });
            this.puppetCache.delete(puppetId);
            stopTimer();
        });
    }
    setData(puppetId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("update_data"));
            let dataStr = "";
            try {
                dataStr = JSON.stringify(data);
            }
            catch (err) {
                log.warn("Error stringifying json:", err);
                return;
            }
            yield this.db.Run("UPDATE puppet_store SET data=$d WHERE puppet_id=$id", {
                d: dataStr,
                id: puppetId,
            });
            this.puppetCache.delete(puppetId);
            stopTimer();
        });
    }
    setType(puppetId, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("update_type"));
            yield this.db.Run("UPDATE puppet_store SET type=$t WHERE puppet_id=$id", {
                id: puppetId,
                t: exports.PUPPET_TYPES.indexOf(type),
            });
            this.puppetCache.delete(puppetId);
            stopTimer();
        });
    }
    setIsPublic(puppetId, isPublic) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("update_visibility"));
            yield this.db.Run("UPDATE puppet_store SET is_public=$p WHERE puppet_id=$id", {
                id: puppetId,
                p: Number(isPublic),
            });
            this.puppetCache.delete(puppetId);
            stopTimer();
        });
    }
    setAutoinvite(puppetId, autoinvite) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("update_autoinvite"));
            yield this.db.Run("UPDATE puppet_store SET autoinvite=$a WHERE puppet_id=$id", {
                id: puppetId,
                a: Number(autoinvite),
            });
            this.puppetCache.delete(puppetId);
            stopTimer();
        });
    }
    setIsGlobalNamespace(puppetId, isGlobalNamespace) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("update_namespace"));
            yield this.db.Run("UPDATE puppet_store SET is_global_namespace=$is WHERE puppet_id=$id", {
                id: puppetId,
                is: Number(isGlobalNamespace),
            });
            this.puppetCache.delete(puppetId);
            stopTimer();
        });
    }
    new(puppetMxid, data, userId, isGlobalNamespace = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("insert"));
            let dataStr = "";
            try {
                dataStr = JSON.stringify(data);
            }
            catch (err) {
                log.warn("Error strinifying json:", err);
                return -1;
            }
            const puppetId = yield this.db.Run(`INSERT INTO puppet_store (puppet_mxid, data, user_id, type, is_public, autoinvite, is_global_namespace)
			VALUES ($mxid, $data, $uid, $type, $isPublic, $autoinvite, $isGlobalNamespace)`, {
                mxid: puppetMxid,
                data: dataStr,
                uid: userId || null,
                type: exports.PUPPET_TYPES.indexOf("puppet"),
                isPublic: Number(false),
                autoinvite: Number(true),
                isGlobalNamespace: Number(isGlobalNamespace),
            }, "puppet_id");
            this.allPuppetIds = null;
            stopTimer();
            return puppetId;
        });
    }
    delete(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("delete"));
            yield this.db.Run("DELETE FROM puppet_store WHERE puppet_id=$id", { id: puppetId });
            this.mxidCache.delete(puppetId);
            this.puppetCache.delete(puppetId);
            this.allPuppetIds = null;
            stopTimer();
        });
    }
    isGhostInRoom(ghostMxid, roomMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_ghost_in_room"));
            const exists = yield this.db.Get("SELECT * FROM ghosts_joined_chans WHERE ghost_mxid = $ghostMxid AND chan_mxid = $roomMxid", {
                ghostMxid,
                roomMxid,
            });
            stopTimer();
            return exists ? true : false;
        });
    }
    joinGhostToRoom(ghostMxid, roomMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("insert_ghost_in_room"));
            if (yield this.isGhostInRoom(ghostMxid, roomMxid)) {
                return;
            }
            yield this.db.Run("INSERT INTO ghosts_joined_chans (ghost_mxid, chan_mxid) VALUES ($ghostMxid, $roomMxid)", {
                ghostMxid,
                roomMxid,
            });
            stopTimer();
        });
    }
    getGhostsInRoom(room) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_all_ghost_in_room"));
            const result = [];
            const rows = yield this.db.All("SELECT * FROM ghosts_joined_chans WHERE chan_mxid = $room", { room });
            for (const r of rows) {
                result.push(r.ghost_mxid);
            }
            stopTimer();
            return result;
        });
    }
    getRoomsOfGhost(ghost) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_all_rooms_of_ghost"));
            const result = [];
            const rows = yield this.db.All("SELECT * FROM ghosts_joined_chans WHERE ghost_mxid = $ghost", { ghost });
            for (const r of rows) {
                result.push(r.chan_mxid);
            }
            stopTimer();
            return result;
        });
    }
    emptyGhostsInRoom(room) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("delete_ghosts_in_room"));
            yield this.db.Run("DELETE FROM ghosts_joined_chans WHERE chan_mxid = $room", { room });
            stopTimer();
        });
    }
    leaveGhostFromRoom(ghostMxid, roomMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("delete_ghost_in_room"));
            yield this.db.Run("DELETE FROM ghosts_joined_chans " +
                "WHERE ghost_mxid = $g AND chan_mxid = $c", {
                g: ghostMxid,
                c: roomMxid,
            });
            stopTimer();
        });
    }
    getRow(row) {
        try {
            const ret = {
                puppetId: Number(row.puppet_id),
                puppetMxid: row.puppet_mxid,
                data: JSON.parse(row.data),
                userId: (row.user_id || null),
                type: exports.PUPPET_TYPES[row.type] || "invalid",
                isPublic: Boolean(Number(row.is_public)),
                autoinvite: Boolean(Number(row.autoinvite)),
                isGlobalNamespace: Boolean(Number(row.is_global_namespace)),
            };
            this.puppetCache.set(ret.puppetId, ret);
            return ret;
        }
        catch (err) {
            log.warn(`Unable to decode json data:${err} on puppet ${row.puppet_id}`);
            return null;
        }
    }
    labels(queryName) {
        return {
            protocol: this.protocol,
            engine: this.db.type,
            table: "puppet_store",
            type: queryName,
        };
    }
}
exports.DbPuppetStore = DbPuppetStore;
//# sourceMappingURL=puppetstore.js.map