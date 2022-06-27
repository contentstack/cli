@contentstack/cli-cm-import

It is Contentstack’s CLI plugin to import content in the stack. To learn how to export and import content in Contentstack, refer to the [Migration guide](https://www.contentstack.com/docs/developers/cli/migration/).

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

For switching to EU region update the hosts at config/default.js

```js
{
  host:'https://eu-api.contentstack.com/v3',
  cdn: 'https://eu-cdn.contentstack.com/v3',
 ...
}
```

For switching to AZURE-NA region update the hosts at config/default.js

```js
{
  host:'https://azure-na-api.contentstack.com/v3',
  cdn: 'https://azure-na-cdn.contentstack.com/v3'
 ...
}
```

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-import
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-cm-import/1.0.0 darwin-x64 node-v16.15.1
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:stacks:import`](#csdx-cmstacksimport)

## `csdx cm:stacks:import`

Import script for importing the content into the new stack

```
USAGE
  $ csdx cm:stacks:import

OPTIONS
  -B, --branch=branch                                  [optional] branch name
  -a, --management-token-alias=management-token-alias  alias of the management token
  -b, --backup-dir=backup-dir                          [optional] backup directory name when using specific module
  -c, --config=config                                  [optional] path of config file
  -d, --data-dir=data-dir                              path and location where data is stored
  -k, --stack-api-key=stack-api-key                    API key of the target stack
  -m, --module=module                                  [optional] specific module name

DESCRIPTION
  ...
  Once you export content from the source stack, import it to your destination stack by using the cm:stacks:import 
  command.

ALIASES
  $ csdx cm:import

EXAMPLES
  csdx cm:stacks:import --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>
  csdx cm:stacks:import --config <path/of/config/dir>
  csdx cm:stacks:import --module <single module name>
  csdx cm:stacks:import --module <single module name> --backup-dir <backup dir>
  csdx cm:stacks:import --management-token-alias <management_token_alias>
  csdx cm:stacks:import --management-token-alias <management_token_alias> --data-dir <path/of/export/destination/dir>
  csdx cm:stacks:import --management-token-alias <management_token_alias> --config <path/of/config/file>
  csdx cm:stacks:import --branch <branch name>
```

_See code: [src/commands/cm/stacks/import.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-import/src/commands/cm/stacks/import.js)_
<!-- commandsstop -->
