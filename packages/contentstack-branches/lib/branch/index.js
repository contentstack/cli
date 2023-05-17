"use strict";
/**
 * Business logics can be written inside this directory
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchDiffHandler = exports.MergeHandler = void 0;
var merge_handler_1 = require("./merge-handler");
Object.defineProperty(exports, "MergeHandler", { enumerable: true, get: function () { return __importDefault(merge_handler_1).default; } });
var diff_handler_1 = require("./diff-handler");
Object.defineProperty(exports, "BranchDiffHandler", { enumerable: true, get: function () { return __importDefault(diff_handler_1).default; } });
