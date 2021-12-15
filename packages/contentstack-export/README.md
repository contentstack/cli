@contentstack/cli-auth
===

It is Contentstack’s CLI plugin to perform authentication-related activities. To get started with authenticating yourself with the CLI, refer to the [CLI’s Authentication documentation](https://www.contentstack.com/docs/developers/cli/authentication)

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
@contentstack/cli-cm-export/0.1.1-beta.1 linux-x64 node-v12.22.7
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
  -a, --mtoken-alias=mtoken-alias                  alias of the management token
  -b, --branch=branch                              [optional] branch name
  -c, --external-config-path=external-config-path  [optional] path of the config
  -d, --export-dir=export-dir                      path or location to store the data
  -k, --api-key=api-key                            API key of the source stack
  -m, --module=module                              [optional] specific module name
  -t, --content-type=content-type                  [optional] content type

EXAMPLES
  csdx cm:export
  csdx cm:export -s <stack_ApiKey> -d <path/of/export/destination/dir>
  csdx cm:export -m <single module name>
  csdx cm:export -m <single module name> -s <stack_ApiKey> -d <path/of/export/destination/dir>
  csdx cm:export -m <single module name> -t <content type>
  csdx cm:export -B [optional] branch name
  csdx cm:export -c <path/to/config/dir>
  csdx cm:export -a <management_token_alias>
  csdx cm:export -a <management_token_alias> -d <path/to/export/destination/dir>
  csdx cm:export -a <management_token_alias> -c <path/to/config/file>
```

_See code: [src/commands/cm/export.ts](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/src/commands/cm/export.ts)_
<!-- commandsstop -->
