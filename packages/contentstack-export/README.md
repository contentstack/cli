@contentstack/cli-cm-export
===================

Use contentstack-export package to export the content from a stack

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/contentstack-export.svg)](https://npmjs.org/package/contentstack-export)
[![Downloads/week](https://img.shields.io/npm/dw/contentstack-export.svg)](https://npmjs.org/package/contentstack-export)
[![License](https://img.shields.io/npm/l/contentstack-export.svg)](https://github.com/contentstack/cli/blob/master/package.json)

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
@contentstack/cli-cm-export/0.0.27 darwin-x64 node-v10.19.0
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

Export utils for exporting the content from stack

```
USAGE
  $ csdx cm:export

OPTIONS
  -A, --auth-token                                     to use auth token
  -a, --management-token-alias=management-token-alias  alias of the management token
  -c, --config=config                                  [optional]path of the config
  -d, --data=data                                      path or location to store the data
  -l, --master-lang=master-lang                        code of the source stacks master Language
  -m, --module=module                                  [optional] specific module name
  -s, --stack-uid=stack-uid                            API key of source stack

DESCRIPTION
  ...
  Export content from one stack to another

EXAMPLES
  csdx cm:export -A
  csdx cm:export -A -l 'master-language' -s 'stack_ApiKey' -d 'path/of/export/destination/dir'
  csdx cm:export -A -c 'path/of/config/dir'
  csdx cm:export -a 'alias of managment_token'
  csdx cm:export -a "alias of managment_token"  -l "master-language" -d "path/of/export/destination/dir"
  csdx cm:export -a "alias of managment_token" -c "path/of/config/file"
  csdx cm:export -A -m "single module name"
```

_See code: [src/commands/cm/export.js](https://github.com/contentstack/cli/blob/v0.0.27/src/commands/cm/export.js)_
<!-- commandsstop -->
