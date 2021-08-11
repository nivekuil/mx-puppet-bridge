"use strict";
/*
Copyright 2018, 2019 matrix-appservice-discord

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
const pgPromise = require("pg-promise");
const log_1 = require("../log");
const prometheus = require("prom-client");
const log = new log_1.Log("Postgres");
const pgp = pgPromise({
// Initialization Options
});
class Postgres {
    constructor(connectionString) {
        this.connectionString = connectionString;
        this.type = "postgres";
        this.latency = new prometheus.Histogram({
            name: "bridge_database_query_seconds",
            help: "Time spent querying the database engine",
            labelNames: ["protocol", "engine", "type", "table"],
            // tslint:disable-next-line no-magic-numbers
            buckets: [0.002, 0.005, 0.0075, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
        });
    }
    static ParameterizeSql(sql) {
        return sql.replace(/\$((\w|\d|_)+)+/g, (k) => {
            return `\${${k.substr("$".length)}}`;
        });
    }
    Open() {
        // Hide username:password
        const logConnString = this.connectionString.substr(this.connectionString.indexOf("@") || 0);
        log.info(`Opening ${logConnString}`);
        this.db = pgp(this.connectionString);
    }
    Get(sql, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            log.silly("Get:", sql);
            return this.db.oneOrNone(Postgres.ParameterizeSql(sql), parameters);
        });
    }
    All(sql, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            log.silly("All:", sql);
            try {
                return yield this.db.many(Postgres.ParameterizeSql(sql), parameters);
            }
            catch (ex) {
                if (ex.code === pgPromise.errors.queryResultErrorCode.noData) {
                    return [];
                }
                throw ex;
            }
        });
    }
    Run(sql, parameters, returnId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (returnId) {
                sql += ` RETURNING ${returnId}`;
            }
            log.silly("Run:", sql);
            return this.db.oneOrNone(Postgres.ParameterizeSql(sql), parameters).then((row) => {
                if (!row || !returnId) {
                    return -1;
                }
                return Number(row[returnId]);
            });
        });
    }
    Close() {
        return __awaiter(this, void 0, void 0, function* () {
            // Postgres doesn't support disconnecting.
        });
    }
    Exec(sql) {
        return __awaiter(this, void 0, void 0, function* () {
            log.silly("Exec:", sql);
            yield this.db.none(sql);
            return;
        });
    }
}
exports.Postgres = Postgres;
//# sourceMappingURL=postgres.js.map