"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRemoteUrls = exports.pluckRemoteUrls = exports.parseGitConfig = void 0;
const tslib_1 = require("tslib");
const ini = tslib_1.__importStar(require("ini"));
const fs_1 = require("fs");
async function parseGitConfig(configPath) {
    try {
        return ini.parse((0, fs_1.readFileSync)(configPath, "utf-8"));
    }
    catch (err) {
        // console.log(err)
    }
}
exports.parseGitConfig = parseGitConfig;
function pluckRemoteUrls(gitConfig) {
    var _a, _b;
    let remoteUrls = {};
    for (const key of Object.keys(gitConfig)) {
        if (key.includes("remote")) {
            // ex. remote "origin" — matches origin
            const remoteName = (_a = key.match(/(?<=").*(?=")/g)) === null || _a === void 0 ? void 0 : _a[0];
            const remoteUrl = (_b = gitConfig[key]) === null || _b === void 0 ? void 0 : _b.url;
            if (remoteName && remoteUrl) {
                remoteUrls[remoteName] = remoteUrl;
            }
        }
    }
    if (Object.keys(remoteUrls).length === 0) {
        return;
    }
    return remoteUrls;
}
exports.pluckRemoteUrls = pluckRemoteUrls;
async function getRemoteUrls(configPath) {
    const config = await parseGitConfig(configPath);
    if (!config) {
        return;
    }
    const remoteUrls = pluckRemoteUrls(config);
    return remoteUrls;
}
exports.getRemoteUrls = getRemoteUrls;
