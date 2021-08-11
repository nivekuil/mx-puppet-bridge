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
const crypto_1 = require("crypto");
const matrix_bot_sdk_1 = require("@sorunome/matrix-bot-sdk");
const log_1 = require("./log");
const util_1 = require("./util");
const log = new log_1.Log("Provisioner");
class Provisioner {
    constructor(bridge) {
        this.bridge = bridge;
        this.puppetStore = this.bridge.puppetStore;
    }
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.puppetStore.getAll();
        });
    }
    getForMxid(puppetMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.puppetStore.getForMxid(puppetMxid);
        });
    }
    get(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.puppetStore.get(puppetId);
        });
    }
    getMxid(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.puppetStore.getMxid(puppetId);
        });
    }
    loginWithSharedSecret(mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const homeserver = mxid.substring(mxid.indexOf(":") + 1);
            const sharedSecret = this.bridge.config.bridge.loginSharedSecretMap[homeserver];
            if (!sharedSecret) {
                // Shared secret login not enabled for this homeserver.
                return null;
            }
            const hmac = crypto_1.createHmac("sha512", sharedSecret);
            const password = hmac.update(Buffer.from(mxid, "utf-8")).digest("hex");
            const homeserverUrl = yield this.getHsUrl(mxid);
            const auth = new matrix_bot_sdk_1.MatrixAuth(homeserverUrl);
            try {
                const client = yield auth.passwordLogin(mxid, password, this.bridge.protocol.displayname + " Puppet Bridge");
                return client.accessToken;
            }
            catch (err) {
                // Shared secret is probably misconfigured, so make a warning log.
                log.warn("Failed to log into", mxid, "with shared secret:", err.error || err.body || err);
                return null;
            }
        });
    }
    getHsUrl(mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            log.verbose(`Looking up Homserver URL for mxid ${mxid}...`);
            let hsUrl = mxid.substring(mxid.indexOf(":") + 1);
            if (this.bridge.config.homeserverUrlMap[hsUrl]) {
                hsUrl = this.bridge.config.homeserverUrlMap[hsUrl];
                log.verbose(`Override to ${hsUrl}`);
                return hsUrl;
            }
            if (hsUrl === "localhost") {
                hsUrl = "http://" + hsUrl;
            }
            else {
                hsUrl = "https://" + hsUrl;
            }
            try {
                const wellKnownStr = (yield util_1.Util.DownloadFile(hsUrl + "/.well-known/matrix/client")).toString("utf-8");
                const wellKnown = JSON.parse(wellKnownStr);
                const maybeUrl = wellKnown["m.homeserver"].base_url;
                if (typeof maybeUrl === "string") {
                    hsUrl = maybeUrl;
                }
            }
            catch (err) { } // do nothing
            log.verbose(`Resolved to ${hsUrl}`);
            return hsUrl;
        });
    }
    getToken(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            let mxid = "";
            if (typeof puppetId === "string") {
                mxid = puppetId;
            }
            else {
                mxid = yield this.getMxid(puppetId);
            }
            const info = yield this.puppetStore.getMxidInfo(mxid);
            if (!info || !info.token) {
                return null;
            }
            const hsUrl = yield this.getHsUrl(mxid);
            return {
                hsUrl,
                token: info.token,
                mxid,
            };
        });
    }
    setToken(mxid, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const info = yield this.puppetStore.getOrCreateMxidInfo(mxid);
            info.token = token;
            yield this.puppetStore.setMxidInfo(info);
        });
    }
    setUserId(puppetId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.puppetStore.setUserId(puppetId, userId);
        });
    }
    setData(puppetId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.puppetStore.setData(puppetId, data);
        });
    }
    setType(puppetId, type) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.puppetStore.setType(puppetId, type);
        });
    }
    setIsPublic(puppetId, isPublic) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.puppetStore.setIsPublic(puppetId, isPublic);
        });
    }
    setAutoinvite(puppetId, autoinvite) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.puppetStore.setAutoinvite(puppetId, autoinvite);
        });
    }
    setIsGlobalNamespace(puppetId, isGlobalNamespace) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.bridge.protocol.features.globalNamespace) {
                return;
            }
            const puppetData = yield this.get(puppetId);
            if (!puppetData || puppetData.isGlobalNamespace === isGlobalNamespace) {
                return;
            }
            yield this.puppetStore.setIsGlobalNamespace(puppetId, isGlobalNamespace);
            if (isGlobalNamespace) {
                // tslint:disable-next-line no-floating-promises
                this.bridge.roomSync.puppetToGlobalNamespace(puppetId);
            }
        });
    }
    canCreate(mxid) {
        return this.isWhitelisted(mxid, this.bridge.config.provisioning.whitelist, this.bridge.config.provisioning.blacklist);
    }
    canRelay(mxid) {
        return this.isWhitelisted(mxid, this.bridge.config.relay.whitelist, this.bridge.config.relay.blacklist);
    }
    canSelfService(mxid) {
        return this.isWhitelisted(mxid, this.bridge.config.selfService.whitelist, this.bridge.config.selfService.blacklist);
    }
    new(puppetMxid, data, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.canCreate(puppetMxid)) {
                return -1;
            }
            const userInfo = yield this.puppetStore.getOrCreateMxidInfo(puppetMxid);
            if (!userInfo.token) {
                userInfo.token = yield this.loginWithSharedSecret(puppetMxid);
                if (userInfo.token) {
                    yield this.puppetStore.setMxidInfo(userInfo);
                    log.info("Enabled double puppeting for", puppetMxid, "with shared secret login");
                }
            }
            const isGlobal = Boolean(this.bridge.protocol.features.globalNamespace);
            const puppetId = yield this.puppetStore.new(puppetMxid, data, userId, isGlobal);
            log.info(`Created new puppet with id ${puppetId}`);
            this.bridge.emit("puppetNew", puppetId, data);
            const WAIT_CONNECT_TIMEOUT = 10000;
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                yield this.adjustMuteListRooms(puppetId, puppetMxid);
            }), WAIT_CONNECT_TIMEOUT);
            return puppetId;
        });
    }
    update(puppetMxid, puppetId, data, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.canCreate(puppetMxid)) {
                return;
            }
            const d = yield this.get(puppetId);
            if (!d || d.puppetMxid !== puppetMxid) {
                return;
            }
            yield this.setData(puppetId, data);
            if (userId) {
                yield this.setUserId(puppetId, userId);
            }
            log.info(`Updating puppet with id ${puppetId}`);
            this.bridge.emit("puppetNew", puppetId, data);
        });
    }
    delete(puppetMxid, puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Deleting puppet with id ${puppetId}`);
            const data = yield this.get(puppetId);
            if (!data || data.puppetMxid !== puppetMxid) {
                return;
            }
            yield this.bridge.roomSync.deleteForPuppet(puppetId);
            yield this.puppetStore.delete(puppetId);
            yield this.adjustMuteEverywhere(puppetMxid);
            this.bridge.emit("puppetDelete", puppetId);
        });
    }
    getDesc(puppetMxid, puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.get(puppetId);
            if (!data || data.puppetMxid !== puppetMxid) {
                return null;
            }
            return yield this.getDescFromData(data);
        });
    }
    getDescMxid(puppetMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const datas = yield this.getForMxid(puppetMxid);
            const descs = [];
            for (const data of datas) {
                descs.push(yield this.getDescFromData(data));
            }
            return descs;
        });
    }
    bridgeRoom(userId, mxid, remoteIdent) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.bridge.hooks.createRoom || !this.bridge.hooks.roomExists) {
                throw new Error("Feature disabled");
            }
            if (!this.canSelfService(userId)) {
                throw new Error("Permission denied");
            }
            const roomParts = yield this.bridge.roomSync.getPartsFromMxid(mxid);
            if (roomParts) {
                throw new Error("Room already bridged");
            }
            // check if they have PL to do stuffs
            const havePerm = yield this.bridge.botIntent.underlyingClient.userHasPowerLevelFor(userId, mxid, "m.room.canonical_alias", true);
            if (!havePerm) {
                throw new Error("Insufficient permissions");
            }
            // now check if we have a relay present
            const allPuppets = yield this.getAll();
            const allRelays = allPuppets.filter((p) => p.type === "relay" && p.isGlobalNamespace);
            if (allRelays.length < 1) {
                throw new Error("No relay puppets configured");
            }
            // now resolve the room id....
            let roomId = remoteIdent;
            if (this.bridge.hooks.resolveRoomId) {
                const res = yield this.bridge.hooks.resolveRoomId(remoteIdent);
                if (!res) {
                    throw new Error("Room not found");
                }
                roomId = res;
            }
            // time to check if the room ID exists at all
            let puppetId = -1;
            let fallbackPuppetId = -1;
            for (const puppet of allRelays) {
                const exists = yield this.bridge.hooks.roomExists({
                    puppetId: puppet.puppetId,
                    roomId,
                });
                if (exists) {
                    if (puppet.isPublic) {
                        puppetId = puppet.puppetId;
                        break;
                    }
                    else {
                        fallbackPuppetId = puppet.puppetId;
                    }
                }
            }
            if (puppetId === -1) {
                puppetId = fallbackPuppetId;
            }
            if (puppetId === -1) {
                throw new Error("No such remote room found");
            }
            const newRoomParts = yield this.bridge.hooks.createRoom({
                puppetId,
                roomId,
            });
            if (!newRoomParts) {
                throw new Error("No such remote room found");
            }
            if (newRoomParts.isDirect) {
                throw new Error("Can't bridge direct rooms");
            }
            const oldRoom = yield this.bridge.roomSync.maybeGet(newRoomParts);
            if (oldRoom && oldRoom.isUsed) {
                throw new Error("Room is already bridged");
            }
            // check if anyone has this room as status room, and if so, remove it
            yield this.puppetStore.deleteStatusRoom(mxid);
            // alright, we did all the verifying, time to actually bridge this room!
            yield this.bridge.roomSync.rebridge(mxid, newRoomParts);
            this.bridge.metrics.room.inc({ type: "group", protocol: this.bridge.protocol.id });
        });
    }
    unbridgeRoom(userId, ident) {
        return __awaiter(this, void 0, void 0, function* () {
            const roomParts = yield this.bridge.roomSync.resolve(ident, userId);
            if (!roomParts) {
                return false;
            }
            const room = yield this.bridge.roomSync.maybeGet(roomParts);
            if (!room) {
                return false;
            }
            if (!(yield this.bridge.namespaceHandler.isSoleAdmin(room, userId))) {
                return false;
            }
            // alright, unbridge the room
            yield this.bridge.roomSync.delete(roomParts, true);
            this.bridge.metrics.room.dec({ type: "group", protocol: this.bridge.protocol.id });
            return true;
        });
    }
    /**
     * Gives 100 power level to a user of a puppet-owned room
     * @param {string} userId
     * @param {RemoteRoomResolvable} room resolvable
     * @returns {Promise<void>}
     */
    setAdmin(userId, ident) {
        return __awaiter(this, void 0, void 0, function* () {
            const ADMIN_POWER_LEVEL = 100;
            const roomParts = yield this.bridge.roomSync.resolve(ident, userId);
            if (!roomParts) {
                throw new Error("Room not resolvable");
            }
            const room = yield this.bridge.roomSync.maybeGet(roomParts);
            if (!room) {
                throw new Error("Room not found");
            }
            if (!(yield this.bridge.namespaceHandler.isAdmin(room, userId))) {
                throw new Error("Not an admin");
            }
            const client = yield this.bridge.roomSync.getRoomOp(room.mxid);
            if (!client) {
                throw new Error("Failed to get operator of " + room.mxid);
            }
            const members = yield client.getJoinedRoomMembers(room.mxid);
            if (!members || !members.includes(userId)) {
                throw new Error(`The user (${userId}) isn't in room ${room.mxid}`);
            }
            yield client.setUserPowerLevel(userId, room.mxid, ADMIN_POWER_LEVEL);
        });
    }
    adjustMute(userId, room) {
        return __awaiter(this, void 0, void 0, function* () {
            const MUTED_POWER_LEVEL = -1;
            const UNMUTED_POWER_LEVEL = 0;
            log.verbose(`Adjusting Mute for ${userId} in ${room}`);
            let currentLevel = UNMUTED_POWER_LEVEL;
            const client = yield this.bridge.roomSync.getRoomOp(room);
            if (!client) {
                throw new Error("Failed to get operator of " + room);
            }
            if (!(yield client.userHasPowerLevelFor(userId, room, "m.room.message", false))) {
                currentLevel = MUTED_POWER_LEVEL;
            }
            let targetLevel = UNMUTED_POWER_LEVEL;
            const roomParts = yield this.bridge.roomSync.resolve(room);
            if (!roomParts) {
                throw new Error("Failed to resolve room " + room);
            }
            const data = yield this.bridge.roomStore.getByMxid(room);
            if (!data) {
                throw new Error("Failed to get data for " + room);
                return;
            }
            if (!data || data.isDirect) {
                log.verbose(`No muting in direct rooms`);
            }
            else if (!(yield this.bridge.namespaceHandler.canSeeRoom({
                puppetId: yield this.bridge.namespaceHandler.getDbPuppetId(roomParts.puppetId),
                roomId: roomParts.roomId,
            }, userId))) {
                targetLevel = MUTED_POWER_LEVEL;
            }
            if (currentLevel !== targetLevel) {
                log.verbose(`Adjusting power level of ${userId} in ${room} to ${targetLevel}`);
                yield client.setUserPowerLevel(userId, room, targetLevel);
            }
        });
    }
    adjustMuteIfInRoom(userId, room) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.bridge.roomSync.getRoomOp(room);
            if (!client) {
                throw new Error("Failed to get operator of " + room);
            }
            try {
                const members = yield client.getJoinedRoomMembers(room);
                if (!members.includes(userId)) {
                    return;
                }
            }
            catch (err) {
                log.error("Error getting room members", err.error || err.body || err);
            }
            yield this.adjustMute(userId, room);
        });
    }
    adjustMuteListRooms(puppetId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.bridge.hooks.listRooms) {
                return;
            }
            const rooms = yield this.bridge.hooks.listRooms(puppetId);
            for (const r of rooms) {
                if (!r.id) {
                    continue;
                }
                const roomInfo = yield this.bridge.roomSync.maybeGet({
                    puppetId,
                    roomId: r.id,
                });
                if (!roomInfo) {
                    continue;
                }
                log.verbose(`roommxid: ${roomInfo.mxid}`);
                yield this.adjustMuteIfInRoom(userId, roomInfo.mxid);
            }
        });
    }
    adjustMuteEverywhere(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = yield this.bridge.roomStore.getAll();
            for (const entry of entries) {
                yield this.adjustMuteIfInRoom(userId, entry.mxid);
            }
        });
    }
    invite(userId, ident) {
        return __awaiter(this, void 0, void 0, function* () {
            const roomParts = yield this.bridge.roomSync.resolve(ident, userId);
            if (!roomParts) {
                return false;
            }
            let room = yield this.bridge.roomSync.maybeGet(roomParts);
            if (!room) {
                yield this.bridge.bridgeRoom(roomParts);
                room = yield this.bridge.roomSync.maybeGet(roomParts);
                if (!room) {
                    return false;
                }
            }
            if (yield this.bridge.namespaceHandler.canSeeRoom({
                roomId: room.roomId,
                puppetId: yield this.bridge.namespaceHandler.getDbPuppetId(room.puppetId),
            }, userId)) {
                const client = (yield this.bridge.roomSync.getRoomOp(room.mxid)) || this.bridge.botIntent.underlyingClient;
                try {
                    yield client.inviteUser(userId, room.mxid);
                    return true;
                }
                catch (err) {
                    log.warn(`Failed to invite ${userId} to ${room.mxid}`, err.error || err.body || err);
                    return false;
                }
            }
            return false;
        });
    }
    groupInvite(userId, ident) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.bridge.groupSyncEnabled) {
                return false;
            }
            const groupParts = yield this.bridge.groupSync.resolve(ident);
            if (!groupParts) {
                return false;
            }
            const group = yield this.bridge.groupSync.maybeGet(groupParts);
            if (!group) {
                return false;
            }
            if (yield this.bridge.namespaceHandler.canSeeGroup(group, userId)) {
                const client = this.bridge.botIntent.underlyingClient;
                const clientUnstable = client.unstableApis;
                try {
                    yield clientUnstable.inviteUserToGroup(group.mxid, userId);
                    return true;
                }
                catch (err) {
                    log.warn(`Failed to invite ${userId} to group ${group.mxid}`, err.error || err.body || err);
                    return false;
                }
            }
            return false;
        });
    }
    getDescFromData(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.bridge.hooks.getDesc) {
                return {
                    puppetId: data.puppetId,
                    desc: `${data.puppetMxid} (${data.puppetId})`,
                    type: data.type,
                    isPublic: data.isPublic,
                };
            }
            return {
                puppetId: data.puppetId,
                desc: yield this.bridge.hooks.getDesc(data.puppetId, data.data),
                type: data.type,
                isPublic: data.isPublic,
            };
        });
    }
    isWhitelisted(mxid, whitelist, blacklist) {
        for (const b of blacklist) {
            if (mxid.match(b)) {
                return false;
            }
        }
        for (const w of whitelist) {
            if (mxid.match(w)) {
                return true;
            }
        }
        return false;
    }
}
exports.Provisioner = Provisioner;
//# sourceMappingURL=provisioner.js.map