"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileList = exports.getDirectories = void 0;
const fs_1 = require("fs");
function getDirectories(source) {
    if (!(0, fs_1.existsSync)(source))
        return [];
    return (0, fs_1.readdirSync)(source, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
}
exports.getDirectories = getDirectories;
async function getFileList(dirName, onlyName = true, rootFiles = false) {
    if (!(0, fs_1.existsSync)(dirName))
        return [];
    let files = [];
    const items = (0, fs_1.readdirSync)(dirName, { withFileTypes: true });
    for (const item of items) {
        if (item.isDirectory() && !rootFiles) {
            /* eslint-disable no-await-in-loop */
            files = [...files, ...(await getFileList(`${dirName}/${item.name}`))];
        }
        else {
            files.push(onlyName ? item.name : `${dirName}/${item.name}`);
        }
    }
    return files;
}
exports.getFileList = getFileList;
