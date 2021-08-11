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
const util_1 = require("./util");
const log = new log_1.Log("NamespaceHandler");
class NamespaceHandler {
    constructor(bridge) {
        this.bridge = bridge;
        this.enabled = Boolean(this.bridge.protocol.features.globalNamespace);
        this.usersInRoom = new Map();
        this.puppetsForUser = new Map();
        this.puppetsForRoom = new Map();
        this.puppetsForGroup = new Map();
    }
    getSuffix(puppetId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (puppetId === -1) {
                if (!this.enabled) {
                    throw new Error("Global namespace not enabled");
                }
                return `_${util_1.Util.str2mxid(id)}`;
            }
            if (this.enabled) {
                // maybe this is in a global namespace
                const puppetData = yield this.bridge.provisioner.get(puppetId);
                if (!puppetData) {
                    throw new Error("Puppet not found");
                }
                if (puppetData.isGlobalNamespace) {
                    return `_${util_1.Util.str2mxid(id)}`;
                }
            }
            return `${puppetId}_${util_1.Util.str2mxid(id)}`;
        });
    }
    fromSuffix(suffix) {
        if (suffix[0] === "_") {
            if (!this.enabled) {
                return null;
            }
            return {
                puppetId: -1,
                id: util_1.Util.mxid2str(suffix.substr(1)),
            };
        }
        const SUFFIX_MATCH_PUPPET_ID = 1;
        const SUFFIX_MATCH_ID = 2;
        const matches = suffix.match(/^(\d+)_(.*)/);
        if (!matches) {
            return null;
        }
        const puppetId = Number(matches[SUFFIX_MATCH_PUPPET_ID]);
        const id = util_1.Util.mxid2str(matches[SUFFIX_MATCH_ID]);
        if (isNaN(puppetId)) {
            return null;
        }
        return {
            puppetId,
            id,
        };
    }
    canSeeRoom(room, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            if (room.puppetId !== -1) {
                const puppetData = yield this.bridge.provisioner.get(room.puppetId);
                if (puppetData) {
                    if (!puppetData.isGlobalNamespace) {
                        return (puppetData.type === "puppet" && puppetData.puppetMxid === sender)
                            || (puppetData.type === "relay" && this.bridge.provisioner.canRelay(sender));
                    }
                    if (!this.enabled) {
                        return false;
                    }
                }
                else {
                    return false;
                }
            }
            if (!this.puppetsForRoom.has(room.roomId) || true) {
                yield this.populatePuppetsForRoom(room.roomId);
            }
            const puppetIds = this.puppetsForRoom.get(room.roomId);
            if (!puppetIds) {
                return false;
            }
            for (const puppetId of puppetIds) {
                const puppetData = yield this.bridge.provisioner.get(puppetId);
                if (puppetData && ((puppetData.type === "puppet" && puppetData.puppetMxid === sender)
                    || (puppetData.type === "relay" && this.bridge.provisioner.canRelay(sender)))) {
                    return true;
                }
            }
            return false;
        });
    }
    canSeeGroup(group, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            if (group.puppetId !== -1) {
                const puppetData = yield this.bridge.provisioner.get(group.puppetId);
                if (puppetData) {
                    if (!puppetData.isGlobalNamespace) {
                        return (puppetData.type === "puppet" && puppetData.puppetMxid === sender)
                            || (puppetData.type === "relay" && this.bridge.provisioner.canRelay(sender));
                    }
                    if (!this.enabled) {
                        return false;
                    }
                }
                else {
                    return false;
                }
            }
            if (!this.puppetsForGroup.has(group.groupId) || true) {
                yield this.populatePuppetsForGroup(group.groupId);
            }
            const puppetIds = this.puppetsForGroup.get(group.groupId);
            if (!puppetIds) {
                return false;
            }
            for (const puppetId of puppetIds) {
                const puppetData = yield this.bridge.provisioner.get(puppetId);
                if (puppetData && ((puppetData.type === "puppet" && puppetData.puppetMxid === sender)
                    || (puppetData.type === "relay" && this.bridge.provisioner.canRelay(sender)))) {
                    return true;
                }
            }
            return false;
        });
    }
    isSoleAdmin(room, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            // for now they are the same....
            return yield this.isAdmin(room, sender);
        });
    }
    isAdmin(room, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof sender === "number") {
                const puppetData = yield this.bridge.provisioner.get(sender);
                if (!puppetData) {
                    throw new Error("Puppet data not found!");
                }
                sender = puppetData.puppetMxid;
            }
            if (room.puppetId !== -1) {
                const puppetData = yield this.bridge.provisioner.get(room.puppetId);
                if (puppetData) {
                    if (!puppetData.isGlobalNamespace) {
                        return puppetData.puppetMxid === sender;
                    }
                    if (!this.enabled) {
                        return false;
                    }
                }
                else {
                    return false;
                }
            }
            if (!this.enabled) {
                return false;
            }
            if (!this.puppetsForRoom.has(room.roomId) || true) {
                yield this.populatePuppetsForRoom(room.roomId);
            }
            const puppetIds = this.puppetsForRoom.get(room.roomId);
            // CAREFUL! Once we figure out multi-room things we need to update isSoleAdmin
            if (!puppetIds || puppetIds.size !== 1) {
                return false;
            }
            let thePuppet = -1;
            for (const pid of puppetIds) {
                thePuppet = pid;
                break;
            }
            {
                const puppetData = yield this.bridge.provisioner.get(thePuppet);
                return Boolean(puppetData && puppetData.puppetMxid === sender);
            }
        });
    }
    getDbPuppetId(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.enabled) {
                if (puppetId === -1) {
                    throw new Error("Global namespace not enabled");
                }
                return puppetId;
            }
            if (puppetId === -1) {
                return -1;
            }
            const puppetData = yield this.bridge.provisioner.get(puppetId);
            if (!puppetData) {
                throw new Error("Puppet not found");
            }
            if (puppetData.isGlobalNamespace) {
                return -1;
            }
            return puppetId;
        });
    }
    getRoomPuppetUserIds(room) {
        return __awaiter(this, void 0, void 0, function* () {
            const userIds = new Set();
            if (!this.enabled) {
                if (room.puppetId === -1) {
                    throw new Error("Global namespace not enabled");
                }
                const puppetData = yield this.bridge.provisioner.get(room.puppetId);
                if (puppetData && puppetData.userId) {
                    userIds.add(puppetData.userId);
                }
                return userIds;
            }
            if (room.puppetId !== -1) {
                const puppetData = yield this.bridge.provisioner.get(room.puppetId);
                if (!puppetData) {
                    throw new Error("Puppet not found");
                }
                if (!puppetData.isGlobalNamespace) {
                    if (puppetData.userId) {
                        userIds.add(puppetData.userId);
                    }
                    return userIds;
                }
            }
            // alright, we are in global namespace, let's do our magic
            if (!this.puppetsForRoom.has(room.roomId) || true) {
                yield this.populatePuppetsForRoom(room.roomId);
            }
            const puppetIds = this.puppetsForRoom.get(room.roomId);
            if (puppetIds) {
                for (const puppetId of puppetIds) {
                    const puppetData = yield this.bridge.provisioner.get(puppetId);
                    if (puppetData && puppetData.userId) {
                        userIds.add(puppetData.userId);
                    }
                }
            }
            return userIds;
        });
    }
    getRoomCreateInfo(room) {
        return __awaiter(this, void 0, void 0, function* () {
            const ret = yield this.maybeGetPuppetCreateInfo(room.puppetId);
            if (ret) {
                return ret;
            }
            if (!this.puppetsForRoom.has(room.roomId) || true) {
                yield this.populatePuppetsForRoom(room.roomId);
            }
            const puppetIds = this.puppetsForRoom.get(room.roomId);
            return yield this.getPuppetCreateInfo(puppetIds);
        });
    }
    getGroupCreateInfo(group) {
        return __awaiter(this, void 0, void 0, function* () {
            const ret = yield this.maybeGetPuppetCreateInfo(group.puppetId);
            if (ret) {
                return ret;
            }
            if (!this.puppetsForGroup.has(group.groupId) || true) {
                yield this.populatePuppetsForGroup(group.groupId);
            }
            const puppetIds = this.puppetsForGroup.get(group.groupId);
            return yield this.getPuppetCreateInfo(puppetIds);
        });
    }
    createUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const validate = (origData, newData) => {
                if (newData && newData.userId === origData.userId && newData.puppetId === origData.puppetId) {
                    return newData;
                }
                log.warn("Override data is malformed! Old data:", origData, "New data:", newData);
                return null;
            };
            if (!this.bridge.hooks.createUser) {
                return null;
            }
            log.info("Fetching new user override data...");
            if (user.puppetId !== -1) {
                return validate(user, yield this.bridge.hooks.createUser(user));
            }
            if (!this.enabled) {
                throw new Error("Global namespace not enabled");
            }
            if (!this.puppetsForUser.has(user.userId) || true) {
                yield this.populatePuppetsForUser(user.userId);
            }
            const puppetIds = this.puppetsForUser.get(user.userId);
            if (!puppetIds) {
                return null;
            }
            let somePuppet = -1;
            for (const puppetId of puppetIds) {
                somePuppet = puppetId;
                break;
            }
            const oldData = {
                puppetId: somePuppet,
                userId: user.userId,
            };
            return validate(oldData, yield this.bridge.hooks.createUser(oldData));
        });
    }
    createRoom(room) {
        return __awaiter(this, void 0, void 0, function* () {
            const validate = (origData, newData) => {
                if (newData && newData.roomId === origData.roomId && newData.puppetId === origData.puppetId) {
                    return newData;
                }
                log.warn("Override data is malformed! Old data:", origData, "New data:", newData);
                return null;
            };
            if (!this.bridge.hooks.createRoom) {
                return null;
            }
            log.info("Fetching new room override data...");
            if (room.puppetId !== -1) {
                return validate(room, yield this.bridge.hooks.createRoom(room));
            }
            if (!this.enabled) {
                throw new Error("Global namespace not enabled");
            }
            if (!this.puppetsForRoom.has(room.roomId) || true) {
                yield this.populatePuppetsForRoom(room.roomId);
            }
            const puppetIds = this.puppetsForRoom.get(room.roomId);
            if (!puppetIds) {
                return null;
            }
            let somePuppet = -1;
            for (const puppetId of puppetIds) {
                somePuppet = puppetId;
                break;
            }
            const oldData = {
                puppetId: somePuppet,
                roomId: room.roomId,
            };
            return validate(oldData, yield this.bridge.hooks.createRoom(oldData));
        });
    }
    createGroup(group) {
        return __awaiter(this, void 0, void 0, function* () {
            const validate = (origData, newData) => {
                if (newData && newData.groupId === origData.groupId && newData.puppetId === origData.puppetId) {
                    return newData;
                }
                log.warn("Override data is malformed! Old data:", origData, "New data:", newData);
                return null;
            };
            if (!this.bridge.hooks.createGroup) {
                return null;
            }
            log.info("Fetching new group override data...");
            if (group.puppetId !== -1) {
                return validate(group, yield this.bridge.hooks.createGroup(group));
            }
            if (!this.enabled) {
                throw new Error("Global namespace not enabled");
            }
            if (!this.puppetsForGroup.has(group.groupId) || true) {
                yield this.populatePuppetsForGroup(group.groupId);
            }
            const puppetIds = this.puppetsForGroup.get(group.groupId);
            if (!puppetIds) {
                return null;
            }
            let somePuppet = -1;
            for (const puppetId of puppetIds) {
                somePuppet = puppetId;
                break;
            }
            const oldData = {
                puppetId: somePuppet,
                groupId: group.groupId,
            };
            return validate(oldData, yield this.bridge.hooks.createGroup(oldData));
        });
    }
    getUserIdsInRoom(room) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.bridge.hooks.getUserIdsInRoom) {
                return null;
            }
            const cleanupUserIds = (userIds) => __awaiter(this, void 0, void 0, function* () {
                if (!userIds) {
                    return null;
                }
                const puppetUserIds = yield this.getRoomPuppetUserIds(room);
                for (const userId of puppetUserIds) {
                    userIds.delete(userId);
                }
                return userIds;
            });
            if (room.puppetId !== -1) {
                return yield cleanupUserIds(yield this.bridge.hooks.getUserIdsInRoom(room));
            }
            if (!this.enabled) {
                throw new Error("Global namespace not enabled");
            }
            if (!this.puppetsForRoom.has(room.roomId) || true) {
                yield this.populatePuppetsForRoom(room.roomId);
            }
            const puppetIds = this.puppetsForRoom.get(room.roomId);
            if (!puppetIds) {
                return null;
            }
            let somePuppet = -1;
            for (const puppetId of puppetIds) {
                somePuppet = puppetId;
                break;
            }
            return yield cleanupUserIds(yield this.bridge.hooks.getUserIdsInRoom({
                puppetId: somePuppet,
                roomId: room.roomId,
            }));
        });
    }
    getRemoteUser(user, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!user) {
                return null;
            }
            const puppetId = yield this.getRemote(user.puppetId, user.userId, sender, this.puppetsForUser, this.populatePuppetsForUser.bind(this));
            return {
                puppetId,
                userId: user.userId,
            };
        });
    }
    getRemoteRoom(room, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!room) {
                return null;
            }
            const puppetId = yield this.getRemote(room.puppetId, room.roomId, sender, this.puppetsForRoom, this.populatePuppetsForRoom.bind(this));
            return {
                puppetId,
                roomId: room.roomId,
            };
        });
    }
    getRemoteGroup(group, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!group) {
                return null;
            }
            const puppetId = yield this.getRemote(group.puppetId, group.groupId, sender, this.puppetsForGroup, this.populatePuppetsForGroup.bind(this));
            return {
                puppetId,
                groupId: group.groupId,
            };
        });
    }
    isMessageBlocked(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.enabled) {
                return false;
            }
            const puppetData = yield this.bridge.provisioner.get(params.room.puppetId);
            if (!puppetData) {
                throw new Error("Puppet not found");
            }
            if (!puppetData.isGlobalNamespace) {
                return false;
            }
            log.debug(`In global namespace, determining if it should be blocked... puppetId=${params.user.puppetId}` +
                ` userId=${params.user.userId} roomId=${params.room.roomId}`);
            if (!this.usersInRoom.has(params.room.roomId) || true) {
                yield this.populateUsersInRoom(params.room.roomId);
            }
            if (!this.puppetsForRoom.has(params.room.roomId) || true) {
                yield this.populatePuppetsForRoom(params.room.roomId);
            }
            const userIds = this.usersInRoom.get(params.room.roomId);
            const puppetIds = this.puppetsForRoom.get(params.room.roomId);
            if (!userIds || !puppetIds) {
                log.error("Noone is in the room?!");
                throw new Error("Noone is in the room?!");
            }
            let relayPuppet = -1;
            for (const puppetId of puppetIds) {
                const thisPuppetData = yield this.bridge.provisioner.get(puppetId);
                if (thisPuppetData) {
                    if (thisPuppetData.userId && thisPuppetData.userId === params.user.userId) {
                        const block = puppetId !== params.room.puppetId;
                        log.debug(`Found user with puppetId=${puppetId}. block=${block}`);
                        return block;
                    }
                    if (thisPuppetData.type === "relay") {
                        relayPuppet = puppetId;
                    }
                }
            }
            if (relayPuppet !== -1) {
                const block = params.room.puppetId !== relayPuppet;
                log.debug(`Found relay with puppetId=${relayPuppet}. block=${block}`);
                return block;
            }
            let somePuppet = -1;
            for (const puppetId of puppetIds) {
                somePuppet = puppetId;
                break;
            }
            if (somePuppet === -1) {
                log.debug("No user at all found?");
                return false;
            }
            {
                const block = params.room.puppetId !== somePuppet;
                log.debug(`Found some puppet with puppetId=${somePuppet}. block=${block}`);
                return block;
            }
        });
    }
    maybeGetPuppetCreateInfo(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.enabled) {
                if (puppetId === -1) {
                    throw new Error("Global namespace not enabled");
                }
                const puppetData = yield this.bridge.provisioner.get(puppetId);
                return {
                    public: Boolean(puppetData && puppetData.isPublic),
                    invites: new Set(puppetData && puppetData.autoinvite ? [puppetData.puppetMxid] : []),
                };
            }
            if (puppetId !== -1) {
                const puppetData = yield this.bridge.provisioner.get(puppetId);
                if (!puppetData) {
                    throw new Error("Puppet not found");
                }
                if (!puppetData.isGlobalNamespace) {
                    return {
                        public: puppetData.isPublic,
                        invites: new Set(puppetData.autoinvite ? [puppetData.puppetMxid] : []),
                    };
                }
            }
            return null;
        });
    }
    getPuppetCreateInfo(puppetIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const info = {
                public: false,
                invites: new Set(),
            };
            if (!puppetIds) {
                return info;
            }
            for (const puppetId of puppetIds) {
                const puppetData = yield this.bridge.provisioner.get(puppetId);
                if (puppetData) {
                    if (puppetData.isPublic) {
                        info.public = true;
                    }
                    if (puppetData.autoinvite) {
                        info.invites.add(puppetData.puppetMxid);
                    }
                }
            }
            return info;
        });
    }
    populateUsersInRoom(roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.bridge.hooks.getUserIdsInRoom) {
                this.usersInRoom.delete(roomId);
                return;
            }
            const users = new Set();
            const allPuppets = yield this.bridge.provisioner.getAll();
            for (const puppet of allPuppets) {
                const userIds = yield this.bridge.hooks.getUserIdsInRoom({
                    puppetId: puppet.puppetId,
                    roomId,
                });
                if (userIds) {
                    for (const userId of userIds) {
                        users.add(userId);
                    }
                    if (puppet.userId) {
                        users.add(puppet.userId); // also set ourselves to be present in the room
                    }
                }
            }
            this.usersInRoom.set(roomId, users);
        });
    }
    getRemote(puppetId, id, sender, map, populate) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.enabled) {
                if (puppetId === -1) {
                    throw new Error("Global namespace not enabled");
                }
                return puppetId;
            }
            if (puppetId !== -1) {
                const puppetData = yield this.bridge.provisioner.get(puppetId);
                if (puppetData && !puppetData.isGlobalNamespace) {
                    return puppetId;
                }
            }
            if (true || !map.has(id)) {
                yield populate(id);
            }
            const puppetIds = map.get(id);
            if (!puppetIds) {
                return yield this.getRelay();
            }
            let relayPuppetId = -1;
            let ownRelayPuppet = -1;
            for (const thisPuppetId of puppetIds) {
                const puppetData = yield this.bridge.provisioner.get(thisPuppetId);
                if (puppetData && puppetData.puppetMxid === sender) {
                    ownRelayPuppet = thisPuppetId;
                    if (puppetData.type === "puppet") {
                        return thisPuppetId;
                    }
                }
                if (puppetData && puppetData.type === "relay") {
                    relayPuppetId = thisPuppetId;
                }
            }
            if (ownRelayPuppet !== -1) {
                return ownRelayPuppet;
            }
            if (relayPuppetId === -1) {
                return yield this.getRelay();
            }
            return relayPuppetId;
        });
    }
    populatePuppetsForUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.populateThingForPuppet(userId, this.puppetsForUser, (puppetId) => __awaiter(this, void 0, void 0, function* () {
                if (!this.bridge.hooks.userExists) {
                    return false;
                }
                return yield this.bridge.hooks.userExists({ puppetId, userId });
            }));
        });
    }
    populatePuppetsForRoom(roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.populateThingForPuppet(roomId, this.puppetsForRoom, (puppetId) => __awaiter(this, void 0, void 0, function* () {
                if (!this.bridge.hooks.roomExists) {
                    return false;
                }
                return yield this.bridge.hooks.roomExists({ puppetId, roomId });
            }));
        });
    }
    populatePuppetsForGroup(groupId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.populateThingForPuppet(groupId, this.puppetsForGroup, (puppetId) => __awaiter(this, void 0, void 0, function* () {
                if (!this.bridge.hooks.groupExists) {
                    return false;
                }
                return yield this.bridge.hooks.groupExists({ puppetId, groupId });
            }));
        });
    }
    populateThingForPuppet(id, map, have) {
        return __awaiter(this, void 0, void 0, function* () {
            const puppets = new Set();
            const allPuppets = yield this.bridge.provisioner.getAll();
            for (const puppet of allPuppets) {
                if (puppet.isGlobalNamespace && (yield have(puppet.puppetId))) {
                    puppets.add(puppet.puppetId);
                }
            }
            map.set(id, puppets);
        });
    }
    getRelay() {
        return __awaiter(this, void 0, void 0, function* () {
            const allPuppets = yield this.bridge.provisioner.getAll();
            for (const puppet of allPuppets) {
                if (puppet.type === "relay" && puppet.isGlobalNamespace) {
                    return puppet.puppetId;
                }
            }
            throw new Error("No relay found");
        });
    }
}
exports.NamespaceHandler = NamespaceHandler;
//# sourceMappingURL=namespacehandler.js.map