"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contentfly = void 0;
const path_1 = require("path");
const cloud_functions_1 = require("./cloud-functions");
class Contentfly {
    constructor(dirPath) {
        this.pathToSourceCode = (0, path_1.isAbsolute)(dirPath)
            ? dirPath
            : (0, path_1.normalize)((0, path_1.join)(process.cwd(), dirPath)).replace(/^(\.\.(\/|\\|$))+/, "");
        this.cloudFunctions = new cloud_functions_1.CloudFunctions(this.pathToSourceCode);
    }
    async serveCloudFunctions(servingPort) {
        await this.cloudFunctions.serve(servingPort);
    }
}
exports.Contentfly = Contentfly;
