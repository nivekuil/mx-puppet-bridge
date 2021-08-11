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
const puppetstore_1 = require("./db/puppetstore");
const log_1 = require("./log");
const timedcache_1 = require("./structures/timedcache");
const MarkdownIt = require("markdown-it");
const md = new MarkdownIt();
// tslint:disable-next-line:no-magic-numbers
const MESSAGE_COLLECT_TIMEOUT = 1000 * 60;
const MAX_MSG_SIZE = 4000;
const log = new log_1.Log("BotProvisioner");
class BotProvisioner {
    constructor(bridge) {
        this.bridge = bridge;
        this.commands = {};
        this.provisioner = this.bridge.provisioner;
        this.fnCollectListeners = new timedcache_1.TimedCache(MESSAGE_COLLECT_TIMEOUT);
        this.registerDefaultCommands();
    }
    processEvent(roomId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event.type !== "m.room.message") {
                return; // not ours to handle
            }
            const msg = event.textBody;
            if (msg.startsWith("!")) {
                // check if we actually have a normal room event
                if (msg.startsWith(`!${this.bridge.protocol.id}`)) {
                    yield this.processRoomEvent(roomId, event);
                }
                return;
            }
            const sender = event.sender;
            // update the status room entry, if needed
            const senderInfo = yield this.bridge.puppetStore.getOrCreateMxidInfo(sender);
            if (senderInfo.statusRoom !== roomId) {
                // let's verify that the new status room is emtpy
                const members = yield this.bridge.botIntent.underlyingClient.getRoomMembers(roomId);
                const DM_MEMBERS_LENGTH = 2;
                if (members.length !== DM_MEMBERS_LENGTH) {
                    return; // not our stuff to bother with
                }
                senderInfo.statusRoom = roomId;
                yield this.bridge.puppetStore.setMxidInfo(senderInfo);
            }
            // parse the argument and parameters of the message
            const [, arg, param] = event.textBody.split(/([^ ]*)(?: (.*))?/);
            log.info(`Got message to process with arg=${arg}`);
            const fnCollect = this.fnCollectListeners.get(sender);
            switch (fnCollect ? "link" : arg) {
                case "relink":
                case "link": {
                    let puppetId = -1;
                    let parseParam = param;
                    if (fnCollect) {
                        puppetId = fnCollect.puppetId;
                        parseParam = event.textBody;
                    }
                    else if (arg === "relink") {
                        const [, pidStr, p] = (param || "").split(/([^ ]*)(?: (.*))?/);
                        const pid = parseInt(pidStr, 10);
                        // now we need to check if that pid is ours
                        const d = yield this.provisioner.get(pid);
                        if (!d || d.puppetMxid !== sender) {
                            yield this.sendMessage(roomId, "ERROR: PuppetID not found");
                            break;
                        }
                        puppetId = pid;
                        parseParam = p;
                    }
                    if (!parseParam) {
                        parseParam = "";
                    }
                    if (!this.provisioner.canCreate(sender)) {
                        yield this.sendMessage(roomId, "ERROR: You don't have permission to use this bridge");
                        break;
                    }
                    if (!this.bridge.hooks.getDataFromStr) {
                        yield this.sendMessage(roomId, "ERROR: The bridge is still starting up, please try again shortly");
                        break;
                    }
                    let retData;
                    if (fnCollect) {
                        retData = yield fnCollect.fn(event.textBody);
                        this.fnCollectListeners.delete(sender);
                    }
                    else {
                        retData = yield this.bridge.hooks.getDataFromStr(parseParam);
                    }
                    if (!retData.success) {
                        const print = retData.fn || retData.data ? retData.error : `ERROR: ${retData.error}`;
                        yield this.sendMessage(roomId, print || "");
                        if (retData.fn) {
                            this.fnCollectListeners.set(sender, {
                                fn: retData.fn,
                                puppetId,
                            });
                        }
                        if (!retData.data) {
                            break;
                        }
                    }
                    let data;
                    try {
                        data = (yield retData.data) || {};
                    }
                    catch (err) {
                        log.warn("Failed to create/update link", err);
                        yield this.sendMessage(roomId, `ERROR: ${err}`);
                        break;
                    }
                    if (puppetId === -1) {
                        // we need to create a new link
                        puppetId = yield this.provisioner.new(sender, data, retData.userId);
                        yield this.sendMessage(roomId, `Created new link with ID ${puppetId}`);
                    }
                    else {
                        // we need to update an existing link
                        yield this.provisioner.update(sender, puppetId, data, retData.userId);
                        yield this.sendMessage(roomId, `Updated link with ID ${puppetId}`);
                    }
                    break;
                }
                case "unlink": {
                    if (!param || !param.trim()) {
                        yield this.sendMessage(roomId, `ERROR: You need to specify an index to unlink`);
                        return;
                    }
                    const puppetId = Number(param.trim());
                    if (isNaN(puppetId)) {
                        yield this.sendMessage(roomId, `ERROR: The index must be a number`);
                        return;
                    }
                    const data = yield this.provisioner.get(puppetId);
                    if (!data || data.puppetMxid !== sender) {
                        yield this.sendMessage(roomId, `ERROR: You must own the index`);
                        return;
                    }
                    yield this.provisioner.delete(sender, puppetId);
                    yield this.sendMessage(roomId, `Removed link with ID ${puppetId}`);
                    break;
                }
                default: {
                    let handled = false;
                    for (const name in this.commands) {
                        if (this.commands.hasOwnProperty(name) && name === arg) {
                            handled = true;
                            const sendMessage = (s) => __awaiter(this, void 0, void 0, function* () {
                                yield this.sendMessage(roomId, s);
                            });
                            if (this.commands[name].withPid) {
                                const [, pidStr, p] = (param || "").split(/([^ ]*)(?: (.*))?/);
                                const pid = parseInt(pidStr, 10);
                                const d = isNaN(pid) ? null : yield this.provisioner.get(pid);
                                if (!d || d.puppetMxid !== sender) {
                                    yield this.sendMessage(roomId, "ERROR: PuppetID not found");
                                    break;
                                }
                                yield this.commands[name].fn(pid, p, sendMessage);
                            }
                            else {
                                yield this.commands[name].fn(sender, param || "", sendMessage);
                            }
                            break;
                        }
                    }
                    if (!handled) {
                        yield this.sendMessage(roomId, "Command not found! Please type `help` to see a list of" +
                            " all commands or `help <command>` to get help on a specific command.");
                    }
                }
            }
        });
    }
    processRoomEvent(roomId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event.type !== "m.room.message") {
                return; // not ours to handle
            }
            const sender = event.sender;
            const prefix = `!${this.bridge.protocol.id} `;
            if (!event.textBody.startsWith(prefix)) {
                return; // not ours to handle, either
            }
            const [, arg, param] = event.textBody.substr(prefix.length).split(/([^ ]*)(?: (.*))?/);
            let handled = false;
            const client = yield this.bridge.roomSync.getRoomOp(roomId);
            for (const name in this.commands) {
                if (this.commands.hasOwnProperty(name) && name === arg && this.commands[name].inRoom) {
                    handled = true;
                    const sendMessage = (s) => __awaiter(this, void 0, void 0, function* () {
                        yield this.sendMessage(roomId, s, client);
                    });
                    yield this.commands[name].fn(sender, param || "", sendMessage, roomId);
                    break;
                }
            }
            if (!handled) {
                yield this.sendMessage(roomId, `Command not found! Please type \`${prefix}help\` to see a list of` +
                    ` all commands or \`${prefix}help <command>\` to get help on a specific command.`, client);
            }
        });
    }
    sendStatusMessage(room, msg) {
        return __awaiter(this, void 0, void 0, function* () {
            let puppetId = -1;
            if (isNaN(room)) {
                puppetId = room.puppetId;
            }
            else {
                puppetId = room;
            }
            log.info(`Sending status message for puppetId ${puppetId}...`);
            const mxid = yield this.provisioner.getMxid(puppetId);
            let roomMxid = "";
            let sendStr = "[Status] ";
            let client;
            if (isNaN(room)) {
                const maybeRoomMxid = yield this.bridge.roomSync.maybeGetMxid(room);
                if (!maybeRoomMxid) {
                    log.error("Room MXID is not found, this is very odd");
                    return;
                }
                roomMxid = maybeRoomMxid;
                const ghost = (yield this.bridge.puppetStore.getGhostsInRoom(roomMxid))[0];
                if (ghost) {
                    client = this.bridge.AS.getIntentForUserId(ghost).underlyingClient;
                }
            }
            else {
                const info = yield this.bridge.puppetStore.getOrCreateMxidInfo(mxid);
                if (!info.statusRoom) {
                    // no status room present, nothing to do
                    log.info("No status room found");
                    return;
                }
                roomMxid = info.statusRoom;
                const desc = yield this.provisioner.getDesc(mxid, puppetId);
                if (!desc) {
                    // something went wrong
                    log.error("Description is not found, this is very odd");
                    return;
                }
                sendStr += `${puppetId}: ${desc.desc}: `;
            }
            sendStr += msg;
            yield this.sendMessage(roomMxid, sendStr, client);
        });
    }
    registerCommand(name, command) {
        if (command.withPid === undefined) {
            command.withPid = true;
        }
        if (command.withPid || command.inRoom === undefined) {
            command.inRoom = false;
        }
        this.commands[name] = command;
    }
    registerDefaultCommands() {
        this.registerCommand("help", {
            fn: (sender, param, sendMessage, roomId) => __awaiter(this, void 0, void 0, function* () {
                param = param.trim();
                if (!param) {
                    const commands = roomId ? [] : ["`link`", "`unlink`", "`relink`"];
                    for (const name in this.commands) {
                        if (this.commands.hasOwnProperty(name) && ((roomId && this.commands[name].inRoom) || !roomId)) {
                            commands.push(`\`${name}\``);
                        }
                    }
                    const helpCmd = roomId ? `!${this.bridge.protocol.id} help <command>` : "help <command>";
                    const msg = `Available commands: ${commands.join(", ")}\n\nType \`${helpCmd}\` to get more help on them.`;
                    yield sendMessage(msg);
                    return;
                }
                // alright, let's display some help!
                if (!this.commands[param]) {
                    yield sendMessage(`Command \`${param}\` not found!`);
                    return;
                }
                yield sendMessage(this.commands[param].help);
            }),
            help: `List all commands and optionally get help on specific ones.

Usage: \`help\`, \`help <command>\``,
            withPid: false,
            inRoom: true,
        });
        this.registerCommand("list", {
            fn: (sender, param, sendMessage) => __awaiter(this, void 0, void 0, function* () {
                const descs = yield this.provisioner.getDescMxid(sender);
                if (descs.length === 0) {
                    yield sendMessage("Nothing linked yet!");
                    return;
                }
                let sendStr = "Links:\n";
                for (const d of descs) {
                    let sendStrPart = ` - ${d.puppetId}: ${d.desc}`;
                    if (d.type !== "puppet") {
                        sendStrPart += ` (type: ${d.type})`;
                    }
                    if (d.isPublic) {
                        sendStrPart += " **public!**";
                    }
                    sendStrPart += "\n";
                    if (sendStr.length + sendStrPart.length > MAX_MSG_SIZE) {
                        yield sendMessage(sendStr);
                        sendStr = "";
                    }
                    sendStr += sendStrPart;
                }
                yield sendMessage(sendStr);
            }),
            help: `List all set links along with their information.

Usage: \`list\``,
            withPid: false,
        });
        this.registerCommand("setmatrixtoken", {
            fn: (sender, param, sendMessage) => __awaiter(this, void 0, void 0, function* () {
                if (!param || !param.trim()) {
                    yield this.provisioner.setToken(sender, null);
                    yield sendMessage(`Removed matrix token!`);
                    return;
                }
                const token = param.trim();
                const hsUrl = yield this.provisioner.getHsUrl(sender);
                const client = yield this.bridge.userSync.getClientFromTokenCallback({
                    token,
                    hsUrl,
                    mxid: sender,
                });
                if (!client) {
                    yield sendMessage("ERROR: Invalid matrix token");
                    return;
                }
                yield this.provisioner.setToken(sender, token);
                yield sendMessage(`Set matrix token`);
            }),
            help: `Sets a matrix token to enable double-puppeting.

Usage: \`setmatrixtoken <token>\``,
            withPid: false,
        });
        this.registerCommand("adminme", {
            fn: (sender, param, sendMessage, roomId) => __awaiter(this, void 0, void 0, function* () {
                // Set the user to admin
                try {
                    yield this.provisioner.setAdmin(sender, param || roomId);
                    yield sendMessage("Admin level set.");
                }
                catch (err) {
                    yield sendMessage(err.message);
                }
            }),
            help: `Sets you as admin for a certain room.

Usage: \`adminme <room resolvable>\``,
            withPid: false,
            inRoom: true,
        });
        this.registerCommand("listusers", {
            fn: (sender, param, sendMessage) => __awaiter(this, void 0, void 0, function* () {
                if (!this.bridge.hooks.listUsers) {
                    yield sendMessage("Feature not implemented!");
                    return;
                }
                const descs = yield this.provisioner.getDescMxid(sender);
                if (descs.length === 0) {
                    yield sendMessage("Nothing linked yet!");
                    return;
                }
                let reply = "";
                for (const d of descs) {
                    const users = yield this.bridge.hooks.listUsers(d.puppetId);
                    reply += `## ${d.puppetId}: ${d.desc}:\n\n`;
                    for (const u of users) {
                        let replyPart = "";
                        if (u.category) {
                            replyPart = `\n### ${u.name}:\n\n`;
                        }
                        else {
                            const mxid = yield this.bridge.getMxidForUser({
                                puppetId: d.puppetId,
                                userId: u.id,
                            }, false);
                            replyPart = ` - ${u.name}: [${u.name}](https://matrix.to/#/${mxid})\n`;
                        }
                        if (reply.length + replyPart.length > MAX_MSG_SIZE) {
                            yield sendMessage(reply);
                            reply = "";
                        }
                        reply += replyPart;
                    }
                }
                yield sendMessage(reply);
            }),
            help: `Lists all users that are linked currently, from all links.

Usage: \`listusers\``,
            withPid: false,
        });
        this.registerCommand("listrooms", {
            fn: (sender, param, sendMessage) => __awaiter(this, void 0, void 0, function* () {
                if (!this.bridge.hooks.listRooms) {
                    yield sendMessage("Feature not implemented!");
                    return;
                }
                const descs = yield this.provisioner.getDescMxid(sender);
                if (descs.length === 0) {
                    yield sendMessage("Nothing linked yet!");
                    return;
                }
                let reply = "";
                for (const d of descs) {
                    const rooms = yield this.bridge.hooks.listRooms(d.puppetId);
                    reply += `## ${d.puppetId}: ${d.desc}:\n\n`;
                    for (const r of rooms) {
                        let replyPart = "";
                        if (r.category) {
                            replyPart = `\n### ${r.name}:\n\n`;
                        }
                        else {
                            const mxid = yield this.bridge.getMxidForRoom({
                                puppetId: d.puppetId,
                                roomId: r.id,
                            });
                            replyPart = ` - ${r.name}: [${r.name}](https://matrix.to/#/${mxid})\n`;
                        }
                        if (reply.length + replyPart.length > MAX_MSG_SIZE) {
                            yield sendMessage(reply);
                            reply = "";
                        }
                        reply += replyPart;
                    }
                }
                yield sendMessage(reply);
            }),
            help: `List all rooms that are linked currently, from all links.

Usage: \`listrooms\``,
            withPid: false,
        });
        this.registerCommand("listgroups", {
            fn: (sender, param, sendMessage) => __awaiter(this, void 0, void 0, function* () {
                if (!this.bridge.hooks.listGroups) {
                    yield sendMessage("Feature not implemented!");
                    return;
                }
                else if (!this.bridge.groupSyncEnabled) {
                    yield sendMessage("Group sync is not enabled!");
                    return;
                }
                const descs = yield this.provisioner.getDescMxid(sender);
                if (descs.length === 0) {
                    yield sendMessage("Nothing linked yet!");
                    return;
                }
                let reply = "";
                for (const d of descs) {
                    const groups = yield this.bridge.hooks.listGroups(d.puppetId);
                    reply += `### ${d.puppetId}: ${d.desc}:\n\n`;
                    for (const g of groups) {
                        const mxid = yield this.bridge.groupSync.getMxid({
                            puppetId: d.puppetId,
                            groupId: g.id,
                        });
                        const replyPart = ` - ${g.name}: [${g.name}](https://matrix.to/#/${mxid})\n`;
                        if (reply.length + replyPart.length > MAX_MSG_SIZE) {
                            yield sendMessage(reply);
                            reply = "";
                        }
                        reply += replyPart;
                    }
                }
                yield sendMessage(reply);
            }),
            help: `Synchronize and list all groups that are linked currently, from all links.

Usage: \`listgroups\``,
            withPid: false,
        });
        this.registerCommand("settype", {
            fn: (puppetId, param, sendMessage) => __awaiter(this, void 0, void 0, function* () {
                if (!puppetstore_1.PUPPET_TYPES.includes(param)) {
                    yield sendMessage("ERROR: Invalid type. Valid types are: " + puppetstore_1.PUPPET_TYPES.map((s) => `\`${s}\``).join(", "));
                    return;
                }
                yield this.provisioner.setType(puppetId, param);
                yield sendMessage(`Set puppet type to ${param}`);
            }),
            help: `Sets the type of a given puppet. Valid types are "puppet" and "relay".

Usage: \`settype <puppetId> <type>\``,
        });
        this.registerCommand("setispublic", {
            fn: (puppetId, param, sendMessage) => __awaiter(this, void 0, void 0, function* () {
                const isPublic = param === "1" || param === "true";
                yield this.provisioner.setIsPublic(puppetId, isPublic);
                yield sendMessage(`Set puppet to ${isPublic ? "public" : "private"}`);
            }),
            help: `Sets if the given puppet creates rooms as public or invite-only.

Usage: \`setispublic <puppetId> <1/0>`,
        });
        if (this.bridge.protocol.features.globalNamespace) {
            this.registerCommand("setisglobalnamespace", {
                fn: (puppetId, param, sendMessage) => __awaiter(this, void 0, void 0, function* () {
                    const isGlobal = param === "1" || param === "true";
                    yield this.provisioner.setIsGlobalNamespace(puppetId, isGlobal);
                    yield sendMessage(`Set puppet to ${isGlobal ? "global" : "private"} namespace`);
                }),
                help: `Sets if the given puppet creates shared or separate rooms for multiple users accessing the same bridged room.

Usage: \`setisglobalnamespace <puppetId> <1/0>\``,
            });
        }
        this.registerCommand("setautoinvite", {
            fn: (puppetId, param, sendMessage) => __awaiter(this, void 0, void 0, function* () {
                const autoinvite = param === "1" || param === "true";
                yield this.provisioner.setAutoinvite(puppetId, autoinvite);
                yield sendMessage(`Set puppet to ${autoinvite ? "autoinvite" : "ignore"}`);
            }),
            help: `Sets if the given puppet should autoinvite you to newly bridged rooms.

Usage: \`setautoinvite <puppetId> <1/0>`,
        });
        this.registerCommand("invite", {
            fn: (sender, param, sendMessage, roomId) => __awaiter(this, void 0, void 0, function* () {
                const success = yield this.provisioner.invite(sender, param);
                if (success) {
                    yield sendMessage("Sent invite to the room!");
                }
                else {
                    yield sendMessage("Couldn't send invite to the room. Perhaps you don't have permission to see it?");
                }
            }),
            help: `Receive an invite to a room. The room resolvable can be a matrix.to link, a room ID, an alias or a user ID.

Usage: \`invite <room resolvable>\``,
            withPid: false,
            inRoom: true,
        });
        this.registerCommand("groupinvite", {
            fn: (sender, param, sendMessage, roomId) => __awaiter(this, void 0, void 0, function* () {
                const success = yield this.provisioner.groupInvite(sender, param || roomId);
                if (success) {
                    yield sendMessage("Sent invite to the group!");
                }
                else {
                    yield sendMessage("Couldn't send invite to the group. Perhaps you don't have permission to see it?");
                }
            }),
            help: `Receive an invite to a group. The group resolvable can be a matrix.to link, a room ID or alias.

Usage: \`groupinvite <group resolvable>\``,
            withPid: false,
            inRoom: true,
        });
        if (this.bridge.protocol.features.globalNamespace) {
            this.registerCommand("bridge", {
                fn: (sender, param, sendMessage, roomId) => __awaiter(this, void 0, void 0, function* () {
                    if (!roomId) {
                        yield sendMessage("Must send this command in a room!");
                        return;
                    }
                    try {
                        yield this.provisioner.bridgeRoom(sender, roomId, param);
                        yield sendMessage("Bridged the room!");
                    }
                    catch (err) {
                        yield sendMessage(err.message);
                    }
                }),
                help: `Bridge a room.

Usage: \`!${this.bridge.protocol.id} bridge <remote room ID>\``,
                withPid: false,
                inRoom: true,
            });
        }
        this.registerCommand("unbridge", {
            fn: (sender, param, sendMessage, roomId) => __awaiter(this, void 0, void 0, function* () {
                const success = yield this.provisioner.unbridgeRoom(sender, param || roomId);
                if (success) {
                    yield sendMessage("Unbridged the room!");
                }
                else {
                    yield sendMessage("Couldn't unbridge the room. Perhaps it doesn't exist or you aren't the owner of it?");
                }
            }),
            help: `Unbridge a room. The room resolvable can be a matrix.to link, a room ID, an alias or a user ID.

Usage: \`unbridge <room resolvable>\``,
            withPid: false,
            inRoom: true,
        });
        this.registerCommand("fixghosts", {
            fn: (sender, param, sendMessage, roomId) => __awaiter(this, void 0, void 0, function* () {
                const roomParts = yield this.bridge.roomSync.resolve(roomId || param);
                if (!roomParts) {
                    yield sendMessage("Room not resolvable");
                    return;
                }
                const room = yield this.bridge.roomSync.maybeGet(roomParts);
                if (!room) {
                    yield sendMessage("Room not found");
                    return;
                }
                if (!(yield this.bridge.namespaceHandler.isAdmin(room, sender))) {
                    yield sendMessage("Not an admin");
                    return;
                }
                yield sendMessage("Fixing the ghosts...");
                // tslint:disable-next-line no-floating-promises
                this.bridge.roomSync.addGhosts(room);
            }),
            help: `Fix the ghosts in a room.

Usage: \`fixghosts <room resolvable>\``,
            withPid: false,
            inRoom: true,
        });
        this.registerCommand("fixmute", {
            fn: (sender, param, sendMessage, roomId) => __awaiter(this, void 0, void 0, function* () {
                const roomParts = yield this.bridge.roomSync.resolve(roomId || param);
                if (!roomParts) {
                    yield sendMessage("Room not resolvable");
                    return;
                }
                const room = yield this.bridge.roomSync.maybeGet(roomParts);
                if (!room) {
                    yield sendMessage("Room not found");
                    return;
                }
                yield sendMessage("Fixing muted user...");
                yield this.provisioner.adjustMuteIfInRoom(sender, room.mxid);
            }),
            help: `Fix the power levels according to puppet & relay availability in the bridged room.

Usage: \`fixmute <room resolvable>\``,
            withPid: false,
            inRoom: true,
        });
        this.registerCommand("resendbridgeinfo", {
            fn: (sender, param, sendMessage) => __awaiter(this, void 0, void 0, function* () {
                yield sendMessage("Re-sending bridge information state events...");
                const puppets = yield this.provisioner.getForMxid(sender);
                const puppetIds = yield Promise.all(puppets.map((puppet) => this.bridge.namespaceHandler.getDbPuppetId(puppet.puppetId)
                    .catch((err) => log.warning(`Failed to get DB puppet ID for ${puppet.puppetId}:`, err))));
                const uniquePuppetIds = [...new Set(puppetIds)];
                const roomLists = yield Promise.all(uniquePuppetIds.map((puppetId) => puppetId
                    ? this.bridge.roomStore.getByPuppetId(puppetId)
                        .catch((err) => log.warning(`Failed to find puppet by ID ${puppetId}:`, err))
                    : Promise.resolve(null)));
                const rooms = yield Promise.all(roomLists.flatMap((roomList) => roomList
                    ? roomList.map((room) => this.bridge.namespaceHandler.getRemoteRoom(room, sender)
                        .catch((err) => log.warning(`Failed to get remote room ${room.puppetId}/${room.roomId}:`, err)))
                    : Promise.resolve(null)));
                yield Promise.all(rooms.map((room) => room &&
                    this.bridge.roomSync.updateBridgeInformation(room)
                        .catch((err) => log.warning(`Failed to update bridge info in ${room.roomId}:`, err))));
                yield sendMessage("Bridge information state event re-sent to all your rooms");
            }),
            help: `Re-send bridge info state events to all rooms.`,
            withPid: false,
            inRoom: false,
        });
    }
    sendMessage(roomId, message, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const html = md.render(message);
            if (!client) {
                client = this.bridge.botIntent.underlyingClient;
            }
            yield client.sendMessage(roomId, {
                msgtype: "m.notice",
                body: message,
                formatted_body: html,
                format: "org.matrix.custom.html",
            });
        });
    }
}
exports.BotProvisioner = BotProvisioner;
//# sourceMappingURL=botprovisioner.js.map