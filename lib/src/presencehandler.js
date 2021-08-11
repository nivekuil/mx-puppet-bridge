"use strict";
/*
Copyright 2019 mx-puppet-bridge
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
// tslint:disable no-magic-numbers
const PRESENCE_SYNC_TIMEOUT = 1000 * 25; // synapse has a timeout of 30s, an extra 5s gives some slack
// tslint:enable no-magic-numbers
const log = new log_1.Log("PresenceHandler");
class PresenceHandler {
    constructor(bridge, config) {
        this.bridge = bridge;
        this.config = config;
        this.presenceQueue = [];
    }
    get queueCount() {
        return this.presenceQueue.length;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.enabled) {
                // nothing to do...
                return;
            }
            if (this.interval) {
                log.info("Restarting presence handler...");
                this.stop();
            }
            log.info(`Starting presence handler with new interval ${this.config.interval}ms`);
            this.interval = setInterval(yield this.processIntervalThread.bind(this), this.config.interval);
        });
    }
    stop() {
        if (!this.interval) {
            log.info("Can not stop interval, not running.");
            return;
        }
        log.info("Stopping presence handler");
        clearInterval(this.interval);
        this.interval = null;
    }
    set(mxid, presence) {
        if (!this.handled(mxid)) {
            return;
        }
        log.verbose(`Setting presence of ${mxid} to ${presence}`);
        const index = this.queueIndex(mxid);
        if (index === -1) {
            const p = {
                mxid,
                presence,
                last_sent: Date.now(),
            };
            this.presenceQueue.push(p);
            // do this async in the BG for live updates
            // tslint:disable-next-line:no-floating-promises
            this.setMatrixPresence(p);
        }
        else {
            this.presenceQueue[index].presence = presence;
            this.presenceQueue[index].last_sent = Date.now();
            // do this async in the BG for live updates
            // tslint:disable-next-line:no-floating-promises
            this.setMatrixPresence(this.presenceQueue[index]);
        }
    }
    setStatus(mxid, status) {
        if (!this.handled(mxid)) {
            return;
        }
        log.verbose(`Setting status of ${mxid} to ${status}`);
        const index = this.queueIndex(mxid);
        if (index === -1) {
            const p = {
                mxid,
                status,
                last_sent: Date.now(),
            };
            this.presenceQueue.push(p);
            // do this async in the BG for live updates
            // tslint:disable-next-line:no-floating-promises
            this.setMatrixStatus(p);
            // tslint:disable-next-line:no-floating-promises
            this.setMatrixPresence(p);
        }
        else {
            this.presenceQueue[index].status = status;
            this.presenceQueue[index].last_sent = Date.now();
            // do this async in the BG for live updates
            // tslint:disable-next-line:no-floating-promises
            this.setMatrixStatus(this.presenceQueue[index]);
            // tslint:disable-next-line:no-floating-promises
            this.setMatrixPresence(this.presenceQueue[index]);
        }
    }
    setStatusInRoom(mxid, roomId) {
        if (!this.handled(mxid)) {
            return;
        }
        log.verbose(`Setting status of ${mxid} in ${roomId}`);
        const index = this.queueIndex(mxid);
        if (index === -1) {
            return;
        }
        // tslint:disable-next-line:no-floating-promises
        this.setMatrixStatusInRoom(this.presenceQueue[index], roomId);
    }
    remove(mxid) {
        this.set(mxid, "offline");
    }
    queueIndex(mxid) {
        return this.presenceQueue.findIndex((p) => p.mxid === mxid);
    }
    handled(mxid) {
        return this.bridge.AS.isNamespacedUser(mxid) && mxid !== this.bridge.botIntent.userId;
    }
    processIntervalThread() {
        return __awaiter(this, void 0, void 0, function* () {
            const info = this.presenceQueue.shift();
            if (info) {
                const now = Date.now();
                if ((now - info.last_sent) > PRESENCE_SYNC_TIMEOUT) {
                    yield this.setMatrixPresence(info);
                    if (info.presence !== "offline") {
                        info.last_sent = now;
                        this.presenceQueue.push(info);
                    }
                    else {
                        log.verbose(`Dropping ${info.mxid} from the presence queue.`);
                    }
                }
                else {
                    this.presenceQueue.push(info);
                    log.silly(`Not updating presence for ${info.mxid}, still fresh enough`);
                }
            }
        });
    }
    setMatrixPresence(info) {
        return __awaiter(this, void 0, void 0, function* () {
            const intent = this.bridge.AS.getIntentForUserId(info.mxid);
            yield intent.ensureRegistered();
            const statusObj = { presence: info.presence || "online" };
            if (info.status) {
                statusObj.status_msg = info.status;
            }
            log.silly(`Updating presence for ${info.mxid} (presence=${info.presence} status=${info.status}})`);
            try {
                // time to set tpe presence
                const client = intent.underlyingClient;
                const userId = encodeURIComponent(yield client.getUserId());
                const url = `/_matrix/client/r0/presence/${userId}/status`;
                yield client.doRequest("PUT", url, null, statusObj);
            }
            catch (err) {
                log.info(`Could not update Matrix presence for ${info.mxid}`, err.error || err.body || err);
            }
        });
    }
    setMatrixStatus(info) {
        return __awaiter(this, void 0, void 0, function* () {
            const rooms = yield this.bridge.puppetStore.getRoomsOfGhost(info.mxid);
            for (const roomId of rooms) {
                yield this.setMatrixStatusInRoom(info, roomId);
            }
        });
    }
    setMatrixStatusInRoom(info, roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.enableStatusState || (info.presence === "offline" && !info.status)) {
                return;
            }
            const userParts = this.bridge.userSync.getPartsFromMxid(info.mxid);
            if (!userParts || this.config.statusStateBlacklist.includes(userParts.userId)) {
                return;
            }
            const intent = this.bridge.AS.getIntentForUserId(info.mxid);
            yield intent.ensureRegistered();
            log.silly(`Sending status for ${info.mxid} into room ${roomId}`);
            const client = intent.underlyingClient;
            const data = {
                status: info.status,
            };
            try {
                yield client.sendStateEvent(roomId, "im.vector.user_status", yield client.getUserId(), data);
            }
            catch (err) {
                if (err.body && err.body.errcode === "M_FORBIDDEN" && err.body.error.includes("user_level (0) < send_level (50)")) {
                    log.debug("Couldn't set status, trying to raise required power level");
                    // ALRIGHT, let's fetch the OP, change the permission needed for status and update again
                    const opClient = yield this.bridge.roomSync.getRoomOp(roomId);
                    if (opClient) {
                        try {
                            const powerLevels = yield opClient.getRoomStateEvent(roomId, "m.room.power_levels", "");
                            if (!powerLevels.events) {
                                powerLevels.events = {};
                            }
                            powerLevels.events["im.vector.user_status"] = 0;
                            yield opClient.sendStateEvent(roomId, "m.room.power_levels", "", powerLevels);
                            log.debug("Re-setting status.....");
                            yield client.sendStateEvent(roomId, "im.vector.user_status", yield client.getUserId(), data);
                        }
                        catch (err2) {
                            log.info(`Couldn't set status for ${info.mxid} in ${roomId}`, err2.error || err2.body || err2);
                        }
                    }
                    else {
                        log.info(`Couldn't set status for ${info.mxid} in ${roomId}`, err.error || err.body || err);
                    }
                }
                else {
                    log.info(`Couldn't set status for ${info.mxid} in ${roomId}`, err.error || err.body || err);
                }
            }
        });
    }
}
exports.PresenceHandler = PresenceHandler;
//# sourceMappingURL=presencehandler.js.map