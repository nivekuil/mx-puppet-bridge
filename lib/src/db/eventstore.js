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
const log_1 = require("../log");
const log = new log_1.Log("DbEventStore");
class DbEventStore {
    constructor(db, protocol = "unknown") {
        this.db = db;
        this.protocol = protocol;
    }
    insert(puppetId, roomId, matrixId, remoteId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("insert"));
            yield this.db.Run("INSERT INTO event_store (puppet_id, room_id, matrix_id, remote_id) VALUES ($p, $room, $m, $r)", {
                p: puppetId,
                room: roomId,
                m: matrixId,
                r: remoteId,
            });
            stopTimer();
        });
    }
    remove(puppetId, roomId, remoteId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("remove"));
            yield this.db.Run("DELETE FROM event_store WHERE puppet_id = $p AND room_id = $room AND remote_id = $r", {
                p: puppetId,
                room: roomId,
                r: remoteId,
            });
            stopTimer();
        });
    }
    getMatrix(puppetId, roomId, remoteId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_matrix"));
            const result = [];
            const rows = yield this.db.All("SELECT * FROM event_store WHERE puppet_id=$p AND room_id = $room AND remote_id=$r", {
                p: puppetId,
                room: roomId,
                r: remoteId,
            });
            for (const row of rows) {
                result.push(row.matrix_id);
            }
            stopTimer();
            return result;
        });
    }
    getRemote(puppetId, roomId, matrixId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stopTimer = this.db.latency.startTimer(this.labels("select_remote"));
            const result = [];
            const rows = yield this.db.All("SELECT * FROM event_store WHERE puppet_id = $p AND room_id = $room AND matrix_id = $m", {
                p: puppetId,
                room: roomId,
                m: matrixId,
            });
            for (const row of rows) {
                result.push(row.remote_id);
            }
            stopTimer();
            return result;
        });
    }
    labels(queryName) {
        return {
            protocol: this.protocol,
            engine: this.db.type,
            table: "event_store",
            type: queryName,
        };
    }
}
exports.DbEventStore = DbEventStore;
//# sourceMappingURL=eventstore.js.map