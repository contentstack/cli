"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cli_utilities_1 = require("@contentstack/cli-utilities");
const base_command_1 = require("./base-command");
const cloud_function_1 = tslib_1.__importDefault(require("../../util/cloud-function"));
class Functions extends base_command_1.BaseCommand {
    async run() {
        var _a;
        this.sharedConfig.config =
            this.flags['data-dir'] || this.flags.config
                ? ((_a = this.flags.config) === null || _a === void 0 ? void 0 : _a.split(`${this.sharedConfig.configName}`)[0]) || this.flags['data-dir']
                : process.cwd();
        await new cloud_function_1.default(this.sharedConfig.config).serveCloudFunctions(+this.flags.port);
    }
}
exports.default = Functions;
Functions.hidden = false;
Functions.description = 'Serve cloud functions';
Functions.examples = [
    '$ csdx launch:functions',
    '$ csdx launch:functions --port=port',
    '$ csdx launch:logs --data-dir <path/of/current/working/dir>',
    '$ csdx launch:logs --config <path/to/launch/config/file>',
    '$ csdx launch:logs --data-dir <path/of/current/working/dir> -p "port number"',
    '$ csdx launch:logs --config <path/to/launch/config/file> --port=port',
];
Functions.flags = {
    port: cli_utilities_1.Flags.string({
        char: 'p',
        default: '3000',
        description: 'Port number',
    }),
};
