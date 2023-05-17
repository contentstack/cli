"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMergeScripts = exports.getContentypeMergeStatus = exports.generateMergeScripts = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const entry_create_script_1 = require("./entry-create-script");
const entry_update_script_1 = require("./entry-update-script");
function generateMergeScripts(mergeSummary, mergeJobUID) {
    var _a, _b, _c;
    try {
        let scriptFolderPath;
        if (mergeSummary.content_types.modified && ((_a = mergeSummary.content_types.modified) === null || _a === void 0 ? void 0 : _a.length) !== 0) {
            mergeSummary.content_types.modified.map((contentType) => {
                let data = (0, entry_update_script_1.entryUpdateScript)(contentType.uid);
                scriptFolderPath = createMergeScripts(contentType, data, mergeJobUID);
            });
        }
        if (mergeSummary.content_types.added && ((_b = mergeSummary.content_types.added) === null || _b === void 0 ? void 0 : _b.length) !== 0) {
            (_c = mergeSummary.content_types.added) === null || _c === void 0 ? void 0 : _c.map((contentType) => {
                let data = (0, entry_create_script_1.entryCreateScript)(contentType.uid);
                scriptFolderPath = createMergeScripts(contentType, data, mergeJobUID);
            });
        }
        return scriptFolderPath;
    }
    catch (error) {
        console.log(error);
    }
}
exports.generateMergeScripts = generateMergeScripts;
function getContentypeMergeStatus(status) {
    if (status === 'modified') {
        return 'updated';
    }
    else if (status === 'compare_only') {
        return 'created';
    }
    else {
        return '';
    }
}
exports.getContentypeMergeStatus = getContentypeMergeStatus;
function createMergeScripts(contentType, content, mergeJobUID) {
    const date = new Date();
    const rootFolder = 'merge_scripts';
    const fileCreatedAt = `${date.getFullYear()}${date.getMonth().toString.length === 1 ? `0${date.getMonth() + 1}` : date.getMonth() + 1}${date.getUTCDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
    const mergeScriptsSlug = `merge_scripts_${mergeJobUID}_${fileCreatedAt}`;
    const fullPath = `${rootFolder}/${mergeScriptsSlug}`;
    const { W_OK: writePermission } = fs_1.default.constants;
    const checkPermissions = fs_1.default.accessSync('./', writePermission);
    try {
        if (checkPermissions === undefined) {
            if (!fs_1.default.existsSync(rootFolder)) {
                fs_1.default.mkdirSync(rootFolder);
            }
            if (!fs_1.default.existsSync(fullPath)) {
                fs_1.default.mkdirSync(fullPath);
            }
            fs_1.default.writeFileSync(`${fullPath}/${fileCreatedAt}_${getContentypeMergeStatus(contentType.status)}_${contentType.uid}.js`, content, 'utf-8');
        }
        return fullPath;
    }
    catch (error) {
        console.log(error);
    }
}
exports.createMergeScripts = createMergeScripts;
