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
$ npm install -g @contentstack/cli-cm-import
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-cm-import/0.1.1-beta.1 linux-x64 node-v12.22.1
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`csdx cm:import`](#csdx-cmimport)

## `csdx cm:import`

Import content from a stack

```
USAGE
  $ csdx cm:import

OPTIONS
  -A, --auth-token                       to use auth token
  -a, --mtoken-alias=mtoken-alias        alias of the management token
  -b, --branch=branch                    [optional] branch name
  -c, --external-config=external-config  [optional] path of the config
  -d, --content-dir=content-dir          path or location to store the data
  -k, --api-key=api-key                  API key of the source stack
  -m, --module=module                    [optional] specific module name
  -t, --content-type=content-type        [optional] content type
  --backup-dir=backup-dir                [optional] backup directory name when using specific module

EXAMPLES
  csdx cm:import -A
  csdx cm:import -A -s <stack_ApiKey> -d <path/of/content/dir>
  csdx cm:import -A -c <path/of/config/dir>
  csdx cm:import -A -m <single module name>
  csdx cm:import -A -m <single module name> -b <backup dir>
  csdx cm:import -a <management_token_alias>
  csdx cm:import -a <management_token_alias> -d <path/of/content/destination/dir>
  csdx cm:import -a <management_token_alias> -c <path/of/config/file>
  csdx cm:import -A -m <single module name>
  csdx cm:import -A -B <branch name>
```

_See code: [src/commands/cm/import.ts](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/src/commands/cm/import.ts)_
<!-- commandsstop -->
