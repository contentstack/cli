@contentstack/cli-cm-export
===================

It is Contentstack’s CLI plugin to export content from the stack. To learn how to export and import content in Contentstack, refer to the [Migration guide](https://www.contentstack.com/docs/developers/cli/migration/). 

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-export
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-cm-export/0.1.1-beta.3 darwin-x64 node-v13.14.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`csdx cm:export`](#csdx-cmexport)

## `csdx cm:export`

Export content from a stack

```
USAGE
  $ csdx cm:export

OPTIONS
  -A, --auth-token                                     to use auth token
  -a, --management-token-alias=management-token-alias  alias of the management token
  -c, --config=config                                  [optional] path of the config
  -d, --data=data                                      path or location to store the data
  -m, --module=module                                  [optional] specific module name
  -s, --stack-uid=stack-uid                            API key of the source stack

DESCRIPTION
  ...
  Export content from one stack to another

EXAMPLES
  csdx cm:export -A
  csdx cm:export -A -s <stack_ApiKey> -d <path/of/export/destination/dir>
  csdx cm:export -A -c <path/to/config/dir>
  csdx cm:export -a <management_token_alias>
  csdx cm:export -a <management_token_alias> -d <path/to/export/destination/dir>
  csdx cm:export -a <management_token_alias> -c <path/to/config/file>
  csdx cm:export -A -m <single module name>
```

_See code: [src/commands/cm/export.js](https://github.com/contentstack/cli/blob/v0.1.1-beta.3/packages/contentstack-export/src/commands/cm/export.js)_
<!-- commandsstop -->
