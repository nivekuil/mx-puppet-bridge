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
const express_1 = require("express");
const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const NOT_IMPLEMENTED = 501;
class ProvisioningAPI {
    constructor(bridge) {
        this.bridge = bridge;
        this.apiRouterV1 = express_1.Router();
        this.apiSharedSecret = bridge.config.provisioning.sharedSecret;
        this.mainRouter = express_1.Router();
        this.mainRouter.use(this.checkProvisioningSharedSecret.bind(this));
        this.mainRouter.use("/v1", this.apiRouterV1);
        this.apiRouterV1.get("/status", this.status.bind(this));
        this.apiRouterV1.post("/link", this.link.bind(this));
        this.apiRouterV1.post("/:puppetId(\\d+)/unlink", this.unlink.bind(this));
        this.apiRouterV1.get("/:puppetId(\\d+)/users", this.listUsers.bind(this));
        this.apiRouterV1.get("/:puppetId(\\d+)/rooms", this.listRooms.bind(this));
    }
    registerProvisioningAPI() {
        this.bridge.AS.expressAppInstance.use(this.bridge.config.provisioning.apiPrefix, this.mainRouter);
    }
    get v1() {
        return this.apiRouterV1;
    }
    checkProvisioningSharedSecret(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.apiSharedSecret) {
                res.status(FORBIDDEN).json({
                    error: "The provisioning API is disabled",
                    errcode: "M_FORBIDDEN",
                });
            }
            else if (req.header("Authorization") !== `Bearer ${this.apiSharedSecret}`) {
                res.status(UNAUTHORIZED).json({
                    error: "Unknown or missing token",
                    errcode: "M_UNKNOWN_TOKEN",
                });
            }
            else if (!req.query.user_id) {
                res.status(BAD_REQUEST).json({
                    error: "Missing user_id query parameter",
                    errcode: "M_BAD_REQUEST",
                });
            }
            else if (typeof req.query.user_id !== "string") {
                res.status(BAD_REQUEST).json({
                    error: "user_id query parameter isn't a string?",
                    errcode: "M_BAD_REQUEST",
                });
            }
            else {
                req.userId = req.query.user_id;
                next();
            }
        });
    }
    status(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const puppets = yield this.bridge.provisioner.getForMxid(req.userId);
            if (this.bridge.hooks.getDesc) {
                for (const data of puppets) {
                    data.description = yield this.bridge.hooks.getDesc(data.puppetId, data.data);
                }
            }
            res.json({
                puppets,
                permissions: {
                    create: this.bridge.provisioner.canCreate(req.userId),
                    relay: this.bridge.provisioner.canRelay(req.userId),
                },
            });
        });
    }
    link(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const puppetId = yield this.bridge.provisioner.new(req.userId, req.body.data, req.body.remote_user_id);
            res.status(CREATED).json({ puppet_id: puppetId });
        });
    }
    getPuppetId(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const puppetId = Number(req.params.puppetId);
            const data = yield this.bridge.provisioner.get(puppetId);
            if (!data || data.puppetMxid !== req.userId) {
                res.status(FORBIDDEN).json({
                    error: "You must own the puppet ID",
                    errcode: "M_FORBIDDEN",
                });
                return null;
            }
            return puppetId;
        });
    }
    unlink(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const puppetId = yield this.getPuppetId(req, res);
            if (!puppetId) {
                return;
            }
            yield this.bridge.provisioner.delete(req.userId, puppetId);
            res.status(NO_CONTENT).send();
        });
    }
    listUsers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.bridge.hooks.listUsers) {
                res.status(NOT_IMPLEMENTED).json({
                    error: "listUsers hook not implemented",
                    errcode: "M_NOT_IMPLEMENTED",
                });
                return;
            }
            const puppetId = yield this.getPuppetId(req, res);
            if (!puppetId) {
                return;
            }
            res.status(OK).json(yield this.bridge.hooks.listUsers(puppetId));
        });
    }
    listRooms(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.bridge.hooks.listRooms) {
                res.status(NOT_IMPLEMENTED).json({
                    error: "listUsers hook not implemented",
                    errcode: "M_NOT_IMPLEMENTED",
                });
                return;
            }
            const puppetId = yield this.getPuppetId(req, res);
            if (!puppetId) {
                return;
            }
            res.status(OK).json(yield this.bridge.hooks.listRooms(puppetId));
        });
    }
}
exports.ProvisioningAPI = ProvisioningAPI;
//# sourceMappingURL=provisioningapi.js.map