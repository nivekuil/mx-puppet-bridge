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
const log_1 = require("./log");
const lock_1 = require("./structures/lock");
const util_1 = require("./util");
const log = new log_1.Log("GroupSync");
// tslint:disable-next-line:no-magic-numbers
const GROUP_LOOKUP_LOCK_TIMEOUT = 1000 * 60 * 30;
const GROUP_ID_LENGTH = 30;
const MATRIX_URL_SCHEME_MASK = "https://matrix.to/#/";
class GroupSyncroniser {
    constructor(bridge) {
        this.bridge = bridge;
        this.groupStore = this.bridge.groupStore;
        this.mxidLock = new lock_1.Lock(GROUP_LOOKUP_LOCK_TIMEOUT);
    }
    maybeGet(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(data.puppetId);
            const lockKey = `${dbPuppetId};${data.groupId}`;
            yield this.mxidLock.wait(lockKey);
            return yield this.groupStore.getByRemote(dbPuppetId, data.groupId);
        });
    }
    maybeGetMxid(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const group = yield this.maybeGet(data);
            if (!group) {
                return null;
            }
            return group.mxid;
        });
    }
    getMxid(data, doCreate = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(data.puppetId);
            const lockKey = `${dbPuppetId};${data.groupId}`;
            yield this.mxidLock.wait(lockKey);
            this.mxidLock.set(lockKey);
            log.info(`Fetching mxid for groupId ${data.groupId} and puppetId ${dbPuppetId}`);
            let invites = new Set();
            try {
                // groups are always handled by the AS bot
                const client = this.bridge.botIntent.underlyingClient;
                const clientUnstable = client.unstableApis;
                let group = yield this.groupStore.getByRemote(dbPuppetId, data.groupId);
                const update = {
                    name: false,
                    avatar: false,
                    shortDescription: false,
                    longDescription: false,
                };
                let mxid = "";
                let doUpdate = false;
                let oldProfile = null;
                let newRooms = [];
                const removedRooms = [];
                if (!group) {
                    if (!doCreate) {
                        this.mxidLock.release(lockKey);
                        return "";
                    }
                    log.info("Group doesn't exist yet, creating entry...");
                    const createInfo = yield this.bridge.namespaceHandler.getGroupCreateInfo(data);
                    invites = createInfo.invites;
                    doUpdate = true;
                    // let's fetch the create data via hook
                    const newData = yield this.bridge.namespaceHandler.createGroup(data);
                    if (newData) {
                        data = newData;
                    }
                    log.verbose("Creation data:", data);
                    update.shortDescription = data.shortDescription ? true : false;
                    update.longDescription = data.longDescription ? true : false;
                    if (data.roomIds) {
                        newRooms = data.roomIds;
                    }
                    // now create the group
                    while (mxid === "") {
                        try {
                            const localpart = this.makeRandomId(GROUP_ID_LENGTH);
                            mxid = yield clientUnstable.createGroup(localpart);
                        }
                        catch (err) {
                            if (err.body.errcode === "M_UNKNOWN" && err.body.error.toLowerCase().includes("group already exists")) {
                                mxid = "";
                            }
                            else {
                                throw err;
                            }
                        }
                    }
                    if (createInfo.public) {
                        // set it to public
                        yield clientUnstable.setGroupJoinPolicy(mxid, "open");
                    }
                    else {
                        // set it to invite only
                        yield clientUnstable.setGroupJoinPolicy(mxid, "invite");
                    }
                    group = this.groupStore.newData(mxid, data.groupId, dbPuppetId);
                }
                else {
                    oldProfile = group;
                    update.shortDescription = data.shortDescription !== undefined && data.shortDescription !== null
                        && data.shortDescription !== group.shortDescription;
                    update.longDescription = data.longDescription !== undefined && data.longDescription !== null
                        && data.longDescription !== group.longDescription;
                    if (data.roomIds) {
                        for (const r of data.roomIds) {
                            if (!group.roomIds.includes(r)) {
                                // new room
                                newRooms.push(r);
                            }
                        }
                        for (const r of group.roomIds) {
                            if (!data.roomIds.includes(r)) {
                                // removed room
                                removedRooms.push(r);
                                break;
                            }
                        }
                    }
                    mxid = group.mxid;
                }
                const updateProfile = yield util_1.Util.ProcessProfileUpdate(oldProfile, data, this.bridge.protocol.namePatterns.group, (buffer, mimetype, filename) => __awaiter(this, void 0, void 0, function* () {
                    return yield this.bridge.uploadContent(client, buffer, mimetype, filename);
                }));
                group = Object.assign(group, updateProfile);
                const groupProfile = {
                    name: group.name || "",
                    avatar_url: group.avatarMxc || "",
                    short_description: group.shortDescription || "",
                    long_description: group.longDescription || "",
                };
                if (updateProfile.hasOwnProperty("name")) {
                    doUpdate = true;
                    groupProfile.name = group.name || "";
                }
                if (updateProfile.hasOwnProperty("avatarMxc")) {
                    log.verbose("Updating avatar");
                    doUpdate = true;
                    groupProfile.avatar_url = group.avatarMxc || "";
                }
                if (update.shortDescription) {
                    doUpdate = true;
                    groupProfile.short_description = data.shortDescription || "";
                    group.shortDescription = data.shortDescription;
                }
                if (update.longDescription) {
                    doUpdate = true;
                    groupProfile.long_description = data.longDescription || "";
                    group.longDescription = data.longDescription;
                }
                if (data.roomIds && (newRooms.length > 0 || removedRooms.length > 0)) {
                    group.roomIds = data.roomIds;
                    doUpdate = true;
                }
                if (doUpdate) {
                    log.verbose("Sending update to matrix server");
                    yield clientUnstable.setGroupProfile(mxid, groupProfile);
                }
                if (doUpdate || newRooms.length > 0 || removedRooms.length > 0) {
                    log.verbose("Storing update to DB");
                    yield this.groupStore.set(group);
                }
                for (const invite of invites) {
                    yield clientUnstable.inviteUserToGroup(mxid, invite);
                }
                this.mxidLock.release(lockKey);
                // update associated rooms only after lock is released
                if (newRooms.length > 0 || removedRooms.length > 0) {
                    for (const roomId of newRooms) {
                        const roomMxid = yield this.bridge.roomSync.maybeGetMxid({
                            puppetId: group.puppetId,
                            roomId,
                        });
                        if (roomMxid) {
                            try {
                                yield clientUnstable.addRoomToGroup(mxid, roomMxid, false);
                            }
                            catch (err) { }
                        }
                    }
                    for (const roomId of removedRooms) {
                        const roomMxid = yield this.bridge.roomSync.maybeGetMxid({
                            puppetId: group.puppetId,
                            roomId,
                        });
                        if (roomMxid) {
                            try {
                                yield clientUnstable.removeRoomFromGroup(mxid, roomMxid);
                            }
                            catch (err) { }
                        }
                    }
                }
                log.verbose("Returning mxid");
                return mxid;
            }
            catch (err) {
                log.error("Failed fetching mxid:", err.error || err.body || err);
                this.mxidLock.release(lockKey);
                throw err;
            }
        });
    }
    addRoomToGroup(group, roomId, recursionStop = false) {
        return __awaiter(this, void 0, void 0, function* () {
            log.verbose(`Adding rooom ${roomId} to group ${group.groupId}`);
            // here we can't just invoke getMxid with the diff to add the room
            // as it might already be in the array but not actually part of the group
            const roomMxid = yield this.bridge.roomSync.maybeGetMxid({
                puppetId: group.puppetId,
                roomId,
            });
            if (!roomMxid) {
                log.silly("room not found");
                return;
            }
            const mxid = yield this.getMxid(group);
            const dbGroup = yield this.maybeGet(group);
            if (dbGroup) {
                if (!dbGroup.roomIds.includes(roomId)) {
                    dbGroup.roomIds.push(roomId);
                }
                yield this.groupStore.set(dbGroup);
            }
            const clientUnstable = this.bridge.botIntent.underlyingClient.unstableApis;
            try {
                yield clientUnstable.addRoomToGroup(mxid, roomMxid, false);
            }
            catch (err) { }
        });
    }
    removeRoomFromGroup(group, roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Removing room ${roomId} from group ${group.groupId}`);
            // as before, we don't invoke via getMxid as maybe the room is still
            // wrongfully in the group
            const roomMxid = yield this.bridge.roomSync.maybeGetMxid({
                puppetId: group.puppetId,
                roomId,
            });
            if (!roomMxid) {
                return;
            }
            const dbGroup = yield this.maybeGet(group);
            if (!dbGroup) {
                return;
            }
            group.roomIds = dbGroup.roomIds;
            const foundIndex = group.roomIds.indexOf(roomId);
            if (foundIndex === -1) {
                return;
            }
            group.roomIds.splice(foundIndex, 1);
            yield this.groupStore.set(dbGroup);
            const clientUnstable = this.bridge.botIntent.underlyingClient.unstableApis;
            try {
                yield clientUnstable.removeRoomFromGroup(dbGroup.mxid, roomMxid);
            }
            catch (err) { }
        });
    }
    getPartsFromMxid(mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const ret = yield this.groupStore.getByMxid(mxid);
            if (!ret) {
                return null;
            }
            return {
                puppetId: ret.puppetId,
                groupId: ret.groupId,
            };
        });
    }
    resolve(str) {
        return __awaiter(this, void 0, void 0, function* () {
            const remoteRoomToGroup = (ident) => __awaiter(this, void 0, void 0, function* () {
                const parts = yield this.bridge.roomSync.resolve(ident);
                if (!parts) {
                    return null;
                }
                const room = yield this.bridge.roomSync.maybeGet(parts);
                if (!room || !room.groupId) {
                    return null;
                }
                return {
                    puppetId: room.puppetId,
                    groupId: room.groupId,
                };
            });
            if (!str) {
                return null;
            }
            if (typeof str !== "string") {
                if (str.groupId) {
                    return str;
                }
                return yield remoteRoomToGroup(str);
            }
            str = str.trim();
            if (str.startsWith(MATRIX_URL_SCHEME_MASK)) {
                str = str.slice(MATRIX_URL_SCHEME_MASK.length);
            }
            switch (str[0]) {
                case "#":
                case "!":
                case "@":
                    return yield remoteRoomToGroup(str);
                case "+":
                    return yield this.getPartsFromMxid(str);
                default: {
                    const parts = str.split(" ");
                    const puppetId = Number(parts[0]);
                    if (!isNaN(puppetId)) {
                        return {
                            puppetId,
                            groupId: parts[1],
                        };
                    }
                    return null;
                }
            }
            return null;
        });
    }
    makeRandomId(length) {
        let result = "";
        // uppercase chars aren't allowed in MXIDs
        const chars = "abcdefghijklmnopqrstuvwxyz-_1234567890=";
        const charsLen = chars.length;
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * charsLen));
        }
        return result;
    }
}
exports.GroupSyncroniser = GroupSyncroniser;
//# sourceMappingURL=groupsyncroniser.js.map