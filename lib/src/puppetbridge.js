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
const fs = require("fs");
const matrix_bot_sdk_1 = require("@sorunome/matrix-bot-sdk");
const uuid = require("uuid/v4");
const yaml = require("js-yaml");
const prometheus = require("prom-client");
const express = require("express");
const events_1 = require("events");
const emotesyncroniser_1 = require("./emotesyncroniser");
const eventsyncroniser_1 = require("./eventsyncroniser");
const roomsyncroniser_1 = require("./roomsyncroniser");
const usersyncroniser_1 = require("./usersyncroniser");
const groupsyncroniser_1 = require("./groupsyncroniser");
const config_1 = require("./config");
const util_1 = require("./util");
const log_1 = require("./log");
const provisioner_1 = require("./provisioner");
const store_1 = require("./store");
const lock_1 = require("./structures/lock");
const joinstrategy_1 = require("./joinstrategy");
const botprovisioner_1 = require("./botprovisioner");
const provisioningapi_1 = require("./provisioningapi");
const presencehandler_1 = require("./presencehandler");
const typinghandler_1 = require("./typinghandler");
const reactionhandler_1 = require("./reactionhandler");
const matrixeventhandler_1 = require("./matrixeventhandler");
const remoteeventhandler_1 = require("./remoteeventhandler");
const namespacehandler_1 = require("./namespacehandler");
const delayedfunction_1 = require("./structures/delayedfunction");
const log = new log_1.Log("PuppetBridge");
// tslint:disable no-magic-numbers
const DEFAULT_TYPING_TIMEOUT = 30000;
const MXC_LOOKUP_LOCK_TIMEOUT = 1000 * 60;
const AVATAR_SIZE = 800;
class BridgeMetrics {
}
exports.BridgeMetrics = BridgeMetrics;
class PuppetBridge extends events_1.EventEmitter {
    constructor(registrationPath, configPath, prot) {
        super();
        this.registrationPath = registrationPath;
        this.configPath = configPath;
        if (!prot) {
            this.protocol = {
                id: "unknown-protocol",
                displayname: "Unknown Protocol",
                features: {},
                namePatterns: { user: "", userOverride: "", room: "", group: "", emote: "" },
            };
        }
        else {
            this.protocol = {
                id: prot.id || "unknown-protocol",
                displayname: prot.displayname || "Unknown Protocol",
                externalUrl: prot.externalUrl,
                features: prot.features || {},
                namePatterns: Object.assign({ user: "", userOverride: "", room: "", group: "", emote: "" }, prot.namePatterns),
            };
        }
        this.hooks = {};
        this.connectionMetricStatus = {};
        this.delayedFunction = new delayedfunction_1.DelayedFunction();
        this.mxcLookupLock = new lock_1.Lock(MXC_LOOKUP_LOCK_TIMEOUT);
        this.metrics = new BridgeMetrics();
        this.metrics.room = new prometheus.Gauge({
            name: "bridge_rooms_total",
            help: "Total rooms bridged to the remote network, by type and protocol",
            labelNames: ["type", "protocol"],
        });
        this.metrics.puppet = new prometheus.Gauge({
            name: "bridge_puppets_total",
            help: "Puppets linked to remote network, puppeted by matrix users",
            labelNames: ["protocol"],
        });
        this.metrics.connected = new prometheus.Gauge({
            name: "bridge_connected",
            help: "Users connected to the remote network",
            labelNames: ["protocol"],
        });
        this.metrics.message = new prometheus.Counter({
            name: "bridge_messages_total",
            help: "Total messages bridged into matrix, by type and protocol",
            labelNames: ["type", "protocol"],
        });
    }
    /** @internal */
    readConfig(addAppservice = true) {
        try {
            this.config = new config_1.Config();
            this.config.applyConfig(yaml.safeLoad(fs.readFileSync(this.configPath, "utf8")));
            log_1.Log.Configure(this.config.logging);
            // apply name patterns
            this.protocol.namePatterns.user = this.config.namePatterns.user || this.protocol.namePatterns.user || ":name";
            this.protocol.namePatterns.userOverride = this.config.namePatterns.userOverride ||
                this.protocol.namePatterns.userOverride || ":name";
            this.protocol.namePatterns.room = this.config.namePatterns.room || this.protocol.namePatterns.room || ":name";
            this.protocol.namePatterns.group = this.config.namePatterns.group || this.protocol.namePatterns.group || ":name";
            this.protocol.namePatterns.emote = this.config.namePatterns.emote || this.protocol.namePatterns.emote || "\\::name\\:";
        }
        catch (err) {
            log.error("Failed to load config file", err);
            process.exit(-1);
        }
        if (addAppservice) {
            let registration = null;
            try {
                registration = yaml.safeLoad(fs.readFileSync(this.registrationPath, "utf8"));
            }
            catch (err) {
                log.error("Failed to load registration file", err);
                process.exit(-1);
            }
            if (!registration) {
                log.error("Registration file seems blank");
                process.exit(-1);
            }
            this.appservice = new matrix_bot_sdk_1.Appservice({
                bindAddress: this.config.bridge.bindAddress,
                homeserverName: this.config.bridge.domain,
                homeserverUrl: this.config.bridge.homeserverUrl,
                port: this.config.bridge.port,
                registration,
                joinStrategy: new joinstrategy_1.PuppetBridgeJoinRoomStrategy(new matrix_bot_sdk_1.SimpleRetryJoinStrategy(), this),
            });
        }
    }
    /**
     * Initialize the puppet bridge
     */
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.readConfig();
            this.store = new store_1.Store(this.config.database, this);
            yield this.store.init();
            this.emoteSync = new emotesyncroniser_1.EmoteSyncroniser(this);
            this.eventSync = new eventsyncroniser_1.EventSyncroniser(this);
            this.roomSync = new roomsyncroniser_1.RoomSyncroniser(this);
            this.userSync = new usersyncroniser_1.UserSyncroniser(this);
            this.groupSync = new groupsyncroniser_1.GroupSyncroniser(this);
            this.provisioner = new provisioner_1.Provisioner(this);
            this.presenceHandler = new presencehandler_1.PresenceHandler(this, this.config.presence);
            this.typingHandler = new typinghandler_1.TypingHandler(this, this.protocol.features.typingTimeout || DEFAULT_TYPING_TIMEOUT);
            this.reactionHandler = new reactionhandler_1.ReactionHandler(this);
            this.matrixEventHandler = new matrixeventhandler_1.MatrixEventHandler(this);
            this.remoteEventHandler = new remoteeventhandler_1.RemoteEventHandler(this);
            this.namespaceHandler = new namespacehandler_1.NamespaceHandler(this);
            this.botProvisioner = new botprovisioner_1.BotProvisioner(this);
            this.provisioningAPI = new provisioningapi_1.ProvisioningAPI(this);
            if (this.config.metrics.enabled) {
                prometheus.collectDefaultMetrics();
                const metricsServer = express();
                metricsServer.get(this.config.metrics.path, (req, res) => __awaiter(this, void 0, void 0, function* () {
                    res.set("Content-Type", prometheus.register.contentType);
                    const metrics = yield prometheus.register.metrics();
                    res.send(metrics);
                }));
                metricsServer.listen(this.config.metrics.port);
            }
            // pipe matrix-bot-sdk logging int ours
            const logMap = new Map();
            // tslint:disable-next-line no-any
            const logFunc = (level, module, args) => {
                if (!Array.isArray(args)) {
                    args = [args];
                }
                if (args.find((s) => s.includes && s.includes("M_USER_IN_USE"))) {
                    // Spammy logs begon
                    return;
                }
                let mod = "bot-sdk-" + module;
                const modParts = module.match(/^(\S+)\s(.*)/);
                const MOD_PART_MODULE = 1;
                const MOD_PART_EXTRA = 2;
                if (modParts) {
                    if (modParts[MOD_PART_EXTRA]) {
                        args.unshift(modParts[MOD_PART_EXTRA]);
                    }
                    mod = "bot-sdk-" + modParts[MOD_PART_MODULE];
                }
                let logger = logMap.get(mod);
                if (!logger) {
                    logger = new log_1.Log(mod);
                    logMap.set(mod, logger);
                }
                logger[level](...args);
            };
            // tslint:disable no-any
            matrix_bot_sdk_1.LogService.setLogger({
                debug: (mod, args) => logFunc("debug", mod, args),
                error: (mod, args) => logFunc("error", mod, args),
                info: (mod, args) => logFunc("info", mod, args),
                warn: (mod, args) => logFunc("warn", mod, args),
            });
            // tslint:enable no-any
        });
    }
    /**
     * Generate a registration file
     */
    generateRegistration(opts) {
        log.info("Generating registration file...");
        if (fs.existsSync(this.registrationPath)) {
            log.error("Registration file already exists!");
            throw new Error("Registration file already exists!");
        }
        if (!opts.botUser) {
            opts.botUser = opts.prefix + "bot";
        }
        const reg = {
            "as_token": uuid(),
            "hs_token": uuid(),
            "id": opts.id,
            "namespaces": {
                users: [{
                        exclusive: true,
                        regex: `@${opts.prefix}.*`,
                    }],
                rooms: [],
                aliases: [{
                        exclusive: true,
                        regex: `#${opts.prefix}.*`,
                    }],
            },
            "protocols": [],
            "rate_limited": false,
            "sender_localpart": opts.botUser,
            "url": opts.url,
            "de.sorunome.msc2409.push_ephemeral": true,
        };
        fs.writeFileSync(this.registrationPath, yaml.safeDump(reg));
    }
    get AS() {
        return this.appservice;
    }
    get botIntent() {
        return this.appservice.botIntent;
    }
    get userStore() {
        return this.store.userStore;
    }
    get roomStore() {
        return this.store.roomStore;
    }
    get groupStore() {
        return this.store.groupStore;
    }
    get puppetStore() {
        return this.store.puppetStore;
    }
    get eventStore() {
        return this.store.eventStore;
    }
    get reactionStore() {
        return this.store.reactionStore;
    }
    get Config() {
        return this.config;
    }
    get groupSyncEnabled() {
        return this.hooks.createGroup && this.config.bridge.enableGroupSync ? true : false;
    }
    /**
     * Start the puppeting bridge
     */
    start(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info("Starting application service....");
            process.on("unhandledRejection", (err, promise) => {
                log.error("Unhandled Promise Rejection:", err);
                log.error(promise);
            });
            process.on("SIGINT", () => {
                this.AS.stop();
                process.exit(1);
            });
            this.matrixEventHandler.registerAppserviceEvents();
            this.provisioningAPI.registerProvisioningAPI();
            yield this.appservice.begin();
            log.info("Application service started!");
            log.info("Setting bridge user data...");
            let displayname = this.config.bridge.displayname;
            if (!displayname && this.hooks.botHeaderMsg) {
                displayname = this.hooks.botHeaderMsg();
            }
            const setBotProfile = () => __awaiter(this, void 0, void 0, function* () {
                try {
                    const currProfile = yield this.appservice.botIntent.underlyingClient.getUserProfile(this.appservice.botIntent.userId);
                    if (displayname && displayname !== currProfile.displayname) {
                        yield this.appservice.botIntent.underlyingClient.setDisplayName(displayname);
                    }
                    if (this.config.bridge.avatarUrl && this.config.bridge.avatarUrl !== currProfile.avatar_url) {
                        yield this.appservice.botIntent.underlyingClient.setAvatarUrl(this.config.bridge.avatarUrl);
                    }
                }
                catch (err) {
                    if (err.code === "ECONNREFUSED") {
                        return new Promise((resolve, reject) => {
                            const TIMEOUT_RETRY = 10000;
                            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                                try {
                                    yield setBotProfile();
                                    resolve();
                                }
                                catch (err) {
                                    reject(err);
                                }
                            }), TIMEOUT_RETRY);
                        });
                    }
                    else {
                        throw err;
                    }
                }
            });
            yield setBotProfile();
            if (callback) {
                yield callback();
            }
            log.info("Activating users...");
            const puppets = yield this.provisioner.getAll();
            this.metrics.puppet.set({ protocol: this.protocol.id }, puppets.length);
            for (const p of puppets) {
                this.emit("puppetNew", p.puppetId, p.data);
            }
            if (this.protocol.features.presence && this.config.presence.enabled) {
                yield this.presenceHandler.start();
            }
        });
    }
    setCreateUserHook(hook) {
        this.hooks.createUser = hook;
        if (!this.hooks.userExists) {
            this.hooks.userExists = (user) => __awaiter(this, void 0, void 0, function* () { return Boolean(yield hook(user)); });
        }
    }
    setCreateRoomHook(hook) {
        this.hooks.createRoom = hook;
        if (!this.hooks.roomExists) {
            this.hooks.roomExists = (room) => __awaiter(this, void 0, void 0, function* () { return Boolean(yield hook(room)); });
        }
    }
    setCreateGroupHook(hook) {
        this.hooks.createGroup = hook;
        if (!this.hooks.groupExists) {
            this.hooks.groupExists = (group) => __awaiter(this, void 0, void 0, function* () { return Boolean(yield hook(group)); });
        }
    }
    setUserExistsHook(hook) {
        this.hooks.userExists = hook;
    }
    setRoomExistsHook(hook) {
        this.hooks.roomExists = hook;
    }
    setGroupExistsHook(hook) {
        this.hooks.groupExists = hook;
    }
    setGetDescHook(hook) {
        this.hooks.getDesc = hook;
    }
    setBotHeaderMsgHook(hook) {
        this.hooks.botHeaderMsg = hook;
    }
    setGetDataFromStrHook(hook) {
        this.hooks.getDataFromStr = hook;
    }
    setGetDmRoomIdHook(hook) {
        this.hooks.getDmRoomId = hook;
    }
    setListUsersHook(hook) {
        this.hooks.listUsers = hook;
    }
    setListRoomsHook(hook) {
        this.hooks.listRooms = hook;
    }
    setListGroupsHook(hook) {
        this.hooks.listGroups = hook;
    }
    setGetUserIdsInRoomHook(hook) {
        this.hooks.getUserIdsInRoom = hook;
    }
    setResolveRoomIdHook(hook) {
        this.hooks.resolveRoomId = hook;
    }
    /**
     * Set what the remote user ID of a puppet is
     */
    setUserId(puppetId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.provisioner.setUserId(puppetId, userId);
        });
    }
    /**
     * Set (store) the data associated with a puppet, if you change it
     */
    setPuppetData(puppetId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.provisioner.setData(puppetId, data);
        });
    }
    /**
     * Update a given remote users profile
     */
    updateUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            log.verbose("Got request to update a user");
            yield this.userSync.getClient(user);
        });
    }
    /**
     * Update the information on a remote room
     */
    updateRoom(room) {
        return __awaiter(this, void 0, void 0, function* () {
            log.verbose("Got request to update a room");
            yield this.roomSync.getMxid(room, undefined, false);
        });
    }
    /**
     * Update the information on a remote group
     */
    updateGroup(group) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.groupSyncEnabled) {
                log.verbose("Got request to update a group");
                yield this.groupSync.getMxid(group, false);
            }
        });
    }
    /**
     * Trigger a remote room to be bridged
     */
    bridgeRoom(roomData) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.hooks.createRoom) {
                return;
            }
            // check if this is a valid room at all
            const room = yield this.namespaceHandler.createRoom(roomData);
            if (!room) {
                return;
            }
            this.metrics.room.inc({ type: room.isDirect ? "dm" : "group", protocol: (_a = this.protocol) === null || _a === void 0 ? void 0 : _a.id });
            if (room.isDirect) {
                return;
            }
            log.info(`Got request to bridge room puppetId=${room.puppetId} roomId=${room.roomId}`);
            yield this.roomSync.getMxid(room);
        });
    }
    /**
     * Unbridge a room, given an mxid
     */
    unbridgeRoomByMxid(mxid) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield this.roomSync.getPartsFromMxid(mxid);
            yield this.unbridgeRoom(room);
        });
    }
    /**
     * Unbridge a remote room
     */
    unbridgeRoom(room) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!room) {
                return;
            }
            log.info(`Got request to unbridge room puppetId=${room.puppetId} roomId=${room.roomId}`);
            yield this.roomSync.delete(room, true);
            this.metrics.room.dec({ type: room.isDirect ? "dm" : "group", protocol: (_a = this.protocol) === null || _a === void 0 ? void 0 : _a.id });
        });
    }
    /**
     * Set presence of a remote user
     */
    setUserPresence(user, presence) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.setUserPresence(user, presence);
        });
    }
    /**
     * Set the status message of a remote user
     */
    setUserStatus(user, status) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.setUserStatus(user, status);
        });
    }
    /**
     * Set if a remote user is typing in a room or not
     */
    setUserTyping(params, typing) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.setUserTyping(params, typing);
        });
    }
    /**
     * Send a read receipt of a remote user to matrix
     */
    sendReadReceipt(params) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.sendReadReceipt(params);
        });
    }
    /**
     * Adds a user to a room
     */
    addUser(params) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.addUser(params);
        });
    }
    /**
     * Removes a user from a room
     */
    removeUser(params) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.removeUser(params);
        });
    }
    /**
     * Get the mxid for a given remote user
     */
    getMxidForUser(user, doublePuppetCheck = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (doublePuppetCheck) {
                const puppetData = yield this.provisioner.get(user.puppetId);
                if (puppetData && puppetData.userId === user.userId) {
                    return puppetData.puppetMxid;
                }
            }
            const suffix = yield this.namespaceHandler.getSuffix(user.puppetId, user.userId);
            return this.appservice.getUserIdForSuffix(suffix);
        });
    }
    /**
     * Get the mxid for a given remote room
     */
    getMxidForRoom(room) {
        return __awaiter(this, void 0, void 0, function* () {
            const roomInfo = yield this.roomSync.maybeGet(room);
            if (roomInfo) {
                const client = (yield this.roomSync.getRoomOp(roomInfo.mxid)) || this.botIntent.underlyingClient;
                if (client) {
                    try {
                        const al = (yield client.getRoomStateEvent(roomInfo.mxid, "m.room.canonical_alias", "")).alias;
                        if (typeof al === "string" && al[0] === "#") {
                            return al;
                        }
                    }
                    catch (err) { } // do nothing
                }
            }
            const suffix = yield this.namespaceHandler.getSuffix(room.puppetId, room.roomId);
            return this.appservice.getAliasForSuffix(suffix);
        });
    }
    /**
     * Get the URL from an MXC uri
     */
    getUrlFromMxc(mxc, width, height, method) {
        const baseUrl = this.config.bridge.mediaUrl || this.config.bridge.homeserverUrl;
        const mxcPath = mxc.substring("mxc://".length);
        if (!width || !height) {
            return `${baseUrl}/_matrix/media/r0/download/${mxcPath}`;
        }
        if (!method) {
            method = "crop";
        }
        const widthUri = encodeURIComponent(width);
        const heightUri = encodeURIComponent(height);
        method = encodeURIComponent(method);
        return `${baseUrl}/_matrix/media/r0/thumbnail/${mxcPath}?width=${widthUri}&height=${heightUri}&method=${method}`;
    }
    /**
     * Get the info (name, avatar) of the the specified puppet
     */
    getPuppetMxidInfo(puppetId) {
        return __awaiter(this, void 0, void 0, function* () {
            let puppetMxid = "";
            try {
                puppetMxid = yield this.provisioner.getMxid(puppetId);
            }
            catch (err) {
                return null;
            }
            const info = yield this.store.puppetStore.getMxidInfo(puppetMxid);
            if (info && (info.name || info.avatarMxc)) {
                if (info.avatarMxc) {
                    info.avatarUrl = this.getUrlFromMxc(info.avatarMxc, AVATAR_SIZE, AVATAR_SIZE, "scale");
                }
                return info;
            }
            // okay, let's see if we can fetch the profile
            try {
                const ret = yield this.botIntent.underlyingClient.getUserProfile(puppetMxid);
                const p = yield this.store.puppetStore.getOrCreateMxidInfo(puppetMxid);
                p.name = ret.displayname || null;
                if (ret.avatar_url) {
                    p.avatarMxc = ret.avatar_url;
                    p.avatarUrl = this.getUrlFromMxc(ret.avatar_url, AVATAR_SIZE, AVATAR_SIZE, "scale");
                }
                else {
                    p.avatarMxc = null;
                    p.avatarUrl = null;
                }
                yield this.store.puppetStore.setMxidInfo(p);
                return p;
            }
            catch (err) {
                return null;
            }
        });
    }
    trackConnectionStatus(puppetId, isConnected) {
        if (Boolean(this.connectionMetricStatus[puppetId]) === isConnected) {
            return;
        }
        this.connectionMetricStatus[puppetId] = isConnected;
        if (isConnected) {
            this.metrics.connected.inc({ protocol: this.protocol.id });
        }
        else {
            this.metrics.connected.dec({ protocol: this.protocol.id });
        }
    }
    /**
     * Send a status message either to the status message room or to a specified room
     */
    sendStatusMessage(puppetId, msg, isConnected = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isConnected !== null) {
                this.trackConnectionStatus(typeof puppetId === "number" ? puppetId : puppetId.puppetId, isConnected);
            }
            yield this.botProvisioner.sendStatusMessage(puppetId, msg);
        });
    }
    /**
     * Registers a custom command with the bot provisioner
     */
    registerCommand(name, command) {
        this.botProvisioner.registerCommand(name, command);
    }
    /**
     * Send a file to matrix, auto-detect its type
     */
    sendFileDetect(params, thing, name) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.sendFileByType("detect", params, thing, name);
        });
    }
    /**
     * Send an m.file to matrix
     */
    sendFile(params, thing, name) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.sendFileByType("m.file", params, thing, name);
            this.metrics.message.inc({ type: "file", protocol: this.protocol.id });
        });
    }
    /**
     * Send an m.video to matrix
     */
    sendVideo(params, thing, name) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.sendFileByType("m.video", params, thing, name);
            this.metrics.message.inc({ type: "video", protocol: this.protocol.id });
        });
    }
    /**
     * Send an m.audio to matrix
     */
    sendAudio(params, thing, name) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.sendFileByType("m.audio", params, thing, name);
            this.metrics.message.inc({ type: "audio", protocol: this.protocol.id });
        });
    }
    /**
     * Send an m.image to matrix
     */
    sendImage(params, thing, name) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.sendFileByType("m.image", params, thing, name);
            this.metrics.message.inc({ type: "image", protocol: this.protocol.id });
        });
    }
    /**
     * Send a message to matrix
     */
    sendMessage(params, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.sendMessage(params, opts);
            this.metrics.message.inc({ type: "text", protocol: this.protocol.id });
        });
    }
    /**
     * Send an edit to matrix
     */
    sendEdit(params, eventId, opts, ix = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.sendEdit(params, eventId, opts, ix);
            this.metrics.message.inc({ type: "edit", protocol: this.protocol.id });
        });
    }
    /**
     * Send a redaction to matrix
     */
    sendRedact(params, eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.sendRedact(params, eventId);
            this.metrics.message.inc({ type: "redact", protocol: this.protocol.id });
        });
    }
    /**
     * Send a reply to matrix
     */
    sendReply(params, eventId, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.sendReply(params, eventId, opts);
        });
    }
    /**
     * Send a reaction to matrix
     */
    sendReaction(params, eventId, reaction) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.sendReaction(params, eventId, reaction);
            this.metrics.message.inc({ type: "reaction", protocol: this.protocol.id });
        });
    }
    /**
     * Remove a reaction from matrix
     */
    removeReaction(params, eventId, reaction) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.removeReaction(params, eventId, reaction);
        });
    }
    /**
     * Remove all reactions from a certain event
     */
    removeAllReactions(params, eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.remoteEventHandler.removeAllReactions(params, eventId);
        });
    }
    /**
     * Wraps a matrix client to use the mediaUrl endpoint instead
     */
    getMediaClient(client) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.bridge.mediaUrl) {
                return client;
            }
            const mediaClient = new matrix_bot_sdk_1.MatrixClient(this.config.bridge.mediaUrl, client.accessToken);
            mediaClient.metrics = client.metrics;
            const userId = yield client.getUserId();
            if (this.appservice.isNamespacedUser(userId) && userId !== this.appservice.botUserId) {
                mediaClient.impersonateUserId(userId);
            }
            return mediaClient;
        });
    }
    /**
     * Upload content to matrix, automatically de-duping it
     */
    uploadContent(client, thing, mimetype, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            let buffer;
            const locks = [];
            try {
                if (!client) {
                    client = this.botIntent.underlyingClient;
                }
                if (typeof thing === "string") {
                    yield this.mxcLookupLock.wait(thing);
                    locks.push(thing);
                    this.mxcLookupLock.set(thing);
                    const maybeMxcUrl = yield this.store.getFileMxc(thing);
                    if (maybeMxcUrl) {
                        return maybeMxcUrl;
                    }
                    if (!filename) {
                        const matches = thing.match(/\/([^\.\/]+\.[a-zA-Z0-9]+)(?:$|\?)/);
                        if (matches) {
                            filename = matches[1];
                        }
                    }
                    buffer = yield util_1.Util.DownloadFile(thing);
                }
                else {
                    buffer = thing;
                }
                {
                    const hash = util_1.Util.HashBuffer(buffer);
                    yield this.mxcLookupLock.wait(hash);
                    locks.push(hash);
                    this.mxcLookupLock.set(hash);
                    const maybeMxcUrl = yield this.store.getFileMxc(hash);
                    if (maybeMxcUrl) {
                        return maybeMxcUrl;
                    }
                }
                if (!filename) {
                    filename = "file";
                }
                if (!mimetype) {
                    mimetype = util_1.Util.GetMimeType(buffer);
                }
                const mediaClient = yield this.getMediaClient(client);
                const mxcUrl = yield mediaClient.uploadContent(buffer, mimetype, filename);
                if (typeof thing === "string") {
                    yield this.store.setFileMxc(thing, mxcUrl, filename);
                }
                yield this.store.setFileMxc(buffer, mxcUrl, filename);
                // we need to remove all locks
                for (const lock of locks) {
                    this.mxcLookupLock.release(lock);
                }
                return mxcUrl;
            }
            catch (err) {
                log.error("Failed to upload media", err.error || err.body || err);
                // we need to remove all locks
                for (const lock of locks) {
                    this.mxcLookupLock.release(lock);
                }
                throw err;
            }
        });
    }
    /**
     * Redacts an event and re-tries as room OP
     */
    redactEvent(client, roomId, eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield client.redactEvent(roomId, eventId);
            }
            catch (err) {
                if (err.body.errcode === "M_FORBIDDEN") {
                    const opClient = yield this.roomSync.getRoomOp(roomId);
                    if (!opClient) {
                        throw err;
                    }
                    yield opClient.redactEvent(roomId, eventId);
                }
                else {
                    throw err;
                }
            }
        });
    }
    getEventInfo(roomId, eventId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            let sender;
            if (typeof roomId !== "string") {
                const maybeRoomId = yield this.roomSync.maybeGetMxid(roomId);
                if (!maybeRoomId) {
                    return null;
                }
                if (roomId.puppetId !== -1) {
                    try {
                        sender = yield this.provisioner.getMxid(roomId.puppetId);
                    }
                    catch (_a) { }
                }
                eventId = (yield this.eventSync.getMatrix(roomId, eventId))[0];
                roomId = maybeRoomId;
            }
            return this.matrixEventHandler.getEventInfo(roomId, eventId, client, sender);
        });
    }
}
exports.PuppetBridge = PuppetBridge;
//# sourceMappingURL=puppetbridge.js.map