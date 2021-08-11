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
const fileType = require("file-type");
const buffer_1 = require("buffer");
const hasha = require("hasha");
const log_1 = require("./log");
const stringformatter_1 = require("./structures/stringformatter");
const child_process_1 = require("child_process");
const got_1 = require("got");
const log = new log_1.Log("Util");
const HTTP_OK = 200;
class Util {
    static DownloadFile(url, options = { responseType: "buffer" }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options.method) {
                options.method = "GET";
            }
            options.url = url;
            return yield got_1.default(options).buffer();
        });
    }
    static GetMimeType(buffer) {
        const typeResult = fileType(buffer);
        if (!typeResult) {
            return undefined;
        }
        return typeResult.mime;
    }
    static str2mxid(a) {
        // tslint:disable:no-magic-numbers
        const buf = buffer_1.Buffer.from(a);
        let encoded = "";
        for (const b of buf) {
            if (b === 0x5F) {
                // underscore
                encoded += "__";
            }
            else if ((b >= 0x61 && b <= 0x7A) || (b >= 0x30 && b <= 0x39)) {
                // [a-z0-9]
                encoded += String.fromCharCode(b);
            }
            else if (b >= 0x41 && b <= 0x5A) {
                encoded += "_" + String.fromCharCode(b + 0x20);
            }
            else if (b < 16) {
                encoded += "=0" + b.toString(16);
            }
            else {
                encoded += "=" + b.toString(16);
            }
        }
        return encoded;
        // tslint:enable:no-magic-numbers
    }
    static mxid2str(b) {
        // tslint:disable:no-magic-numbers
        const decoded = buffer_1.Buffer.alloc(b.length);
        let j = 0;
        for (let i = 0; i < b.length; i++) {
            const char = b[i];
            if (char === "_") {
                i++;
                if (b[i] === "_") {
                    decoded[j] = 0x5F;
                }
                else {
                    decoded[j] = b[i].charCodeAt(0) - 0x20;
                }
            }
            else if (char === "=") {
                i++;
                decoded[j] = parseInt(b[i] + b[i + 1], 16);
                i++;
            }
            else {
                decoded[j] = b[i].charCodeAt(0);
            }
            j++;
        }
        return decoded.toString("utf8", 0, j);
        // tslint:enable:no-magic-numbers
    }
    static sleep(timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                setTimeout(resolve, timeout);
            });
        });
    }
    static AsyncForEach(arr, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < arr.length; i++) {
                yield callback(arr[i], i, arr);
            }
        });
    }
    static HashBuffer(b) {
        return hasha(b, {
            algorithm: "sha512",
        });
    }
    static MaybeUploadFile(uploadFn, data, oldHash) {
        return __awaiter(this, void 0, void 0, function* () {
            let buffer = data.avatarBuffer;
            if ((!buffer && !data.avatarUrl) || (buffer && buffer.byteLength === 0)) {
                // we need to remove the avatar, short-circuit out of here
                return {
                    doUpdate: true,
                    mxcUrl: undefined,
                    hash: "",
                };
            }
            try {
                log.silly(data.avatarUrl);
                if (!buffer) {
                    log.silly("fetching avatar...");
                    if (data.downloadFile) {
                        buffer = yield data.downloadFile(data.avatarUrl);
                    }
                    else {
                        buffer = yield Util.DownloadFile(data.avatarUrl);
                    }
                    log.silly("avatar fetched!");
                }
                const hash = Util.HashBuffer(buffer);
                if (hash === oldHash) {
                    // image didn't change, short-circuit out of here
                    return {
                        doUpdate: false,
                        mxcUrl: undefined,
                        hash,
                    };
                }
                let filename = "remote_avatar";
                if (data.avatarUrl) {
                    const matches = data.avatarUrl.match(/\/([^\.\/]+\.[a-zA-Z0-9]+)(?:$|\?)/);
                    if (matches) {
                        filename = matches[1];
                    }
                }
                const avatarMxc = yield uploadFn(buffer, Util.GetMimeType(buffer), filename);
                return {
                    doUpdate: true,
                    mxcUrl: avatarMxc,
                    hash,
                };
            }
            catch (err) {
                log.error("Error uploading file content:", err);
                return {
                    doUpdate: false,
                    mxcUrl: undefined,
                    hash: "",
                };
            }
        });
    }
    static ProcessProfileUpdate(oldProfile, newProfile, namePattern, uploadFn) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info("Processing profile update...");
            log.verbose(oldProfile, "-->", newProfile);
            // first we apply the name patterns, if applicable
            if (newProfile.name != null && newProfile.name !== undefined) {
                if (!newProfile.nameVars) {
                    newProfile.nameVars = {};
                }
                newProfile.nameVars.name = newProfile.name;
            }
            let checkName;
            if (newProfile.nameVars) {
                checkName = stringformatter_1.StringFormatter.format(namePattern, newProfile.nameVars);
            }
            else {
                checkName = newProfile.name;
            }
            const result = {};
            if (oldProfile === null) {
                log.verbose("No old profile exists, creating a new one");
                if (checkName) {
                    result.name = checkName;
                }
                if (newProfile.avatarUrl || newProfile.avatarBuffer) {
                    log.verbose("Uploading avatar...");
                    const { doUpdate: doUpdateAvatar, mxcUrl, hash } = yield Util.MaybeUploadFile(uploadFn, newProfile);
                    if (doUpdateAvatar) {
                        result.avatarHash = hash;
                        result.avatarMxc = mxcUrl;
                        result.avatarUrl = newProfile.avatarUrl;
                    }
                }
                return result;
            }
            log.verbose("Old profile exists, looking at diff...");
            if (checkName !== undefined && checkName !== null && checkName !== oldProfile.name) {
                result.name = checkName;
            }
            if ((newProfile.avatarUrl !== undefined && newProfile.avatarUrl !== null
                && newProfile.avatarUrl !== oldProfile.avatarUrl) || newProfile.avatarBuffer) {
                log.verbose("Uploading avatar...");
                const { doUpdate: doUpdateAvatar, mxcUrl, hash } = yield Util.MaybeUploadFile(uploadFn, newProfile, oldProfile.avatarHash);
                if (doUpdateAvatar) {
                    result.avatarHash = hash;
                    result.avatarMxc = mxcUrl;
                    result.avatarUrl = newProfile.avatarUrl;
                }
            }
            return result;
        });
    }
    // tslint:disable-next-line no-any
    static ffprobe(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            // tslint:disable-next-line no-any
            return new Promise((resolve, reject) => {
                const cmd = child_process_1.spawn("ffprobe", ["-i", "-", "-v", "error", "-print_format", "json", "-show_format", "-show_streams"]);
                const TIMEOUT = 5000;
                const timeout = setTimeout(() => {
                    cmd.kill();
                }, TIMEOUT);
                let databuf = "";
                cmd.stdout.on("data", (data) => {
                    databuf += data;
                });
                cmd.stdout.on("error", (error) => { }); // disregard
                cmd.on("error", (error) => {
                    cmd.kill();
                    clearTimeout(timeout);
                    reject(error);
                });
                cmd.on("close", (code) => {
                    clearTimeout(timeout);
                    try {
                        resolve(JSON.parse(databuf));
                    }
                    catch (err) {
                        reject(err);
                    }
                });
                cmd.stdin.on("error", (error) => { }); // disregard
                cmd.stdin.end(buffer);
            });
        });
    }
    static getExifOrientation(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const cmd = child_process_1.spawn("identify", ["-format", "'%[EXIF:Orientation]'", "-"]);
                const TIMEOUT = 5000;
                const timeout = setTimeout(() => {
                    cmd.kill();
                }, TIMEOUT);
                let databuf = "";
                cmd.stdout.on("data", (data) => {
                    databuf += data;
                });
                cmd.stdout.on("error", (error) => { }); // disregard
                cmd.on("error", (error) => {
                    cmd.kill();
                    clearTimeout(timeout);
                    reject(error);
                });
                cmd.on("close", (code) => {
                    clearTimeout(timeout);
                    try {
                        resolve(Number(databuf.replace(/.*(\d+).*/, "$1")));
                    }
                    catch (err) {
                        reject(err);
                    }
                });
                cmd.stdin.on("error", (error) => { }); // disregard
                cmd.stdin.end(buffer);
            });
        });
    }
}
exports.Util = Util;
//# sourceMappingURL=util.js.map