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
const chai_1 = require("chai");
const util_1 = require("../src/util");
// we are a test file and thus our linting rules are slightly different
// tslint:disable:no-unused-expression max-file-line-count no-any no-magic-numbers no-string-literal
const FOXIES_HASH = "b3baab3d435960130d7428eeaa8e0cd73b34a8db48e67d551d8c8a3e0aaf06a4dbf0229db093c3" +
    "b410beeb5d098e5667abfeb6e8fbe62b5b3bbb87d7f9d45c2f";
describe("Util", () => {
    describe("str2mxid", () => {
        it("should keep lowercase as-is", () => {
            const ret = util_1.Util.str2mxid("foxies");
            chai_1.expect(ret).to.equal("foxies");
        });
        it("should escape uppercase / underscore", () => {
            const ret = util_1.Util.str2mxid("Foxies_are_cool");
            chai_1.expect(ret).to.equal("_foxies__are__cool");
        });
        it("should escape other characters", () => {
            const ret = util_1.Util.str2mxid("Füchschen");
            chai_1.expect(ret).to.equal("_f=c3=bcchschen");
        });
        it("should escape single-digit hex codes", () => {
            const ret = util_1.Util.str2mxid("\x01foxies");
            chai_1.expect(ret).to.equal("=01foxies");
        });
    });
    describe("mxid2str", () => {
        it("should keep lowercase as-is", () => {
            const ret = util_1.Util.mxid2str("foxies");
            chai_1.expect(ret).to.equal("foxies");
        });
        it("should unescape things with underscores", () => {
            const ret = util_1.Util.mxid2str("_foxies__are__cool");
            chai_1.expect(ret).to.equal("Foxies_are_cool");
        });
        it("should unescape other characters", () => {
            const ret = util_1.Util.mxid2str("_f=c3=bcchschen");
            chai_1.expect(ret).to.equal("Füchschen");
        });
        it("should unescape single-digit hex codes", () => {
            const ret = util_1.Util.mxid2str("=01foxies");
            chai_1.expect(ret).to.equal("\x01foxies");
        });
    });
    describe("HashBuffer", () => {
        it("should hash", () => {
            const ret = util_1.Util.HashBuffer(Buffer.from("foxies"));
            chai_1.expect(ret).to.equal(FOXIES_HASH);
        });
    });
    describe("MaybeUploadFile", () => {
        it("should short-circuit to remove, if no buffer and no url is set", () => __awaiter(void 0, void 0, void 0, function* () {
            let fileUploaded = false;
            const uploadFn = (b, m, f) => __awaiter(void 0, void 0, void 0, function* () {
                fileUploaded = true;
                return "mxc://newfile/example.org";
            });
            const data = {};
            const oldHash = FOXIES_HASH;
            const ret = yield util_1.Util.MaybeUploadFile(uploadFn, data, oldHash);
            chai_1.expect(fileUploaded).to.be.false;
            chai_1.expect(ret).eql({
                doUpdate: true,
                mxcUrl: undefined,
                hash: "",
            });
        }));
        it("should short-circuit to remove, if the buffer is zero bytes long", () => __awaiter(void 0, void 0, void 0, function* () {
            let fileUploaded = false;
            const uploadFn = (b, m, f) => __awaiter(void 0, void 0, void 0, function* () {
                fileUploaded = true;
                return "mxc://newfile/example.org";
            });
            const data = {
                avatarBuffer: Buffer.from(""),
            };
            const oldHash = FOXIES_HASH;
            const ret = yield util_1.Util.MaybeUploadFile(uploadFn, data, oldHash);
            chai_1.expect(fileUploaded).to.be.false;
            chai_1.expect(ret).eql({
                doUpdate: true,
                mxcUrl: undefined,
                hash: "",
            });
        }));
        it("should not update, should the buffer hash be identitcal", () => __awaiter(void 0, void 0, void 0, function* () {
            let fileUploaded = false;
            const uploadFn = (b, m, f) => __awaiter(void 0, void 0, void 0, function* () {
                fileUploaded = true;
                return "mxc://newfile/example.org";
            });
            const data = {
                avatarBuffer: Buffer.from("foxies"),
            };
            const oldHash = FOXIES_HASH;
            const ret = yield util_1.Util.MaybeUploadFile(uploadFn, data, oldHash);
            chai_1.expect(fileUploaded).to.be.false;
            chai_1.expect(ret).eql({
                doUpdate: false,
                mxcUrl: undefined,
                hash: FOXIES_HASH,
            });
        }));
        it("should upload, if all is fine", () => __awaiter(void 0, void 0, void 0, function* () {
            let fileUploaded = false;
            let fileUploadedName = "";
            const uploadFn = (b, m, f) => __awaiter(void 0, void 0, void 0, function* () {
                fileUploaded = true;
                fileUploadedName = f;
                return "mxc://newfile/example.org";
            });
            const data = {
                avatarBuffer: Buffer.from("newfoxies"),
            };
            const oldHash = FOXIES_HASH;
            const ret = yield util_1.Util.MaybeUploadFile(uploadFn, data, oldHash);
            chai_1.expect(fileUploaded).to.be.true;
            chai_1.expect(fileUploadedName).to.equal("remote_avatar");
            chai_1.expect(ret).eql({
                doUpdate: true,
                mxcUrl: "mxc://newfile/example.org",
                hash: util_1.Util.HashBuffer(Buffer.from("newfoxies")),
            });
        }));
        it("should auto-download, is a URl provided", () => __awaiter(void 0, void 0, void 0, function* () {
            let fileUploaded = false;
            let fileUploadedName = "";
            const uploadFn = (b, m, f) => __awaiter(void 0, void 0, void 0, function* () {
                fileUploaded = true;
                fileUploadedName = f;
                return "mxc://newfile/example.org";
            });
            const data = {
                avatarUrl: "newfoxies",
            };
            const oldHash = FOXIES_HASH;
            const oldDownloadFile = util_1.Util.DownloadFile;
            util_1.Util.DownloadFile = (f) => __awaiter(void 0, void 0, void 0, function* () { return Buffer.from(f); });
            const ret = yield util_1.Util.MaybeUploadFile(uploadFn, data, oldHash);
            util_1.Util.DownloadFile = oldDownloadFile;
            chai_1.expect(fileUploaded).to.be.true;
            chai_1.expect(fileUploadedName).to.equal("remote_avatar");
            chai_1.expect(ret).eql({
                doUpdate: true,
                mxcUrl: "mxc://newfile/example.org",
                hash: util_1.Util.HashBuffer(Buffer.from("newfoxies")),
            });
        }));
        it("should set the filename from URL, if possible", () => __awaiter(void 0, void 0, void 0, function* () {
            let fileUploaded = false;
            let fileUploadedName = "";
            const uploadFn = (b, m, f) => __awaiter(void 0, void 0, void 0, function* () {
                fileUploaded = true;
                fileUploadedName = f;
                return "mxc://newfile/example.org";
            });
            const data = {
                avatarUrl: "http://example.org/fox.png?size=50",
            };
            const oldHash = FOXIES_HASH;
            const oldDownloadFile = util_1.Util.DownloadFile;
            util_1.Util.DownloadFile = (f) => __awaiter(void 0, void 0, void 0, function* () { return Buffer.from(f); });
            const ret = yield util_1.Util.MaybeUploadFile(uploadFn, data, oldHash);
            util_1.Util.DownloadFile = oldDownloadFile;
            chai_1.expect(fileUploaded).to.be.true;
            chai_1.expect(fileUploadedName).to.equal("fox.png");
            chai_1.expect(ret).eql({
                doUpdate: true,
                mxcUrl: "mxc://newfile/example.org",
                hash: util_1.Util.HashBuffer(Buffer.from("http://example.org/fox.png?size=50")),
            });
        }));
    });
    describe("ProcessProfileUpdate", () => {
        it("should handle new entries", () => __awaiter(void 0, void 0, void 0, function* () {
            const oldProfile = null;
            const newProfile = {
                name: "Fox",
                avatarUrl: "http://example.org/fox.png",
            };
            const namePattern = ":name";
            const uploadFn = (() => __awaiter(void 0, void 0, void 0, function* () { }));
            const oldMaybeUploadFile = util_1.Util.MaybeUploadFile;
            util_1.Util.MaybeUploadFile = (fn, data) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    doUpdate: true,
                    mxcUrl: "mxc://newfile/example.org",
                    hash: "blah",
                };
            });
            const res = yield util_1.Util.ProcessProfileUpdate(oldProfile, newProfile, namePattern, uploadFn);
            util_1.Util.MaybeUploadFile = oldMaybeUploadFile;
            chai_1.expect(res).eql({
                name: "Fox",
                avatarHash: "blah",
                avatarMxc: "mxc://newfile/example.org",
                avatarUrl: "http://example.org/fox.png",
            });
        }));
        it("should handle updates", () => __awaiter(void 0, void 0, void 0, function* () {
            const oldProfile = {
                name: "Oldfox",
                avatarUrl: "http://example.org/oldfox.png",
            };
            const newProfile = {
                name: "Fox",
                avatarUrl: "http://example.org/fox.png",
            };
            const namePattern = ":name";
            const uploadFn = (() => __awaiter(void 0, void 0, void 0, function* () { }));
            const oldMaybeUploadFile = util_1.Util.MaybeUploadFile;
            util_1.Util.MaybeUploadFile = (fn, data) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    doUpdate: true,
                    mxcUrl: "mxc://newfile/example.org",
                    hash: "blah",
                };
            });
            const res = yield util_1.Util.ProcessProfileUpdate(oldProfile, newProfile, namePattern, uploadFn);
            util_1.Util.MaybeUploadFile = oldMaybeUploadFile;
            chai_1.expect(res).eql({
                name: "Fox",
                avatarHash: "blah",
                avatarMxc: "mxc://newfile/example.org",
                avatarUrl: "http://example.org/fox.png",
            });
        }));
        it("shouldn't update the name, if it is identical", () => __awaiter(void 0, void 0, void 0, function* () {
            const oldProfile = {
                name: "Super Fox",
                avatarUrl: "http://example.org/oldfox.png",
            };
            const newProfile = {
                nameVars: {
                    type: "Super",
                    name: "Fox",
                },
                avatarUrl: "http://example.org/fox.png",
            };
            const namePattern = ":type :name";
            const uploadFn = (() => __awaiter(void 0, void 0, void 0, function* () { }));
            const oldMaybeUploadFile = util_1.Util.MaybeUploadFile;
            util_1.Util.MaybeUploadFile = (fn, data) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    doUpdate: true,
                    mxcUrl: "mxc://newfile/example.org",
                    hash: "blah",
                };
            });
            const res = yield util_1.Util.ProcessProfileUpdate(oldProfile, newProfile, namePattern, uploadFn);
            util_1.Util.MaybeUploadFile = oldMaybeUploadFile;
            chai_1.expect(res).eql({
                avatarHash: "blah",
                avatarMxc: "mxc://newfile/example.org",
                avatarUrl: "http://example.org/fox.png",
            });
        }));
        it("shouldn't update the avatar, if it is identical", () => __awaiter(void 0, void 0, void 0, function* () {
            const oldProfile = {
                name: "Super Fox",
                avatarUrl: "http://example.org/fox.png",
            };
            const newProfile = {
                nameVars: {
                    type: "Amazing",
                    name: "Fox",
                },
                avatarUrl: "http://example.org/fox.png",
            };
            const namePattern = ":type :name";
            const uploadFn = (() => __awaiter(void 0, void 0, void 0, function* () { }));
            const oldMaybeUploadFile = util_1.Util.MaybeUploadFile;
            util_1.Util.MaybeUploadFile = (fn, data) => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    doUpdate: true,
                    mxcUrl: "mxc://newfile/example.org",
                    hash: "blah",
                };
            });
            const res = yield util_1.Util.ProcessProfileUpdate(oldProfile, newProfile, namePattern, uploadFn);
            util_1.Util.MaybeUploadFile = oldMaybeUploadFile;
            chai_1.expect(res).eql({
                name: "Amazing Fox",
            });
        }));
    });
});
//# sourceMappingURL=test_util.js.map