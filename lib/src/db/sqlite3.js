"use strict";
/*
Copyright 2018 matrix-appservice-discord

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
const Database = require("better-sqlite3");
const log_1 = require("../log");
const prometheus = require("prom-client");
const log = new log_1.Log("SQLite3");
class SQLite3 {
    constructor(filename) {
        this.filename = filename;
        this.type = "sqlite";
        this.insertId = -1;
        this.latency = new prometheus.Histogram({
            name: "bridge_database_query_seconds",
            help: "Time spent querying the database engine",
            labelNames: ["protocol", "engine", "type", "table"],
            // tslint:disable-next-line no-magic-numbers
            buckets: [0.002, 0.005, 0.0075, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
        });
    }
    Open() {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`Opening ${this.filename}`);
            this.db = new Database(this.filename);
        });
    }
    Get(sql, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            log.silly("Get:", sql);
            return this.db.prepare(sql).get(parameters || []);
        });
    }
    All(sql, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            log.silly("All:", sql);
            return this.db.prepare(sql).all(parameters || []);
        });
    }
    Run(sql, parameters, returnId) {
        return __awaiter(this, void 0, void 0, function* () {
            log.silly("Run:", sql);
            const info = yield this.db.prepare(sql).run(parameters || []);
            return info.lastInsertRowid;
        });
    }
    Close() {
        return __awaiter(this, void 0, void 0, function* () {
            this.db.close();
        });
    }
    Exec(sql) {
        return __awaiter(this, void 0, void 0, function* () {
            log.silly("Exec:", sql);
            return this.db.exec(sql);
        });
    }
}
exports.SQLite3 = SQLite3;
//# sourceMappingURL=sqlite3.js.map