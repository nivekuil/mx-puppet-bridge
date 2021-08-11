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
const matrix_bot_sdk_1 = require("@sorunome/matrix-bot-sdk");
const util_1 = require("./util");
const log_1 = require("./log");
const lock_1 = require("./structures/lock");
const prometheus = require("prom-client");
const log = new log_1.Log("UserSync");
// tslint:disable no-magic-numbers
const CLIENT_LOOKUP_LOCK_TIMEOUT = 1000 * 60;
const ROOM_OVERRIDE_LOCK_TIMEOUT = 1000 * 60;
const MATRIX_URL_SCHEME_MASK = "https://matrix.to/#/";
// tslint:enable no-magic-numbers
class UserSyncroniser {
    constructor(bridge) {
        this.bridge = bridge;
        this.userStore = this.bridge.userStore;
        this.clientLock = new lock_1.Lock(CLIENT_LOOKUP_LOCK_TIMEOUT);
        this.roomOverrideLock = new lock_1.Lock(ROOM_OVERRIDE_LOCK_TIMEOUT);
        const that = this;
        this.bridge.metrics.remoteUser = new prometheus.Gauge({
            name: "bridge_remote_users_total",
            help: "Total number of users on the remote network",
            labelNames: ["protocol"],
            collect() {
                return __awaiter(this, void 0, void 0, function* () {
                    const remoteUsers = yield that.userStore.getAll();
                    this.set({ protocol: that.bridge.protocol.id }, remoteUsers.length);
                });
            },
        });
    }
    getClientFromTokenCallback(token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!token) {
                return null;
            }
            const client = new matrix_bot_sdk_1.MatrixClient(token.hsUrl, token.token);
            try {
                yield client.getUserId();
                return client;
            }
            catch (err) {
                if (err.body.errcode === "M_UNKNOWN_TOKEN") {
                    log.verbose("Client got revoked, retrying to connect...");
                    const newToken = yield this.bridge.provisioner.loginWithSharedSecret(token.mxid);
                    if (newToken) {
                        const newClient = new matrix_bot_sdk_1.MatrixClient(token.hsUrl, newToken);
                        try {
                            yield newClient.getUserId();
                            yield this.bridge.provisioner.setToken(token.mxid, newToken);
                            return newClient;
                        }
                        catch (_a) {
                            log.verbose("Invalid newly configured client");
                        }
                    }
                    else {
                        log.verbose("Invalid client config and no shared secret configured");
                    }
                }
                else {
                    log.verbose("Invalid client config");
                }
            }
            // might as well dispose of the token to not re-try too often
            yield this.bridge.provisioner.setToken(token.mxid, null);
            return null;
        });
    }
    maybeGetClient(data) {
        return __awaiter(this, void 0, void 0, function* () {
            log.silly("Maybe getting the client");
            const puppetData = yield this.bridge.provisioner.get(data.puppetId);
            if (puppetData && puppetData.userId === data.userId) {
                const token = yield this.bridge.provisioner.getToken(data.puppetId);
                const puppetClient = yield this.getClientFromTokenCallback(token);
                if (puppetClient) {
                    return puppetClient;
                }
            }
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(data.puppetId);
            const user = yield this.userStore.get(dbPuppetId, data.userId);
            if (!user) {
                return null;
            }
            const suffix = yield this.bridge.namespaceHandler.getSuffix(dbPuppetId, data.userId);
            const intent = this.bridge.AS.getIntentForSuffix(suffix);
            yield intent.ensureRegistered();
            const client = intent.underlyingClient;
            return client;
        });
    }
    getPuppetClient(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield this.bridge.provisioner.getToken(puppetId);
            const puppetClient = yield this.getClientFromTokenCallback(token);
            return puppetClient ? puppetClient : null;
        });
    }
    getClient(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // first we look if we can puppet this user to the matrix side
            log.silly("Start of getClient request");
            const puppetData = yield this.bridge.provisioner.get(data.puppetId);
            if (puppetData && puppetData.userId === data.userId) {
                const puppetClient = yield this.getPuppetClient(data.puppetId);
                if (puppetClient) {
                    return puppetClient;
                }
            }
            // now we fetch the ghost client
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(data.puppetId);
            const lockKey = `${dbPuppetId};${data.userId}`;
            yield this.clientLock.wait(lockKey);
            this.clientLock.set(lockKey);
            log.info("Fetching client for " + dbPuppetId);
            try {
                let user = yield this.userStore.get(dbPuppetId, data.userId);
                let doUpdate = false;
                let oldProfile = null;
                if (!user) {
                    log.info("User doesn't exist yet, creating entry...");
                    doUpdate = true;
                    // let's fetch the create data via hook
                    const newData = yield this.bridge.namespaceHandler.createUser(data);
                    if (newData) {
                        data = newData;
                    }
                    user = this.userStore.newData(dbPuppetId, data.userId);
                }
                else {
                    oldProfile = user;
                }
                const suffix = yield this.bridge.namespaceHandler.getSuffix(dbPuppetId, data.userId);
                const intent = this.bridge.AS.getIntentForSuffix(suffix);
                yield intent.ensureRegistered();
                const client = intent.underlyingClient;
                const updateProfile = yield util_1.Util.ProcessProfileUpdate(oldProfile, data, this.bridge.protocol.namePatterns.user, (buffer, mimetype, filename) => __awaiter(this, void 0, void 0, function* () {
                    return yield this.bridge.uploadContent(client, buffer, mimetype, filename);
                }));
                user = Object.assign(user, updateProfile);
                const promiseList = [];
                if (updateProfile.hasOwnProperty("name")) {
                    log.verbose("Updating name");
                    // we *don't* await here as setting the name might take a
                    // while due to updating all those m.room.member events, we can do that in the BG
                    // tslint:disable-next-line:no-floating-promises
                    promiseList.push(client.setDisplayName(user.name || ""));
                    doUpdate = true;
                }
                if (updateProfile.hasOwnProperty("avatarMxc")) {
                    log.verbose("Updating avatar");
                    // we *don't* await here as that can take rather long
                    // and we might as well do this in the background
                    // tslint:disable-next-line:no-floating-promises
                    promiseList.push(client.setAvatarUrl(user.avatarMxc || ""));
                    doUpdate = true;
                }
                if (doUpdate) {
                    log.verbose("Storing update to DB");
                    yield this.userStore.set(user);
                }
                this.clientLock.release(lockKey);
                // alright, let's wait for name and avatar changes finishing
                Promise.all(promiseList).catch((err) => {
                    log.error("Error updating profile", err.error || err.body || err);
                }).then(() => __awaiter(this, void 0, void 0, function* () {
                    const roomIdsNotToUpdate = [];
                    // alright, now that we are done creating the user, let's check the room overrides
                    if (data.roomOverrides) {
                        for (const roomId in data.roomOverrides) {
                            if (data.roomOverrides.hasOwnProperty(roomId)) {
                                roomIdsNotToUpdate.push(roomId);
                                log.verbose(`Got room override for room ${roomId}`);
                                // there is no need to await these room-specific changes, might as well do them all at once
                                // tslint:disable-next-line:no-floating-promises
                                this.updateRoomOverride(client, data, roomId, data.roomOverrides[roomId], user);
                            }
                        }
                    }
                    if (promiseList.length > 0) {
                        // name or avatar of the real profile changed, we need to re-apply all our room overrides
                        const roomOverrides = yield this.userStore.getAllRoomOverrides(dbPuppetId, data.userId);
                        for (const roomOverride of roomOverrides) {
                            if (roomIdsNotToUpdate.includes(roomOverride.roomId)) {
                                continue; // nothing to do, we just did this
                            }
                            // there is no need to await these room-specific changes, might as well do them all at once
                            // tslint:disable-next-line:no-floating-promises
                            this.setRoomOverride(user, roomOverride.roomId, roomOverride, client, user);
                        }
                    }
                }));
                log.verbose("Returning client");
                return client;
            }
            catch (err) {
                log.error("Error fetching client:", err.error || err.body || err);
                this.clientLock.release(lockKey);
                throw err;
            }
        });
    }
    getPartsFromMxid(mxid) {
        const suffix = this.bridge.AS.getSuffixForUserId(mxid);
        if (!suffix) {
            return null;
        }
        const parts = this.bridge.namespaceHandler.fromSuffix(suffix);
        if (!parts) {
            return null;
        }
        return {
            puppetId: parts.puppetId,
            userId: parts.id,
        };
    }
    resolve(str) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!str) {
                return null;
            }
            if (typeof str !== "string") {
                if (str.userId) {
                    return str;
                }
                return null;
            }
            str = str.trim();
            if (str.startsWith(MATRIX_URL_SCHEME_MASK)) {
                str = str.slice(MATRIX_URL_SCHEME_MASK.length);
            }
            switch (str[0]) {
                case "@":
                    return this.getPartsFromMxid(str);
                default: {
                    const parts = str.split(" ");
                    const puppetId = Number(parts[0]);
                    if (!isNaN(puppetId)) {
                        return {
                            puppetId,
                            userId: parts[1],
                        };
                    }
                    return null;
                }
            }
        });
    }
    deleteForMxid(mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = this.getPartsFromMxid(mxid);
            if (!user) {
                return;
            }
            log.info(`Deleting ghost ${mxid}`);
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(user.puppetId);
            yield this.userStore.delete({
                puppetId: dbPuppetId,
                userId: user.userId,
            });
        });
    }
    setRoomOverride(userData, roomId, roomOverrideData, client, origUserData) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Setting room override for puppet ${userData.puppetId} ${userData.userId} in ${roomId}...`);
            if (!client) {
                client = yield this.maybeGetClient(userData);
            }
            if (!client) {
                log.warn("No client found");
                return;
            }
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(userData.puppetId);
            if (!origUserData) {
                origUserData = yield this.userStore.get(dbPuppetId, userData.userId);
            }
            if (!origUserData) {
                log.warn("Original user data not found");
                return;
            }
            if (!roomOverrideData) {
                roomOverrideData = yield this.userStore.getRoomOverride(dbPuppetId, userData.userId, roomId);
            }
            if (!roomOverrideData) {
                log.warn("No room override data found");
                return;
            }
            const roomMxid = yield this.bridge.roomSync.maybeGetMxid({
                puppetId: userData.puppetId,
                roomId,
            });
            if (!roomMxid) {
                log.warn("Room MXID not found");
                return;
            }
            const memberContent = {
                membership: "join",
                displayname: roomOverrideData.name || origUserData.name,
                avatar_url: roomOverrideData.avatarMxc || origUserData.avatarMxc,
            };
            yield client.sendStateEvent(roomMxid, "m.room.member", yield client.getUserId(), memberContent);
        });
    }
    updateRoomOverride(client, userData, roomId, roomOverride, origUserData) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(userData.puppetId);
            const lockKey = `${dbPuppetId};${userData.userId};${roomId}`;
            try {
                yield this.roomOverrideLock.wait(lockKey);
                this.roomOverrideLock.set(lockKey);
                log.info(`Updating room override for puppet ${dbPuppetId} ${userData.userId} in ${roomId}`);
                let user = yield this.userStore.getRoomOverride(dbPuppetId, userData.userId, roomId);
                const newRoomOverride = yield util_1.Util.ProcessProfileUpdate(user, roomOverride, this.bridge.protocol.namePatterns.userOverride, (buffer, mimetype, filename) => __awaiter(this, void 0, void 0, function* () {
                    return yield this.bridge.uploadContent(client, buffer, mimetype, filename);
                }));
                log.verbose("Update data", newRoomOverride);
                if (!user) {
                    user = this.userStore.newRoomOverrideData(dbPuppetId, userData.userId, roomId);
                }
                user = Object.assign(user, newRoomOverride);
                if (newRoomOverride.hasOwnProperty("name") || newRoomOverride.hasOwnProperty("avatarMxc")) {
                    try {
                        // ok, let's set the override
                        yield this.setRoomOverride(userData, roomId, user, client, origUserData);
                    }
                    catch (err) {
                        if (err.body.errcode !== "M_FORBIDDEN") {
                            throw err;
                        }
                    }
                    // aaaaand then update the DB
                    yield this.userStore.setRoomOverride(user);
                }
            }
            catch (err) {
                log.error(`Error setting room overrides for ${userData.userId} in ${roomId}:`, err.error || err.body || err);
            }
            this.roomOverrideLock.release(lockKey);
        });
    }
}
exports.UserSyncroniser = UserSyncroniser;
//# sourceMappingURL=usersyncroniser.js.map