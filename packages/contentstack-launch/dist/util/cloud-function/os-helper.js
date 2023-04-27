"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIfDirectoryExists = exports.walkFileSystem = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = require("path");
async function* walkFileSystem(directory) {
    const fileSystemIterator = await fs_1.default.promises.opendir(directory);
    for await (const fileSystemElement of fileSystemIterator) {
        const filePath = (0, path_1.normalize)((0, path_1.join)(directory, fileSystemElement.name)).replace(/^(\.\.(\/|\\|$))+/, "");
        if (fileSystemElement.isDirectory()) {
            yield* walkFileSystem(filePath);
        }
        else if (fileSystemElement.isFile()) {
            yield filePath;
        }
    }
}
exports.walkFileSystem = walkFileSystem;
function checkIfDirectoryExists(directoryPath) {
    return fs_1.default.existsSync(directoryPath);
}
exports.checkIfDirectoryExists = checkIfDirectoryExists;
