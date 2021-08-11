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
const sqlite3_1 = require("./db/sqlite3");
const postgres_1 = require("./db/postgres");
const log_1 = require("./log");
const userstore_1 = require("./db/userstore");
const roomstore_1 = require("./db/roomstore");
const groupstore_1 = require("./db/groupstore");
const puppetstore_1 = require("./db/puppetstore");
const eventstore_1 = require("./db/eventstore");
const reactionstore_1 = require("./db/reactionstore");
const emotestore_1 = require("./db/emotestore");
const util_1 = require("./util");
const log = new log_1.Log("Store");
exports.CURRENT_SCHEMA = 16;
class Store {
    constructor(config, bridge) {
        this.config = config;
        this.bridge = bridge;
    }
    get roomStore() {
        return this.pRoomStore;
    }
    get userStore() {
        return this.pUserStore;
    }
    get groupStore() {
        return this.pGroupStore;
    }
    get puppetStore() {
        return this.pPuppetStore;
    }
    get eventStore() {
        return this.pEventStore;
    }
    get reactionStore() {
        return this.pReactionStore;
    }
    get emoteStore() {
        return this.pEmoteStore;
    }
    init(overrideSchema = 0, table = "schema", getSchemaClass, openDatabase = true) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info("Starting DB Init");
            if (openDatabase) {
                yield this.openDatabase();
            }
            let version = yield this.getSchemaVersion(table);
            const targetSchema = overrideSchema || exports.CURRENT_SCHEMA;
            log.info(`Database schema version is ${version}, latest version is ${targetSchema}`);
            while (version < targetSchema) {
                version++;
                let schemaClass;
                if (getSchemaClass) {
                    schemaClass = getSchemaClass(version);
                }
                else {
                    schemaClass = require(`./db/schema/v${version}.js`).Schema;
                }
                const schema = new schemaClass();
                log.info(`Updating database to v${version}, "${schema.description}"`);
                try {
                    yield schema.run(this);
                    log.info("Updated database to version ", version);
                }
                catch (ex) {
                    log.error("Couldn't update database to schema ", version);
                    log.error(ex);
                    log.error("Schema migration failed! Please visit #mx-puppet-bridge:sorunome.de and ask for help!");
                    log.info("Rolling back to version ", version - 1);
                    try {
                        yield schema.rollBack(this);
                    }
                    catch (ex) {
                        log.error(ex);
                        throw Error("Failure to update to latest schema. And failed to rollback.");
                    }
                    throw Error("Failure to update to latest schema.");
                }
                yield this.setSchemaVersion(version, table);
            }
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.Close();
        });
    }
    getFileMxc(thing) {
        return __awaiter(this, void 0, void 0, function* () {
            let key = "";
            if (typeof thing === "string") {
                key = thing;
            }
            else {
                key = util_1.Util.HashBuffer(thing);
            }
            // we just limit the fetching to 1 here
            // due to race conditions there might actually be multiple entries, they
            // should all resolve to a valid MXC uri of that image, though
            // thus, our de-duping is imperfect but it should be good enough
            const ret = yield this.db.Get("SELECT mxc_url FROM file_mxc_map WHERE thing = $key LIMIT 1", { key });
            if (!ret) {
                return null;
            }
            return ret.mxc_url;
        });
    }
    setFileMxc(thing, mxcUrl, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            let key = "";
            if (typeof thing === "string") {
                key = thing;
            }
            else {
                key = util_1.Util.HashBuffer(thing);
            }
            if ((yield this.getFileMxc(key))) {
                return; // nothing to do
            }
            if (!filename) {
                filename = "";
            }
            yield this.db.Run("INSERT INTO file_mxc_map (thing, mxc_url, filename) VALUES ($key, $mxcUrl, $filename)", { key, mxcUrl, filename });
        });
    }
    createTable(statement, tablename) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.db.type !== "postgres") {
                    statement = statement.replace(/SERIAL PRIMARY KEY/g, "INTEGER  PRIMARY KEY AUTOINCREMENT");
                }
                yield this.db.Exec(statement);
                log.info("Created table", tablename);
            }
            catch (err) {
                throw new Error(`Error creating '${tablename}': ${err}`);
            }
        });
    }
    getSchemaVersion(table = "schema") {
        return __awaiter(this, void 0, void 0, function* () {
            log.silly(`_get_${table}_version`);
            let version = 0;
            try {
                // insecurely adding the table as it is in-code
                const versionReply = yield this.db.Get(`SELECT version FROM ${table}`);
                version = Number(versionReply.version);
            }
            catch (er) {
                log.warn("Couldn't fetch schema version, defaulting to 0");
            }
            return version;
        });
    }
    setSchemaVersion(ver, table = "schema") {
        return __awaiter(this, void 0, void 0, function* () {
            log.silly(`_set_${table}_version => `, ver);
            // insecurely adding the table as it is in-code
            yield this.db.Run(`
			UPDATE ${table}
			SET version = $ver
			`, { ver });
        });
    }
    openDatabase() {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.config.connString) {
                log.info("connString present in config, using postgres");
                this.db = new postgres_1.Postgres(this.config.connString);
            }
            else if (this.config.filename) {
                log.info("Filename present in config, using sqlite");
                this.db = new sqlite3_1.SQLite3(this.config.filename);
            }
            try {
                this.db.Open();
                this.pRoomStore = new roomstore_1.DbRoomStore(this.db, undefined, (_a = this.bridge.protocol) === null || _a === void 0 ? void 0 : _a.id);
                this.pUserStore = new userstore_1.DbUserStore(this.db, undefined, (_b = this.bridge.protocol) === null || _b === void 0 ? void 0 : _b.id);
                this.pGroupStore = new groupstore_1.DbGroupStore(this.db, undefined, (_c = this.bridge.protocol) === null || _c === void 0 ? void 0 : _c.id);
                this.pPuppetStore = new puppetstore_1.DbPuppetStore(this.db, undefined, (_d = this.bridge.protocol) === null || _d === void 0 ? void 0 : _d.id);
                this.pEventStore = new eventstore_1.DbEventStore(this.db, (_e = this.bridge.protocol) === null || _e === void 0 ? void 0 : _e.id);
                this.pReactionStore = new reactionstore_1.DbReactionStore(this.db, (_f = this.bridge.protocol) === null || _f === void 0 ? void 0 : _f.id);
                this.pEmoteStore = new emotestore_1.DbEmoteStore(this.db, (_g = this.bridge.protocol) === null || _g === void 0 ? void 0 : _g.id);
            }
            catch (ex) {
                log.error("Error opening database:", ex);
                throw new Error("Couldn't open database. The appservice won't be able to continue.");
            }
        });
    }
}
exports.Store = Store;
//# sourceMappingURL=store.js.map