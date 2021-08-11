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
const util_1 = require("./util");
const log_1 = require("./log");
const lock_1 = require("./structures/lock");
const log = new log_1.Log("RoomSync");
// tslint:disable-next-line:no-magic-numbers
const MXID_LOOKUP_LOCK_TIMEOUT = 1000 * 60;
const MATRIX_URL_SCHEME_MASK = "https://matrix.to/#/";
class RoomSyncroniser {
    constructor(bridge) {
        this.bridge = bridge;
        this.roomStore = this.bridge.roomStore;
        this.mxidLock = new lock_1.Lock(MXID_LOOKUP_LOCK_TIMEOUT);
        if (this.bridge.config.metrics.enabled) {
            const roomMetricsInit = (rooms) => {
                this.bridge.metrics.room.set({
                    type: "dm",
                    protocol: this.bridge.protocol.id,
                }, rooms.filter((room) => room.isDirect).length);
                this.bridge.metrics.room.set({
                    type: "group",
                    protocol: this.bridge.protocol.id,
                }, rooms.filter((room) => !room.isDirect).length);
            };
            this.roomStore.getAll()
                .catch((err) => log.error("could not get room store"))
                .then(roomMetricsInit)
                .catch((err) => log.warn("could not init room metrics"));
        }
    }
    getRoomOp(room) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof room !== "string") {
                const roomId = yield this.maybeGetMxid(room);
                if (!roomId) {
                    return null;
                }
                room = roomId;
            }
            let mxid = yield this.roomStore.getRoomOp(room);
            if (!mxid) {
                const ghosts = yield this.bridge.puppetStore.getGhostsInRoom(room);
                if (ghosts[0]) {
                    mxid = ghosts[0];
                }
            }
            if (!mxid) {
                return null;
            }
            if (!this.bridge.AS.isNamespacedUser(mxid)) {
                const token = yield this.bridge.provisioner.getToken(mxid);
                return yield this.bridge.userSync.getClientFromTokenCallback(token);
            }
            return this.bridge.AS.getIntentForUserId(mxid).underlyingClient;
        });
    }
    maybeGet(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(data.puppetId);
            const lockKey = `${dbPuppetId};${data.roomId}`;
            yield this.mxidLock.wait(lockKey);
            return yield this.roomStore.getByRemote(dbPuppetId, data.roomId);
        });
    }
    maybeGetMxid(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield this.maybeGet(data);
            if (!room) {
                return null;
            }
            return room.mxid;
        });
    }
    getMxid(data, client, doCreate = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(data.puppetId);
            const lockKey = `${dbPuppetId};${data.roomId}`;
            yield this.mxidLock.wait(lockKey);
            this.mxidLock.set(lockKey);
            log.info(`Fetching mxid for roomId ${data.roomId} and puppetId ${dbPuppetId}`);
            try {
                if (!client) {
                    client = this.bridge.botIntent.underlyingClient;
                }
                let room = yield this.roomStore.getByRemote(dbPuppetId, data.roomId);
                let mxid = "";
                let doUpdate = false;
                let created = false;
                let removeGroup;
                let addGroup;
                if (!room) {
                    if (!doCreate) {
                        this.mxidLock.release(lockKey);
                        return {
                            mxid: "",
                            created: false,
                        };
                    }
                    log.info("Channel doesn't exist yet, creating entry...");
                    doUpdate = true;
                    // let's fetch the create data via hook
                    const newData = yield this.bridge.namespaceHandler.createRoom(data);
                    if (newData) {
                        data = newData;
                    }
                    const invites = new Set();
                    // we need a bit of leverage for playing around who actually creates the room,
                    // so adding two ghosts to the invites set should be fine
                    const allGhosts = yield this.bridge.namespaceHandler.getUserIdsInRoom(data);
                    if (allGhosts) {
                        const MAX_GHOSTS_AUTOINVITE = 2;
                        let i = 0;
                        for (const ghost of allGhosts) {
                            const ghostSuffix = yield this.bridge.namespaceHandler.getSuffix(data.puppetId, ghost);
                            invites.add(this.bridge.AS.getUserIdForSuffix(ghostSuffix));
                            if (i++ >= MAX_GHOSTS_AUTOINVITE) {
                                break;
                            }
                        }
                    }
                    const createInfo = yield this.bridge.namespaceHandler.getRoomCreateInfo(data);
                    // we want to nvite all the needed matrix users
                    for (const user of createInfo.invites) {
                        invites.add(user);
                    }
                    let userId = yield client.getUserId();
                    if (!this.bridge.AS.isNamespacedUser(userId)) {
                        // alright, let's only allow puppets to create rooms here
                        let found = false;
                        for (const invite of invites) {
                            if (this.bridge.AS.isNamespacedUser(invite)) {
                                client = this.bridge.AS.getIntentForUserId(invite).underlyingClient;
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            client = this.bridge.botIntent.underlyingClient;
                        }
                        invites.add(userId);
                        userId = yield client.getUserId();
                    }
                    invites.delete(userId);
                    // alright, we need to make sure that someone of our namespace is in the room
                    // else messages won't relay correclty. Let's do that here.
                    let haveNamespacedInvite = this.bridge.AS.isNamespacedUser(userId);
                    if (!haveNamespacedInvite) {
                        for (const user of invites) {
                            if (this.bridge.AS.isNamespacedUser(user)) {
                                haveNamespacedInvite = true;
                                break;
                            }
                        }
                    }
                    if (!haveNamespacedInvite) {
                        invites.add(this.bridge.botIntent.userId);
                    }
                    // now, we want the bridge bot to create stuff, if this isn't a direct room
                    if (!data.isDirect) {
                        invites.add(userId);
                        invites.delete(this.bridge.botIntent.userId);
                        client = this.bridge.botIntent.underlyingClient;
                        userId = this.bridge.botIntent.userId;
                    }
                    else if (this.bridge.AS.isNamespacedUser(userId)) {
                        // and if it is a direct room, we do *not* want our ghost to create it, if possible
                        const puppetData = yield this.bridge.provisioner.get(data.puppetId);
                        if (puppetData && puppetData.userId) {
                            const userIdSuffix = yield this.bridge.namespaceHandler.getSuffix(dbPuppetId, puppetData.userId);
                            const badIntent = this.bridge.AS.getIntentForSuffix(userIdSuffix);
                            if (badIntent.userId === userId) {
                                // alright, our own ghost is creating the room, let's see if we can find someone else
                                for (const inviteId of invites) {
                                    if (inviteId !== userId && this.bridge.AS.isNamespacedUser(inviteId)) {
                                        invites.add(userId);
                                        invites.delete(inviteId);
                                        userId = inviteId;
                                        client = this.bridge.AS.getIntentForUserId(inviteId).underlyingClient;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    const updateProfile = yield util_1.Util.ProcessProfileUpdate(null, data, this.bridge.protocol.namePatterns.room, (buffer, mimetype, filename) => __awaiter(this, void 0, void 0, function* () {
                        return yield this.bridge.uploadContent(client, buffer, mimetype, filename);
                    }));
                    log.verbose("Creation data:", data);
                    log.verbose("Initial invites:", invites);
                    // ooookay, we need to create this room
                    const createParams = {
                        visibility: createInfo.public ? "public" : "private",
                        preset: createInfo.public ? "public_chat" : "private_chat",
                        power_level_content_override: {
                            notifications: {
                                room: 0,
                            },
                            events: {
                                "im.vector.user_status": 0,
                            },
                        },
                        is_direct: data.isDirect,
                        invite: invites ? Array.from(invites) : null,
                        initial_state: [],
                    }; // tslint:disable-line no-any
                    const suffix = yield this.bridge.namespaceHandler.getSuffix(dbPuppetId, data.roomId);
                    if (!data.isDirect) {
                        // we also want to set an alias for later reference
                        createParams.room_alias_name = this.bridge.AS.getAliasLocalpartForSuffix(suffix);
                        createParams.initial_state.push({
                            type: "m.room.canonical_alias",
                            content: {
                                alias: null,
                                alt_aliases: [this.bridge.AS.getAliasForSuffix(suffix)],
                            },
                        });
                    }
                    if (updateProfile.hasOwnProperty("name")) {
                        createParams.name = updateProfile.name;
                    }
                    if (updateProfile.hasOwnProperty("avatarMxc")) {
                        createParams.initial_state.push({
                            type: "m.room.avatar",
                            content: { url: updateProfile.avatarMxc },
                        });
                    }
                    if (data.topic) {
                        createParams.initial_state.push({
                            type: "m.room.topic",
                            content: { topic: data.topic },
                        });
                    }
                    log.verbose("Creating room with create parameters", createParams);
                    try {
                        mxid = yield client.createRoom(createParams);
                    }
                    catch (err) {
                        if (err.body.errcode === "M_ROOM_IN_USE") {
                            const ret = yield this.attemptRoomRestore(this.bridge.AS.getAliasForSuffix(suffix));
                            mxid = ret.mxid;
                            client = ret.client;
                        }
                        else {
                            throw err;
                        }
                    }
                    yield this.roomStore.setRoomOp(mxid, yield client.getUserId());
                    room = this.roomStore.newData(mxid, data.roomId, dbPuppetId);
                    room = Object.assign(room, updateProfile);
                    if (data.topic) {
                        room.topic = data.topic;
                    }
                    if (data.groupId && this.bridge.groupSyncEnabled) {
                        room.groupId = data.groupId;
                        addGroup = room.groupId;
                    }
                    room.isDirect = Boolean(data.isDirect);
                    created = true;
                }
                else {
                    mxid = room.mxid;
                    // set new client for potential updates
                    const newClient = yield this.getRoomOp(mxid);
                    if (newClient) {
                        client = newClient;
                    }
                    const updateProfile = yield util_1.Util.ProcessProfileUpdate(room, data, this.bridge.protocol.namePatterns.room, (buffer, mimetype, filename) => __awaiter(this, void 0, void 0, function* () {
                        return yield this.bridge.uploadContent(client, buffer, mimetype, filename);
                    }));
                    room = Object.assign(room, updateProfile);
                    try {
                        if (updateProfile.hasOwnProperty("name")) {
                            doUpdate = true;
                            log.verbose("Updating name");
                            yield client.sendStateEvent(mxid, "m.room.name", "", { name: room.name });
                        }
                        if (updateProfile.hasOwnProperty("avatarMxc")) {
                            doUpdate = true;
                            log.verbose("Updating avatar");
                            yield client.sendStateEvent(mxid, "m.room.avatar", "", { url: room.avatarMxc });
                        }
                        if (data.topic !== undefined && data.topic !== null && data.topic !== room.topic) {
                            doUpdate = true;
                            log.verbose("updating topic");
                            yield client.sendStateEvent(mxid, "m.room.topic", "", { topic: data.topic });
                            room.topic = data.topic;
                        }
                        if (typeof data.isDirect === "boolean" && data.isDirect !== room.isDirect) {
                            doUpdate = true;
                            room.isDirect = data.isDirect;
                        }
                        if (data.groupId !== undefined && data.groupId !== null && data.groupId !== room.groupId
                            && this.bridge.groupSyncEnabled) {
                            doUpdate = true;
                            removeGroup = room.groupId;
                            addGroup = data.groupId;
                            room.groupId = data.groupId;
                        }
                    }
                    catch (updateErr) {
                        doUpdate = false;
                        log.warn("Failed to update the room", updateErr.error || updateErr.body || updateErr);
                    }
                }
                if (doUpdate) {
                    log.verbose("Storing update to DB");
                    yield this.roomStore.set(room);
                    log.verbose("Room info changed in getMxid, updating bridge info state event");
                    // This might use getMxid itself, so do it in the background to avoid duplicate locks
                    this.updateBridgeInformation(data).catch((err) => log.error("Failed to update bridge info state event:", err));
                }
                this.mxidLock.release(lockKey);
                // update associated group only after releasing the lock
                if (this.bridge.groupSyncEnabled) {
                    if (removeGroup) {
                        yield this.bridge.groupSync.removeRoomFromGroup({
                            groupId: removeGroup,
                            puppetId: room.puppetId,
                        }, room.roomId);
                    }
                    if (addGroup) {
                        yield this.bridge.groupSync.addRoomToGroup({
                            groupId: addGroup,
                            puppetId: room.puppetId,
                        }, room.roomId);
                    }
                }
                else {
                    log.verbose("Group sync is disabled");
                }
                // upate emotes (in the background)
                if (data.emotes) {
                    // tslint:disable-next-line no-floating-promises
                    (() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            if (!data.emotes) {
                                return;
                            }
                            const realEmotes = [];
                            for (const e of data.emotes) {
                                const emote = e;
                                if (!emote.hasOwnProperty("roomId")) {
                                    emote.roomId = data.roomId;
                                }
                                if (!emote.puppetId) {
                                    emote.puppetId = data.puppetId;
                                }
                                realEmotes.push(emote);
                            }
                            yield this.bridge.emoteSync.setMultiple(realEmotes);
                        }
                        catch (err) {
                            log.error("Error processing emote updates", err.error || err.body || err);
                        }
                    }))();
                }
                // join ghosts, if created (in the background)
                if (created) {
                    yield this.addGhosts(data);
                }
                log.verbose("Returning mxid");
                return { mxid, created };
            }
            catch (err) {
                log.error("Error fetching mxid:", err.error || err.body || err);
                this.mxidLock.release(lockKey);
                throw err;
            }
        });
    }
    insert(mxid, roomData) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(roomData.puppetId);
            const lockKey = `${dbPuppetId};${roomData.roomId}`;
            yield this.mxidLock.wait(lockKey);
            this.mxidLock.set(lockKey);
            const entry = this.roomStore.newData(mxid, roomData.roomId, dbPuppetId);
            yield this.roomStore.set(entry);
            this.mxidLock.release(lockKey);
        });
    }
    markAsDirect(room, direct = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.maybeGet(room);
            if (!data || data.isDirect === direct) {
                return; // nothing to mark as used
            }
            data.isDirect = direct;
            yield this.roomStore.set(data);
        });
    }
    markAsUsed(room, used = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.maybeGet(room);
            if (!data || data.isUsed === used) {
                return; // nothing to mark as used
            }
            data.isUsed = used;
            yield this.roomStore.set(data);
        });
    }
    updateBridgeInformation(data) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info("Updating bridge information state event");
            const room = yield this.maybeGet(data);
            if (!room) {
                log.warn("Room not found");
                return; // nothing to do
            }
            const client = yield this.getRoomOp(room.mxid);
            if (!client) {
                log.warn("No OP in room");
                return; // no op
            }
            const e = (s) => encodeURIComponent(util_1.Util.str2mxid(s));
            const stateKey = `de.sorunome.mx-puppet-bridge://${this.bridge.protocol.id}` +
                `${room.groupId ? "/" + e(room.groupId) : ""}/${e(room.roomId)}`;
            const bridgebot = this.bridge.botIntent.userId;
            const creator = yield this.bridge.provisioner.getMxid(data.puppetId);
            const protocol = {
                id: this.bridge.protocol.id,
                displayname: this.bridge.protocol.displayname,
            };
            if (this.bridge.config.bridge.avatarUrl) {
                protocol.avatar_url = this.bridge.config.bridge.avatarUrl;
            }
            if (this.bridge.protocol.externalUrl) {
                protocol.external_url = this.bridge.protocol.externalUrl;
            }
            const channel = {
                id: util_1.Util.str2mxid(room.roomId),
            };
            if (room.name) {
                channel.displayname = room.name;
            }
            if (room.avatarMxc) {
                channel.avatar_url = room.avatarMxc;
            }
            if (room.externalUrl) {
                channel.external_url = room.externalUrl;
            }
            const content = {
                bridgebot,
                creator,
                protocol,
                channel,
            };
            if (room.groupId && this.bridge.groupSyncEnabled) {
                const group = yield this.bridge.groupSync.maybeGet({
                    groupId: room.groupId,
                    puppetId: room.puppetId,
                });
                if (group) {
                    const network = {
                        id: group.groupId,
                    };
                    if (group.name) {
                        network.displayname = group.name;
                    }
                    if (group.avatarMxc) {
                        network.avatar_url = group.avatarMxc;
                    }
                    if (group.externalUrl) {
                        network.external_url = group.externalUrl;
                    }
                    content.network = network;
                }
            }
            // finally set the state event
            log.verbose("sending state event", content, "with state key", stateKey);
            yield client.sendStateEvent(room.mxid, "m.bridge", stateKey, content);
            // TODO remove this once https://github.com/matrix-org/matrix-doc/pull/2346 is in spec
            yield client.sendStateEvent(room.mxid, "uk.half-shot.bridge", stateKey, content);
        });
    }
    getPartsFromMxid(mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (mxid[0] === "!") {
                const room = yield this.roomStore.getByMxid(mxid);
                if (!room) {
                    return null;
                }
                return {
                    roomId: room.roomId,
                    puppetId: room.puppetId,
                };
            }
            const suffix = this.bridge.AS.getSuffixForAlias(mxid);
            if (!suffix) {
                return null;
            }
            const parts = this.bridge.namespaceHandler.fromSuffix(suffix);
            if (!parts) {
                return null;
            }
            return {
                puppetId: parts.puppetId,
                roomId: parts.id,
            };
        });
    }
    addGhosts(room) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Got request to add ghosts to room puppetId=${room.puppetId} roomId=${room.roomId}`);
            const mxid = yield this.maybeGetMxid(room);
            if (!mxid) {
                log.info("Room not found, returning...");
                return;
            }
            const roomUserIds = yield this.bridge.namespaceHandler.getUserIdsInRoom(room);
            if (!roomUserIds) {
                log.info("No ghosts to add, returning...");
                return;
            }
            const maxAutojoinUsers = this.bridge.config.limits.maxAutojoinUsers;
            if (maxAutojoinUsers !== -1) {
                // alright, let's make sure that we do not have too many ghosts to autojoin
                let i = 0;
                roomUserIds.forEach((userId) => {
                    if (i < maxAutojoinUsers) {
                        i++;
                    }
                    else {
                        roomUserIds.delete(userId);
                    }
                });
            }
            // and now iterate over and do all the joins!
            log.info(`Joining ${roomUserIds.size} ghosts...`);
            const promiseList = [];
            let delay = this.bridge.config.limits.roomUserAutojoinDelay;
            for (const userId of roomUserIds) {
                promiseList.push((() => __awaiter(this, void 0, void 0, function* () {
                    yield util_1.Util.sleep(delay);
                    log.verbose(`Joining ${userId} to room puppetId=${room.puppetId} roomId=${room.roomId}`);
                    const client = yield this.bridge.userSync.getClient({
                        puppetId: room.puppetId,
                        userId,
                    });
                    const intent = this.bridge.AS.getIntentForUserId(yield client.getUserId());
                    yield intent.ensureRegisteredAndJoined(mxid);
                }))());
                delay += this.bridge.config.limits.roomUserAutojoinDelay;
            }
            yield Promise.all(promiseList);
        });
    }
    maybeLeaveGhost(roomMxid, userMxid) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Maybe leaving ghost ${userMxid} from ${roomMxid}`);
            const ghosts = yield this.bridge.puppetStore.getGhostsInRoom(roomMxid);
            if (!ghosts.includes(userMxid)) {
                log.verbose("Ghost not in room!");
                return; // not in room, nothing to do
            }
            if (ghosts.length === 1) {
                log.verbose("Ghost is the only one in the room!");
                return; // we are the last ghost in the room, we can't leave
            }
            const intent = this.bridge.AS.getIntentForUserId(userMxid);
            const client = intent.underlyingClient;
            const oldOp = yield this.roomStore.getRoomOp(roomMxid);
            if (oldOp === userMxid) {
                // we need to get a new OP!
                log.verbose("We are the OP in the room, we need to pass on OP");
                const newOp = ghosts.find((element) => element !== userMxid);
                if (!newOp) {
                    log.verbose("Noone to pass OP to!");
                    return; // we can't make a new OP, sorry
                }
                yield this.giveOp(client, roomMxid, newOp);
            }
            // and finally we passed all checks and can leave
            yield intent.leaveRoom(roomMxid);
            yield this.bridge.puppetStore.leaveGhostFromRoom(userMxid, roomMxid);
        });
    }
    puppetToGlobalNamespace(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (puppetId === -1) {
                return;
            }
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(puppetId);
            if (dbPuppetId !== -1) {
                return;
            }
            log.info(`Migrating ${puppetId} to global namespace...`);
            const entries = yield this.roomStore.getByPuppetId(puppetId);
            for (const entry of entries) {
                const existingRoom = yield this.maybeGet({
                    roomId: entry.roomId,
                    puppetId: -1,
                });
                const oldOpClient = yield this.getRoomOp(entry.mxid);
                const client = oldOpClient || this.bridge.botIntent.underlyingClient;
                if (existingRoom) {
                    // alright, easy for us, let's just...set a room upgrade
                    log.verbose(`Room ${entry.roomId} already exists, tombstoneing...`);
                    yield client.sendStateEvent(entry.mxid, "m.room.tombstone", "", {
                        body: "This room has been replaced",
                        replacement_room: existingRoom.mxid,
                    });
                    yield this.deleteEntries([entry], true);
                    continue;
                }
                // okay, there is no existing room.....time to tediously update the database entry
                log.verbose(`Room ${entry.roomId} doesn't exist yet, migrating...`);
                // first do the alias
                const oldAlias = this.bridge.AS.getAliasForSuffix(`${puppetId}_${util_1.Util.str2mxid(entry.roomId)}`);
                const newAlias = this.bridge.AS.getAliasForSuffix(yield this.bridge.namespaceHandler.getSuffix(-1, entry.roomId));
                try {
                    const ret = yield client.lookupRoomAlias(oldAlias);
                    if (ret) {
                        yield client.deleteRoomAlias(oldAlias);
                        yield client.createRoomAlias(newAlias, entry.mxid);
                        const prevCanonicalAlias = yield client.getRoomStateEvent(entry.mxid, "m.room.canonical_alias", "");
                        if (prevCanonicalAlias && prevCanonicalAlias.alias === oldAlias) {
                            prevCanonicalAlias.alias = newAlias;
                            yield client.sendStateEvent(entry.mxid, "m.room.canonical_alias", "", prevCanonicalAlias);
                        }
                    }
                }
                catch (err) {
                    log.verbose("No alias found, ignoring");
                }
                // now update the DB to reflect the puppetId correctly
                yield this.roomStore.toGlobalNamespace(puppetId, entry.roomId);
                // alright, let's....attempt to migrate a single user that'll become OP
                if (oldOpClient) {
                    log.verbose("Giving OP to new client...");
                    let newGhost = null;
                    const roomUserIds = yield this.bridge.namespaceHandler.getUserIdsInRoom({
                        puppetId,
                        roomId: entry.roomId,
                    });
                    if (roomUserIds) {
                        for (const userId of roomUserIds) {
                            newGhost = userId;
                            break;
                        }
                    }
                    let newOpIntent = this.bridge.botIntent;
                    if (newGhost) {
                        const suffix = yield this.bridge.namespaceHandler.getSuffix(-1, newGhost);
                        newOpIntent = this.bridge.AS.getIntentForSuffix(suffix);
                        // we also want to populate avatar and stuffs
                        yield this.bridge.userSync.getClient({ puppetId: -1, userId: newGhost });
                    }
                    yield newOpIntent.ensureRegisteredAndJoined(entry.mxid);
                    yield this.giveOp(oldOpClient, entry.mxid, newOpIntent.userId);
                }
                // okay, time to cycle out all the old ghosts
                log.verbose("Removing all old ghosts...");
                yield this.removeGhostsFromRoom(entry.mxid, true, puppetId);
                // and finally fill in the new ghosts
                log.verbose("Adding new ghosts...");
                yield this.addGhosts({
                    puppetId: -1,
                    roomId: entry.roomId,
                });
            }
        });
    }
    rebridge(mxid, data) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Rebridging ${data.roomId} to ${mxid}...`);
            const oldMxid = yield this.maybeGetMxid(data);
            if (oldMxid) {
                const oldOpClient = yield this.getRoomOp(oldMxid);
                if (oldOpClient) {
                    log.verbose("Tombstoning old room...");
                    yield oldOpClient.sendStateEvent(oldMxid, "m.room.tombstone", "", {
                        body: "This room has been replaced",
                        replacement_room: mxid,
                    });
                }
                log.verbose("Deleting old room...");
                yield this.delete(data, true);
            }
            yield this.insert(mxid, data);
            // tslint:disable-next-line no-floating-promises
            this.addGhosts(data);
        });
    }
    delete(data, keepUsers = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield this.maybeGet(data);
            if (!room) {
                return;
            }
            yield this.deleteEntries([room], keepUsers);
        });
    }
    deleteForMxid(mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield this.roomStore.getByMxid(mxid);
            if (!room) {
                return; // nothing to do
            }
            yield this.deleteEntries([room]);
        });
    }
    deleteForPuppet(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (puppetId === -1) {
                return;
            }
            const dbPuppetId = yield this.bridge.namespaceHandler.getDbPuppetId(puppetId);
            const entries = yield this.roomStore.getByPuppetId(dbPuppetId);
            // now we have all the entires.....filter them out for if we are the sole admin!
            const deleteEntires = [];
            for (const entry of entries) {
                if (yield this.bridge.namespaceHandler.isSoleAdmin({
                    puppetId: entry.puppetId,
                    roomId: entry.roomId,
                }, puppetId)) {
                    deleteEntires.push(entry);
                }
            }
            yield this.deleteEntries(deleteEntires);
        });
    }
    resolve(str, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            const remoteUserToGroup = (ident) => __awaiter(this, void 0, void 0, function* () {
                if (!this.bridge.hooks.getDmRoomId) {
                    return null;
                }
                let parts = yield this.bridge.userSync.resolve(ident);
                if (!parts) {
                    return null;
                }
                if (sender) {
                    parts = yield this.bridge.namespaceHandler.getRemoteUser(parts, sender);
                    if (!parts) {
                        return null;
                    }
                }
                const maybeRoomId = yield this.bridge.hooks.getDmRoomId(parts);
                if (!maybeRoomId) {
                    return null;
                }
                return {
                    puppetId: parts.puppetId,
                    roomId: maybeRoomId,
                };
            });
            if (!str) {
                return null;
            }
            if (typeof str !== "string") {
                if (str.roomId) {
                    return str;
                }
                if (str.userId) {
                    return yield remoteUserToGroup(str);
                }
                return null;
            }
            str = str.trim();
            if (str.startsWith(MATRIX_URL_SCHEME_MASK)) {
                str = str.slice(MATRIX_URL_SCHEME_MASK.length);
            }
            switch (str[0]) {
                case "#": {
                    const room = yield this.getPartsFromMxid(str);
                    if (room) {
                        return room;
                    }
                    try {
                        str = yield this.bridge.botIntent.underlyingClient.resolveRoom(str);
                    }
                    catch (err) {
                        return null;
                    }
                    // no break, as we roll over to the `!` case and re-try as that
                }
                case "!": {
                    return yield this.getPartsFromMxid(str);
                }
                case "@":
                    return yield remoteUserToGroup(str);
                default: {
                    const parts = str.split(" ");
                    const puppetId = Number(parts[0]);
                    if (!isNaN(puppetId)) {
                        return {
                            puppetId,
                            roomId: parts[1],
                        };
                    }
                    return null;
                }
            }
        });
    }
    attemptRoomRestore(alias) {
        return __awaiter(this, void 0, void 0, function* () {
            log.warn(`Attempting to restore room with alias ${alias}...`);
            const botClient = this.bridge.botIntent.underlyingClient;
            const roomId = yield botClient.resolveRoom(alias);
            log.verbose(`Got room id ${roomId}`);
            let client = yield this.getRoomOp(roomId);
            if (client) {
                log.verbose("Got old op client, verifying if it is still intact...");
                if (yield client.userHasPowerLevelFor(yield client.getUserId(), roomId, "m.room.message", false)) {
                    log.info("Found old and intact room, returning...");
                    return {
                        mxid: roomId,
                        client,
                    };
                }
            }
            client = this.bridge.botIntent.underlyingClient;
            log.verbose("Testing bot client...");
            // we just test if we can fetch members, so if we are in the room
            const members = yield client.getJoinedRoomMembers(roomId);
            if (members.includes(yield client.getUserId())) {
                // bot client is in it, all is fine
                return {
                    mxid: roomId,
                    client,
                };
            }
            throw new Error("Unable to recover room");
        });
    }
    giveOp(client, roomMxid, newOp) {
        return __awaiter(this, void 0, void 0, function* () {
            const oldOp = yield client.getUserId();
            log.verbose(`Giving OP to ${newOp}...`);
            try {
                // give the user OP
                const powerLevels = yield client.getRoomStateEvent(roomMxid, "m.room.power_levels", "");
                powerLevels.users[newOp] = powerLevels.users[oldOp];
                yield client.sendStateEvent(roomMxid, "m.room.power_levels", "", powerLevels);
                yield this.roomStore.setRoomOp(roomMxid, newOp);
            }
            catch (err) {
                log.error("Couldn't set new room OP", err.error || err.body || err);
                return;
            }
        });
    }
    removeGhostsFromRoom(mxid, keepUsers, removePuppetId = null) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info("Removing ghosts from room....");
            const ghosts = yield this.bridge.puppetStore.getGhostsInRoom(mxid);
            const promiseList = [];
            let delay = this.bridge.config.limits.roomUserAutojoinDelay;
            for (const ghost of ghosts) {
                if (removePuppetId !== null) {
                    const parts = this.bridge.userSync.getPartsFromMxid(ghost);
                    if (!parts || parts.puppetId !== removePuppetId) {
                        continue;
                    }
                }
                promiseList.push((() => __awaiter(this, void 0, void 0, function* () {
                    yield util_1.Util.sleep(delay);
                    log.verbose(`Removing ghost ${ghost} from room ${mxid}`);
                    if (!keepUsers) {
                        yield this.bridge.userSync.deleteForMxid(ghost);
                    }
                    const intent = this.bridge.AS.getIntentForUserId(ghost);
                    if (intent) {
                        try {
                            yield intent.leaveRoom(mxid);
                        }
                        catch (err) {
                            log.warn("Failed to trigger client leave room", err.error || err.body || err);
                        }
                    }
                }))());
                delay += this.bridge.config.limits.roomUserAutojoinDelay;
            }
            yield Promise.all(promiseList);
            yield this.bridge.puppetStore.emptyGhostsInRoom(mxid);
        });
    }
    deleteEntries(entries, keepUsers = false) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info("Deleting entries", entries);
            for (const entry of entries) {
                // first we clean up the room
                const opClient = yield this.getRoomOp(entry.mxid);
                if (opClient) {
                    // we try...catch this as we *really* want to get to the DB deleting
                    try {
                        log.info("Removing old aliases from room...");
                        const possibleAliases = new Set();
                        // let's first probe the canonical alias room state
                        try {
                            const canonicalAlias = yield yield opClient.getRoomStateEvent(entry.mxid, "m.room.canonical_alias", "");
                            if (canonicalAlias.alias) {
                                possibleAliases.add(canonicalAlias.alias);
                            }
                            if (canonicalAlias.alt_aliases) {
                                for (const a of canonicalAlias.alt_aliases) {
                                    possibleAliases.add(a);
                                }
                            }
                        }
                        catch (err) {
                            log.info("No m.room.canonical_alias set");
                        }
                        // now fetch all the aliases in the room
                        try {
                            const versions = yield opClient.doRequest("GET", "/_matrix/client/versions");
                            let path = "/_matrix/client/r0/rooms/";
                            if (versions && versions.unstable_features && versions.unstable_features["org.matrix.msc2432"]) {
                                path = "/_matrix/client/unstable/org.matrix.msc2432/rooms/";
                            }
                            path += encodeURIComponent(entry.mxid) + "/aliases";
                            const aliases = yield opClient.doRequest("GET", path);
                            for (const a of aliases.aliases) {
                                possibleAliases.add(a);
                            }
                        }
                        catch (err) {
                            log.info("New aliases enpoint doesn't exist yet");
                        }
                        // and now probe the old m.room.aliases state
                        try {
                            const aliases = yield opClient.getRoomStateEvent(entry.mxid, "m.room.aliases", this.bridge.config.bridge.domain);
                            for (const a of aliases.aliases) {
                                possibleAliases.add(a);
                            }
                        }
                        catch (err) {
                            log.info("No m.room.aliases set");
                        }
                        // and now iterate over all the possible aliases and remove the ones that are ours
                        for (const a of possibleAliases) {
                            if (this.bridge.AS.isNamespacedAlias(a)) {
                                try {
                                    yield opClient.deleteRoomAlias(a);
                                }
                                catch (err) {
                                    log.warn(`Failed to remove alias ${a}`, err.error || err.body || err);
                                }
                            }
                        }
                    }
                    catch (err) {
                        log.error("Error removing old aliases", err.error || err.body || err);
                    }
                }
                // delete from DB (also OP store), cache and trigger ghosts to quit
                yield this.roomStore.delete(entry);
                log.info("Removing bot client from room....");
                const botIntent = this.bridge.botIntent;
                const botRooms = yield botIntent.getJoinedRooms();
                if (botRooms.includes(entry.mxid)) {
                    try {
                        yield botIntent.leaveRoom(entry.mxid);
                    }
                    catch (err) {
                        log.warn("Failed to make bot client leave", err.error || err.body || err);
                    }
                }
                // tslint:disable-next-line no-floating-promises
                this.removeGhostsFromRoom(entry.mxid, keepUsers);
            }
        });
    }
}
exports.RoomSyncroniser = RoomSyncroniser;
//# sourceMappingURL=roomsyncroniser.js.map